# ANVIKSHA - Architecture

## System context

```text
Browser (React 19 + Vite)
        |
        | HTTPS / JSON + multipart
        v
FastAPI application (Uvicorn)
        |
        +-- JWT authentication and ownership checks
        +-- Pydantic request/response validation
        +-- Service layer
        +-- SQLAlchemy ORM
        |
        v
PostgreSQL 14+ (production target)
        |
        +-- Alembic migrations

Local upload root
        ^
        +-- validated JPEG/PNG/WebP files, server-generated names
```

The API is the primary deliverable. The frontend is a real client of that API,
not a mock or a substitute for the backend assignment.

## Backend layers

| Layer | Location | Responsibility |
|---|---|---|
| Application | `app/main.py` | FastAPI instance, CORS, security headers, exception handlers, health/root routes, router registration |
| HTTP routes | `app/api/routes/` | Paths, methods, query/path parameters, dependencies, response models |
| Dependencies | `app/dependencies.py` | Database session and current-user resolution from JWT |
| Schemas | `app/schemas/` | Request validation, response serialization, pagination envelopes |
| Services | `app/services/` | Business rules, ownership, transaction boundaries, upload handling |
| Models | `app/models/` | SQLAlchemy tables, constraints, relationships |
| Database | `app/db/` | Declarative base, timestamp mixin, engine/session factory, `get_db` |
| Core | `app/core/` | Settings, password/JWT helpers, UTC time |
| Migrations | `alembic/` | Additive schema revisions `0001`-`0005` |

### Request lifecycle

1. Uvicorn receives the HTTP request.
2. CORS and security-header middleware run.
3. FastAPI resolves dependencies. Protected routes call `get_current_user`;
   the dependency decodes and validates the JWT, loads the user, and rejects
   inactive accounts.
4. Pydantic validates path/query/body data. Unknown body fields are forbidden,
   so clients cannot supply `author_id` or other privileged values.
5. The route calls a service function with the SQLAlchemy session.
6. The service performs the query or mutation and raises domain-specific
   `HTTPException` values for 401/403/404/409 cases.
7. FastAPI serializes the response model.
8. Unexpected `SQLAlchemyError` or `Exception` values are converted to safe
   generic responses by handlers in `app/main.py`.

### Database session

`app/db/session.py` creates the SQLAlchemy engine from `DATABASE_URL`. The
`get_db` generator yields one session per request and closes it in `finally`.
PostgreSQL URLs are normalized to the explicit Psycopg 3 dialect,
`postgresql+psycopg://`. SQLite is accepted only when `ENVIRONMENT=test`; there
is no hidden SQLite fallback for development or production.

### Configuration

`app/core/config.py` uses Pydantic Settings. Environment variables take
precedence over `.env`. Important settings:

- `DATABASE_URL`
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `UPLOAD_DIR`, `UPLOAD_MAX_SIZE_MB`, `UPLOAD_MAX_IMAGE_PIXELS`
- `ENVIRONMENT`, `DEBUG`

The production validator rejects SQLite and placeholder JWT secrets. Secrets
are marked `repr=False`.

### Error handling

| Exception | Response |
|---|---|
| `RequestValidationError` | 422 with location, message, and type; request values are not echoed |
| `IntegrityError` | 409 generic conflict message |
| `SQLAlchemyError` | 500 `A database error occurred.` |
| Unexpected `Exception` | 500 `An unexpected error occurred.` |

The generic handlers log the exception class and request method/path. Stack
traces, SQL, credentials, filesystem paths, and secret values are never returned
to clients. The health endpoint catches database failures itself and returns 503.

### Upload architecture

1. `POST /uploads/images` requires a Bearer token.
2. The route reads the multipart file with a size limit.
3. `app/services/images.py` validates the actual bytes (JPEG/PNG/WebP), image
   dimensions, and configured pixel limit.
4. Files receive server-generated UUID names under `UPLOAD_DIR/covers/YYYY/MM/`
   or `UPLOAD_DIR/avatars/YYYY/MM/`.
5. The database stores only a relative storage key, never an arbitrary remote
   URL.
6. `GET /uploads/{path}` resolves the key, rejects traversal/drive-letter/
   extension abuse, confirms the resolved path remains inside `UPLOAD_DIR`, and
   serves the file.

Uploads are local-disk state. They survive an application restart but require a
persistent volume in a multi-instance or container deployment.

## Frontend architecture

```text
main.tsx
  -> App.tsx
     -> ToastProvider
     -> AuthProvider
     -> AppRouter (React Router 7)
        -> SiteLayout (header, main outlet, footer)
        -> lazy-loaded page modules
```

- `src/api/` contains Axios clients for auth, posts, comments, bookmarks,
  profiles, topics, and uploads.
- `src/api/client.ts` sets the API base URL, attaches the Bearer token, and
  clears the session on a 401 that belongs to the current token.
- `src/contexts/AuthProvider.tsx` hydrates the session from the stored token,
  exposes login/register/logout/update, and handles unauthorized events.
- `src/routes/ProtectedRoute.tsx` redirects anonymous users to
  `/login?next=<safe local path>`.
- `src/routes/AppRouter.tsx` uses `React.lazy` and `Suspense` for route-level
  code splitting. The main production chunk is below Vite's 500 kB warning
  threshold; Markdown rendering is a separate lazy chunk.
- `src/utils/markdown.ts` uses `react-markdown`, `remark-gfm`,
  `rehype-sanitize`, and `rehype-slug` to render safe Markdown.
- `src/utils/tokenStorage.ts` stores the access token in the browser's
  `sessionStorage` for this single-page application. The backend remains the
  authority for token validity and ownership.

### Frontend routes

| Route | Purpose |
|---|---|
| `/` | Journal home, search, topic/author filters, pagination |
| `/community` | Recent responses, contributors, topic rankings |
| `/posts/:id` | Article reading, comments, likes, bookmarks, owner controls |
| `/authors/:username` | Public author profile and stories |
| `/login`, `/register` | Authentication |
| `/write`, `/write/:id/edit` | Protected article editor |
| `/my-posts` | Protected author dashboard |
| `/library` | Protected bookmarks and collections |
| `/account` | Protected profile/avatar settings |
| `/vault`, `/dashboard/*` | Legacy redirects |

## Data flow and integrity

- Foreign keys enforce ownership references and cascade behavior independently
  of application code.
- Posts reference users with `ON DELETE RESTRICT`; comments reference posts with
  `ON DELETE CASCADE`.
- Likes and bookmarks cascade when their user or post is deleted.
- Unique constraints prevent duplicate likes and bookmarks.
- Indexes cover foreign keys, timestamps, topics, usernames, and emails.
- Timestamps are stored in UTC and serialized as timezone-aware UTC values.

## Security boundaries

- The frontend never receives backend secrets.
- The backend never trusts a client-supplied author ID for ownership operations.
- Uploaded filenames are never used as storage paths.
- Remote image URLs are not fetched by the backend.
- CORS is an explicit allowlist; credentials are disabled.
- Security headers are added to every response.
- The API does not include rate limiting, refresh-token rotation, token
  revocation, email verification, or TLS termination in this repository. Those
  are deployment/security follow-ups, not claims of implementation.

See `docs/AUTHENTICATION_AND_SECURITY.md` for the detailed security review.
