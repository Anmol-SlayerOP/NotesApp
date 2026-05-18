# 📝 Notes App Backend API

A robust multi-user notes service backend built with Node.js, TypeScript, PostgreSQL, and Google Gemini AI. Supports JWT authentication, note sharing, pin/priority features, full-text search, and AI-powered importance analysis.

**Live API**: `https://notes-app-backend-26rd.onrender.com`
**API Docs**: `https://notes-app-backend-26rd.onrender.com/openapi.json`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (Render-hosted) |
| Auth | JWT (`jsonwebtoken`) + bcrypt (cost 12) |
| AI | Google Gemini API (model configurable via env) |
| Validation | Zod |
| Testing | Vitest + Supertest + fast-check |

---

## API Endpoints

### Auth (no token required)

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/register` | `{ email, password }` | `201` — `{ message, userId, email }` |
| `POST` | `/login` | `{ email, password }` | `200` — `{ access_token }` |

### Notes (Bearer token required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/notes` | Get all notes (owned + shared). Add `?sort=true` to sort by pinned → priority → modified date |
| `POST` | `/notes` | Create a note |
| `GET` | `/notes/:id` | Get a specific note |
| `PUT` | `/notes/:id` | Update a note (owner only) |
| `DELETE` | `/notes/:id` | Delete a note (owner only) |
| `POST` | `/notes/:id/share` | Share a note with another user by email |

### Search & AI (Bearer token required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/search?q=keyword` | Case-insensitive search across title and content |
| `GET` | `/important` | AI-ranked list of your most important notes (Google Gemini) |

### Meta (no token required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/about` | Service info and custom features |
| `GET` | `/health` | Health check for Render |
| `GET` | `/openapi.json` | Full OpenAPI 3.0 specification |

---

## Query Parameters

### `GET /notes`
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `page_size` | integer | `20` | Results per page (max 100) |
| `sort` | boolean | `false` | `true` = sort by pinned first, then priority desc, then modified_at desc |

### `GET /search`
| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search keyword (matches title or content, case-insensitive) |
| `page` | integer | No | Page number (default 1) |
| `page_size` | integer | No | Results per page (default 20, max 100) |

---

## Request & Response Examples

### Register
```bash
curl -X POST https://notes-app-backend-26rd.onrender.com/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Login
```bash
curl -X POST https://notes-app-backend-26rd.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
# Returns: { "access_token": "eyJ..." }
```

### Create Note (with pin + priority)
```bash
curl -X POST https://notes-app-backend-26rd.onrender.com/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Urgent task", "content": "Submit report by Friday", "priority": 5, "pinned": true}'
```

### Get Notes (sorted)
```bash
curl "https://notes-app-backend-26rd.onrender.com/notes?sort=true&page=1&page_size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Search Notes
```bash
curl "https://notes-app-backend-26rd.onrender.com/search?q=report&page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Share a Note
```bash
curl -X POST https://notes-app-backend-26rd.onrender.com/notes/NOTE_ID/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"share_with_email": "friend@example.com"}'
```

### AI Important Notes
```bash
curl https://notes-app-backend-26rd.onrender.com/important \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Note Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | Yes | — | Max 500 chars |
| `content` | string | Yes | — | Max 50,000 chars |
| `priority` | integer | No | `3` | 1 (low) to 5 (high) |
| `pinned` | boolean | No | `false` | Pinned notes appear first when `sort=true` |

---

## Custom Features

### 1. Pin Notes
Set `pinned: true` on create or update. When `GET /notes?sort=true`, pinned notes always appear before unpinned ones.

### 2. Priority Sorting
Notes have a `priority` field (1–5). When `GET /notes?sort=true`, notes are sorted: **pinned first → priority descending → most recently modified**.

Without `sort=true`, notes are returned in insertion order (most recently created first).

### 3. AI Important Notes (`GET /important`)
Sends all your notes to Google Gemini, which analyzes them for urgency, deadlines, priority level, and actionable content. Returns a ranked list with `importance_score` (0–10) and a human-readable `explanation` for each note.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWTs |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-1.5-flash-latest` | Gemini model name (swap without redeploying) |
| `PORT` | No | `3000` | HTTP port |
| `NODE_ENV` | No | `development` | Environment |
| `JWT_EXPIRATION` | No | `7d` | JWT expiry duration |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in ms (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window per IP |
| `DB_POOL_MIN` | No | `2` | Min DB pool connections |
| `DB_POOL_MAX` | No | `10` | Max DB pool connections |

---

## Local Development

```bash
# 1. Clone and enter the backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create .env (copy from .env.test and fill in real values)
cp .env.test .env

# 4. Run database migrations
npm run migrate

# 5. Start dev server with hot-reload
npm run dev
# Server starts at http://localhost:3000
```

---

## Running Tests

```bash
cd backend

# Property-based tests (no DB needed)
npx vitest run tests/property

# Integration tests (requires DATABASE_URL pointing to a real DB)
npm run test:integration

# All tests
npm test
```

---

## Deploying to Render

1. Push to GitHub
2. Render dashboard → **New** → **Web Service** → connect repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build && npm run migrate`
   - **Start Command**: `node dist/server.js`
   - **Health Check Path**: `/health`
4. Add environment variables (at minimum: `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`)
5. Add `GEMINI_MODEL` = `gemini-1.5-flash-latest`

---

## Project Structure

```
backend/
├── src/
│   ├── config/        env.ts — typed config from env vars
│   ├── db/            schema.sql, connection pool, migrate script
│   ├── middleware/    auth, validation (Zod), error handler
│   ├── openapi/       OpenAPI 3.0 spec served at /openapi.json
│   ├── repositories/  parameterized pg queries (user, note, share)
│   ├── routes/        Express route handlers
│   ├── services/      business logic (auth, notes, share, AI)
│   ├── types/         interfaces, DTOs, AppError, ErrorCode
│   ├── utils/         structured JSON logger (redacts secrets)
│   ├── app.ts         Express app + rate limiting + helmet + CORS
│   └── server.ts      entry point, graceful shutdown
├── tests/
│   ├── helpers/       test server, DB helpers, fixtures
│   ├── integration/   end-to-end API + DB constraint tests
│   └── property/      fast-check property-based tests
├── Dockerfile
├── render.yaml
└── vitest.config.ts
```

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { "field": "field-specific error" }
  }
}
```

| Status | When |
|---|---|
| `400` | Validation error, missing fields, invalid priority |
| `401` | Missing or invalid JWT token, wrong credentials |
| `403` | Trying to update/delete/share a note you don't own |
| `404` | Note or user not found |
| `409` | Email already registered |
| `429` | Rate limit exceeded |
| `503` | Gemini AI service unavailable |
