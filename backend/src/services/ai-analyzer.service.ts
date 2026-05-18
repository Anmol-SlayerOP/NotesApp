import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImportantNote, Note } from '../types';
import { AppError, ErrorCode } from '../types/errors';
import { noteRepository, NoteRepository } from '../repositories/note.repository';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface AIAnalyzerService {
  analyzeImportantNotes(userId: string): Promise<ImportantNote[]>;
}

/**
 * Shape we expect Gemini to return for each important note.
 */
interface GeminiNoteResult {
  noteId: string;
  importance_score: number;
  explanation: string;
}

export class AIAnalyzerServiceImpl implements AIAnalyzerService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly noteRepo: NoteRepository = noteRepository) {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }

  /**
   * Retrieves all notes for the user, sends them to Gemini for importance
   * analysis, and returns a ranked list with scores and explanations.
   *
   * Throws 503 if the Gemini API is unavailable or returns an unparseable response.
   */
  async analyzeImportantNotes(userId: string): Promise<ImportantNote[]> {
    // 1. Fetch all user notes
    const notes = await this.noteRepo.findAllByUserId(userId);

    if (notes.length === 0) {
      return [];
    }

    // 2. Build prompt
    const prompt = this.buildPrompt(notes);

    // 3. Call Gemini
    let rawResponse: string;
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      rawResponse = result.response.text();
    } catch (err) {
      logger.error('Gemini API call failed', {
        error: err instanceof Error ? err.message : String(err),
        user_id: userId,
      });
      throw AppError.serviceUnavailable(
        'AI analysis service is temporarily unavailable. Please try again later.',
        ErrorCode.AI_SERVICE_UNAVAILABLE,
      );
    }

    // 4. Parse response
    let geminiResults: GeminiNoteResult[];
    try {
      geminiResults = this.parseGeminiResponse(rawResponse);
    } catch (err) {
      logger.error('Failed to parse Gemini response', {
        error: err instanceof Error ? err.message : String(err),
        user_id: userId,
      });
      throw AppError.serviceUnavailable(
        'AI analysis service returned an unexpected response. Please try again later.',
        ErrorCode.AI_SERVICE_UNAVAILABLE,
      );
    }

    // 5. Map back to full note data and sort by importance_score descending
    const noteMap = new Map<string, Note>(notes.map((n) => [n.id, n]));

    const importantNotes: ImportantNote[] = geminiResults
      .filter((r) => noteMap.has(r.noteId))
      .map((r) => {
        const note = noteMap.get(r.noteId)!;
        return {
          noteId: note.id,
          title: note.title,
          content: note.content,
          importance_score: Math.min(10, Math.max(0, r.importance_score)),
          explanation: r.explanation,
        };
      })
      .sort((a, b) => b.importance_score - a.importance_score);

    return importantNotes;
  }

  /**
   * Builds the Gemini prompt from the user's notes.
   */
  private buildPrompt(notes: Note[]): string {
    const notesList = notes
      .map(
        (n, i) =>
          `Note ${i + 1}:
  ID: ${n.id}
  Title: ${n.title}
  Content: ${n.content}
  Priority: ${n.priority}/5
  Pinned: ${n.pinned}
  Last modified: ${new Date(n.modified_at).toISOString()}`,
      )
      .join('\n\n');

    return `You are an intelligent note assistant. Analyze the following notes and identify the most contextually important ones.

Consider these factors when ranking:
- Urgency and time-sensitivity of the content
- Priority level set by the user (1=low, 5=high)
- Whether the note is pinned (indicates user-marked importance)
- Recency of modification
- Actionable items, deadlines, or reminders in the content
- Overall significance and relevance of the information

Notes to analyze:
${notesList}

Return ONLY a valid JSON array (no markdown, no explanation outside the JSON) with this exact structure:
[
  {
    "noteId": "<exact note ID from above>",
    "importance_score": <number from 0 to 10>,
    "explanation": "<one or two sentences explaining why this note is important>"
  }
]

Include only notes with an importance_score of 5 or higher. Sort by importance_score descending.`;
  }

  /**
   * Parses the raw Gemini text response into structured results.
   * Strips markdown code fences if present.
   */
  private parseGeminiResponse(raw: string): GeminiNoteResult[] {
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error('Expected a JSON array from Gemini');
    }

    return parsed.map((item: unknown) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as Record<string, unknown>).noteId !== 'string' ||
        typeof (item as Record<string, unknown>).importance_score !== 'number' ||
        typeof (item as Record<string, unknown>).explanation !== 'string'
      ) {
        throw new Error('Invalid item shape in Gemini response');
      }
      const r = item as Record<string, unknown>;
      return {
        noteId: r.noteId as string,
        importance_score: r.importance_score as number,
        explanation: r.explanation as string,
      };
    });
  }
}

export const aiAnalyzerService = new AIAnalyzerServiceImpl();
