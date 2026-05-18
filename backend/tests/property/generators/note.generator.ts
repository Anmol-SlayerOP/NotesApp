import * as fc from 'fast-check';

/** Valid priority values (1–5) */
export const arbPriority = () => fc.integer({ min: 1, max: 5 });

/** Invalid priority values (outside 1–5) */
export const arbInvalidPriority = () =>
  fc.oneof(
    fc.integer({ max: 0 }),
    fc.integer({ min: 6 }),
    fc.constant(null),
    fc.constant('high'),
  );

/** Valid note title */
export const arbTitle = () =>
  fc.string({ minLength: 1, maxLength: 500 });

/** Valid note content */
export const arbContent = () =>
  fc.string({ minLength: 1, maxLength: 1000 }); // keep small for test speed

/** Full create-note payload */
export const arbCreateNote = () =>
  fc.record({
    title: arbTitle(),
    content: arbContent(),
    priority: arbPriority(),
    pinned: fc.boolean(),
  });

/** Partial update-note payload (at least one field) */
export const arbUpdateNote = () =>
  fc
    .record(
      {
        title: fc.option(arbTitle(), { nil: undefined }),
        content: fc.option(arbContent(), { nil: undefined }),
        priority: fc.option(arbPriority(), { nil: undefined }),
        pinned: fc.option(fc.boolean(), { nil: undefined }),
      },
      { requiredKeys: [] },
    )
    .filter(
      (d) =>
        d.title !== undefined ||
        d.content !== undefined ||
        d.priority !== undefined ||
        d.pinned !== undefined,
    );

/** A collection of notes with distinct titles */
export const arbNoteCollection = (minLength = 1, maxLength = 10) =>
  fc
    .array(arbCreateNote(), { minLength, maxLength })
    .filter((notes) => new Set(notes.map((n) => n.title)).size === notes.length);
