# ANVIKSHA - Project Overview

**Question Deeper. Understand Better.**

ANVIKSHA is a knowledge-sharing and editorial publishing platform built for the
InnoByte Services Full Stack Developer internship assignment: **Develop a
RESTful Blog Application API**. The project pairs a FastAPI/PostgreSQL backend
with a React/Vite/TypeScript frontend while keeping the REST API and its
database behavior as the primary deliverable.

## Product identity

| Item | Value |
|---|---|
| Project name | ANVIKSHA |
| Tagline | Question Deeper. Understand Better. |
| Descriptor | Knowledge Platform for Curious Minds and Modern Builders |
| Brand palette | Ivory `#F2EEE5`, Ink `#171714`, Muted Bronze `#A47A43` |
| Backend | Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL, JWT |
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS 4 |
| API version | 1.0.0 |

The frontend is intentionally magazine-like: a cover story, issue contents,
topic index, marginalia, contributor profiles, a private reading library, and a
single-column reading experience. It consumes the real API. There are no mock
API responses in the application path.

## Assignment scope

The mandatory internship requirements are implemented as follows.

| Assignment requirement | Implementation |
|---|---|
| RESTful API | FastAPI routers under `app/api/routes/` |
| Database schema and setup | SQLAlchemy models, Alembic migrations `0001`-`0005`, README setup |
| Authentication | Registration, login, Argon2id password hashing, JWT Bearer tokens |
| Authorization | Authenticated writes and ownership checks for posts and comments |
| Post CRUD | Create, list, retrieve, update, delete |
| Comment CRUD | Create, list by post, retrieve, update, delete |
| Validation and errors | Pydantic schemas, 400/401/403/404/409/413/415/422/500 handling |
| Unit and integration tests | Pytest suite, opt-in real PostgreSQL integration tests |
| API documentation | Swagger UI, ReDoc, OpenAPI JSON, `docs/API_DOCUMENTATION.md` |
| GitHub-ready repository | Independent local repository prepared; remote/push requires authorization |

Additional product features include likes, bookmarks, private collections,
topics, search, pagination, author profiles, avatar uploads, cover-image
uploads, safe Markdown rendering, and a responsive editorial interface. These
features supplement the mandatory blog API; they do not replace it.

## Main capabilities

### Accounts and identity

- Unique lowercase usernames and emails.
- Argon2id password hashes; plaintext passwords are never stored or returned.
- JWT access tokens with `sub`, `type`, `iat`, and `exp` claims.
- Expired, forged, malformed, missing, and wrong-type tokens are rejected.
- Inactive accounts are denied.
- Public author profiles and editable display names/bios.
- Profile-picture upload, replacement, and removal.

### Posts

- Authenticated creation and ownership-enforced updates/deletes.
- Public listing, search, topic/author filters, sorting, and pagination.
- Individual post retrieval with author summary and engagement state.
- Per-post cover images uploaded through the backend.
- Server-generated filenames; relative paths stored in the database.
- Markdown content is stored as text and rendered safely by the frontend.

### Comments

- Authenticated comment creation on existing posts.
- Public chronological listing with pagination.
- Individual retrieval.
- Ownership-enforced update and delete.
- Post deletion cascades to comments; deleting a user with content is restricted.

### Engagement and library

- One like per user/post and one bookmark per user/post.
- Real like and bookmark state returned with posts.
- Private bookmarks, collection labels, search, sorting, and pagination.
- Topic discovery with real post counts.

### Frontend

- Registration, login, logout, session hydration, and protected routes.
- Article feed, detail reading, comments, likes, bookmarks, library, and profiles.
- Create/edit/delete article flows and cover-image upload.
- Responsive desktop, tablet, and mobile layouts.
- Route-level code splitting for page bundles.
- Safe Markdown rendering with sanitization and syntax highlighting.

## Repository layout

```text
blog-api/
  app/
    api/routes/          # HTTP endpoints
    core/                # settings, security, time
    db/                  # declarative base and session dependency
    models/              # SQLAlchemy ORM models
    schemas/             # Pydantic request/response schemas
    services/            # business logic, ownership, uploads
    main.py              # FastAPI application, middleware, handlers
  alembic/               # migration environment and versions
  tests/                 # backend unit, API, and PostgreSQL integration tests
  scripts/               # optional live PostgreSQL and restart E2E scripts
  frontend/              # React/Vite/TypeScript application
  docs/                  # technical and compliance documentation
  uploads/               # local upload root; user files are gitignored
  .env.example           # safe environment template
  requirements.txt       # pinned backend dependencies
  README.md
```

## Verification snapshot

Verification date: **2026-10-30**.

| Area | Status | Evidence |
|---|---|---|
| Backend API | **PASS** | `175 passed, 1 skipped` default suite |
| PostgreSQL migrations | **PASS** | `alembic upgrade head`, `alembic current`, `alembic check` on PostgreSQL 18 |
| PostgreSQL integration | **PASS** | `4 passed, 175 deselected` integration selection; `179 passed` complete suite with PostgreSQL |
| Live PostgreSQL E2E | **PASS** | `49/49` API checks plus restart persistence |
| Authentication/authorization | **PASS** | Two-user JWT and ownership tests; expired/forged token checks |
| File uploads | **PASS** | Real PNG upload, serving, rejection, traversal, and persistence tests |
| Generic 500 path | **PASS** | Automated unexpected-exception and database-error tests |
| Frontend checks | **PASS** | Typecheck, `47/47` unit tests, production build |
| Browser E2E | **PASS** | Playwright: register, upload cover, publish, comment, like, bookmark, library, edit, logout, protected route, second-user authorization, mobile overflow |
| Configured local PostgreSQL on `5432` | **PASS** | `blog_user` authenticates; `/health` 200; Alembic head `0005_user_avatar`; live E2E `49/49` |
| GitHub remote/push | **BLOCKED** | No remote configured and no push authorization; local repository is prepared and GitHub-ready |

The disposable PostgreSQL cluster used for integration tests is not part of the
repository and is not referenced by a committed environment file. The configured
`5432` application database was verified separately without being reset. See
`docs/internship-compliance/FINAL_INTERNSHIP_COMPLIANCE_REPORT.md` for the
complete status and remaining publication gate.
