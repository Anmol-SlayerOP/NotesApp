# Notes App Backend API

A multi-user notes service with JWT authentication, note sharing, full-text search, pin/priority features, and AI-powered importance analysis via Google Gemini.

## Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Render-hosted)
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **AI**: Google Gemini API (`gemini-1.5-flash`)
- **Validation**: Zod
- **Testing**: Vitest + Supertest

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL running locally (or a Render PostgreSQL URL)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Run database migrations
npm run migrate

# 4. Start dev server (hot-reload)
npm run dev
```

The server starts on `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP port |
| `NODE_ENV` | No | `development` | Environment |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWTs |
| `JWT_EXPIRATION` | No | `7d` | JWT expiry duration |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `DB_POOL_MIN` | No | `2` | Min DB pool connections |
| `DB_POOL_MAX` | No | `10` | Max DB pool connections |

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login, get JWT |

### Notes
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notes` | Yes | Get all notes (owned + shared) |
| POST | `/notes` | Yes | Create note |
| GET | `/notes/:id` | Yes | Get note by ID |
| PUT | `/notes/:id` | Yes | Update note |
| DELETE | `/notes/:id` | Yes | Delete note |
| POST | `/notes/:id/share` | Yes | Share note with user |

### Features
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search?q=keyword` | Yes | Full-text search |
| GET | `/important` | Yes | AI-ranked important notes |

### Meta
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/about` | No | Service info |
| GET | `/health` | No | Health check |
| GET | `/openapi.json` | No | OpenAPI 3.0 spec |

### Query Parameters (GET /notes, GET /search)
- `page` — page number (default: 1)
- `page_size` — results per page (default: 20, max: 100)

---

## Custom Features

### 1. Pin Notes
Set `pinned: true` when creating or updating a note. Pinned notes always appear at the top of the list.

### 2. Priority Sorting
Notes have a `priority` field (1–5, default 3). The list is sorted: **pinned first → priority descending → modified_at descending**.

### 3. AI Important Notes (`GET /important`)
Calls Google Gemini to analyze all your notes and returns a ranked list of the most contextually important ones, each with an `importance_score` (0–10) and a human-readable `explanation`.

---

## Deploying to Render

### Option A — Using `render.yaml` (recommended)

1. Push this repo to GitHub.
2. In Render dashboard → **New** → **Blueprint** → connect your repo.
3. Render reads `render.yaml` and creates both the web service and PostgreSQL database automatically.
4. Set `GEMINI_API_KEY` manually in the Render dashboard (Environment → Add Environment Variable).

### Option B — Manual

1. Create a **PostgreSQL** database on Render. Copy the **Internal Database URL**.
2. Create a **Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci && npm run build && npm run migrate`
   - **Start Command**: `node dist/server.js`
   - **Health Check Path**: `/health`
3. Add all environment variables from the table above.

---

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only (requires DATABASE_URL)
npm run test:integration
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/        # Environment config
│   ├── db/            # Schema, connection pool, migration
│   ├── middleware/    # Auth, validation, error handler
│   ├── openapi/       # OpenAPI 3.0 spec
│   ├── repositories/  # Data access layer (pg queries)
│   ├── routes/        # Express route handlers
│   ├── services/      # Business logic
│   ├── types/         # TypeScript interfaces, DTOs, errors
│   ├── utils/         # Logger
│   ├── app.ts         # Express app setup
│   └── server.ts      # Entry point
├── tests/
│   ├── helpers/       # Test DB, server, fixtures
│   ├── integration/   # End-to-end API tests
│   ├── property/      # Property-based tests (fast-check)
│   └── unit/          # Unit tests
├── Dockerfile
├── render.yaml
└── .env.example
```
