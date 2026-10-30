<p align="center">
  <img src="frontend/public/brand/anviksha-symbol.png" alt="ANVIKSHA brand symbol" width="92" />
</p>

<h1 align="center">ANVIKSHA</h1>

<p align="center">
  <strong>Question Deeper. Understand Better.</strong>
</p>

<p align="center">
  A database-backed knowledge publishing platform for curious minds.<br />
  FastAPI + PostgreSQL API with a React editorial client.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-A47A43?style=flat-square" alt="License: MIT" /></a>
  <a href="requirements.txt"><img src="https://img.shields.io/badge/Python-3.12%2B-171714?style=flat-square&logo=python&logoColor=white" alt="Python 3.12+" /></a>
  <a href="docs/API_DOCUMENTATION.md"><img src="https://img.shields.io/badge/FastAPI-0.161.1-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI 0.161.1" /></a>
  <a href="frontend/package.json"><img src="https://img.shields.io/badge/React-19.3-171714?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19.3" /></a>
  <a href="docs/DATABASE_SCHEMA.md"><img src="https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 14+" /></a>
</p>

---

## Overview

**ANVIKSHA** is an editorial knowledge platform where readers can discover stories by topic, follow authors, and build a private library of ideas worth returning to. Writers get a focused Markdown editor, validated cover images, and a publishing workflow backed by a real REST API.

The repository is intentionally full-stack. The **FastAPI service is the primary deliverable**; the React client is a real consumer of that API, not a mock or a local fallback. Every post, comment, like, bookmark, topic count, and author profile is read from PostgreSQL.

| Item | Detail |
|---|---|
| **Project** | ANVIKSHA - Knowledge Platform for Curious Minds |
| **Tagline** | Question Deeper. Understand Better. |
| **API** | FastAPI / PostgreSQL / JWT bearer authentication |
| **Client** | React 19.3 / Vite 8 / TypeScript 6 |
| **Data** | SQLAlchemy 2 / Alembic migrations |
| **License** | MIT |

---

## Key Features

### Authentication and User Management

- Registration and login with Argon2id password hashing and JWT access tokens.
- Protected client routes with tab-scoped `sessionStorage` and safe local redirects.
- Editable display name and biography; public author profiles with real counts.
- Avatar upload, replacement, and removal with backend image validation.
- Ownership checks on every post and comment mutation; inactive accounts are rejected.

### Content Management

- Markdown authoring with title, excerpt, topic, and optional cover image.
- Create, edit, and delete owned stories from a focused editor.
- Server-generated upload keys for validated JPEG, PNG, and WebP covers.
- A personal `/my-posts` page with search, refresh, edit, delete, and pagination.
- Confirmation dialogs and toast feedback for destructive and successful actions.

### Community Engagement

- Chronological comments with author identity and owner-only edit/delete controls.
- Persistent likes and bookmarks with one row per user/post and idempotent endpoints.
- A private library at `/library` with collections, search, topic filters, sorting, and pagination.
- Real engagement counts used across cards, story pages, and author profiles.
- Topic discovery derived from actual published posts, not hardcoded trends.

### Content Discovery

- Public feed with server-side search across title, excerpt, and body content.
- Topic and author filters, plus newest, oldest, title, and popular sorting.
- Server-side pagination using a consistent `Page` response envelope.
- Related stories based on the current story's topic or title terms.
- Community page with recent responses, contributors, topic rankings, latest stories, and a local reading trail.

### User Experience

- Editorial design system: warm ivory `#F2EEE5`, ink `#171714`, and muted bronze `#A47A43`.
- Magazine-style homepage with a cover story, issue contents, topic index, marginalia, engagement rail, and contributors.
- Safe Markdown rendering with GFM tables/task lists, sanitized HTML, stable heading IDs, a table of contents, and highlighted code.
- Reading progress, share controls, related stories, and a focused deep-read mode.
- Responsive navigation, keyboard-visible focus states, a skip link, semantic landmarks, loading skeletons, empty states, and retry controls.

---

## Technology Stack

| Layer | Technologies | Notes |
|---|---|---|
| Frontend | React 19.3.1 / TypeScript 6.0.3 / Vite 8.3.5 / Tailwind CSS 4.3.3 | React Router 7.18.4, Axios 1.20.0, Lucide React 1.61.0; route-level code splitting |
| Markdown | React Markdown 10.1.0 / remark-gfm 4.0.1 / rehype-sanitize 6.0.0 / rehype-slug 6.0.0 / highlight.js 11.12.0 | GFM, sanitized HTML, stable heading IDs, highlighted code |
| Backend | Python 3.12+ (verified 3.14.7) / FastAPI 0.161.1 / Uvicorn 0.54.0 | Pydantic 2.14.1, pydantic-settings 2.16.1, python-multipart 0.0.32, email-validator 2.3.0 |
| Database | PostgreSQL 14+ (verified 18.6) / SQLAlchemy 2.1.6 / Psycopg 3.3.6 | `postgresql+psycopg://`; SQLite is limited to isolated tests |
| Authentication | PyJWT 2.15.1 / pwdlib[argon2] 0.3.1 | JWT HS256 by default; HS384/HS512 supported; Argon2id hashing |
| Migrations | Alembic 1.20.1 | Revisions `0001`-`0005`; current head `0005_user_avatar` |
| Testing | Pytest 9.1.1 / httpx2 2.16.0 / Vitest 5.0.5 / Testing Library / Playwright 1.63.0 | Backend, frontend unit, and browser E2E; PostgreSQL integration is opt-in |
| Tooling | Node.js 24.20.0 (requires 20.19+, 22.12+) / npm 11.19.0 / Oxlint 1.88.0 | Git; PowerShell examples with Linux/macOS equivalents |

---

## System Architecture

```mermaid
flowchart LR
    subgraph Client["Browser"]
        UI["React 19 + Vite<br/>Editorial SPA"]
        Store["sessionStorage<br/>JWT access token"]
    end

    subgraph API["FastAPI application"]
        Routes["API routes<br/>app/api/routes"]
        Deps["Dependencies<br/>DB session + current user"]
        Schemas["Pydantic schemas<br/>validation + response models"]
        Services["Service layer<br/>business rules + ownership"]
        Models["SQLAlchemy models<br/>app/models"]
        Security["JWT + Argon2id<br/>app/core"]
        Uploads["Upload service<br/>byte + dimension checks"]
    end

    DB[("PostgreSQL 14+")]
    Disk[("Local upload directory<br/>UPLOAD_DIR")]
    Migrations["Alembic migrations<br/>0001 to 0005"]

    UI -->|"JSON / multipart"| Routes
    Store -.->|"Bearer token"| UI
    Routes --> Deps
    Routes --> Schemas
    Deps --> Services
    Schemas --> Services
    Services --> Models
    Models --> DB
    Routes --> Security
    Services --> Uploads
    Uploads --> Disk
    Migrations --> DB
```

Routes own HTTP concerns; Pydantic schemas validate input and shape responses; the service layer enforces ownership and transaction rules; SQLAlchemy models map the PostgreSQL schema. Alembic owns schema changes. Uploaded images are validated in the service layer and stored on local disk; the database stores only relative keys.

---

## Project Structure

```text
ANVIKSHA_BLOG_API/
|-- app/
|   |-- api/
|   |   `-- routes/
|   |       |-- auth.py
|   |       |-- bookmarks.py
|   |       |-- comments.py
|   |       |-- posts.py
|   |       |-- profiles.py
|   |       |-- topics.py
|   |       `-- uploads.py
|   |-- core/
|   |   |-- config.py
|   |   |-- security.py
|   |   `-- time.py
|   |-- db/
|   |   |-- base.py
|   |   `-- session.py
|   |-- models/
|   |   |-- bookmark.py
|   |   |-- comment.py
|   |   |-- post.py
|   |   |-- post_like.py
|   |   `-- user.py
|   |-- schemas/
|   |   |-- auth.py
|   |   |-- comment.py
|   |   |-- common.py
|   |   |-- post.py
|   |   |-- upload.py
|   |   `-- user.py
|   |-- services/
|   |   |-- auth.py
|   |   |-- comments.py
|   |   |-- images.py
|   |   |-- posts.py
|   |   `-- profiles.py
|   |-- dependencies.py
|   `-- main.py
|-- alembic/
|   |-- versions/
|   |   |-- 0001_initial_schema.py
|   |   |-- 0002_add_post_cover_image_url.py
|   |   |-- 0003_add_post_cover_image_path.py
|   |   |-- 0004_add_engagement_profiles_and_topics.py
|   |   `-- 0005_add_user_avatar_path.py
|   `-- env.py
|-- docs/
|   |-- API_DOCUMENTATION.md
|   |-- ARCHITECTURE.md
|   |-- AUTHENTICATION_AND_SECURITY.md
|   |-- DATABASE_SCHEMA.md
|   |-- DEPLOYMENT_GUIDE.md
|   |-- PROJECT_OVERVIEW.md
|   |-- SETUP_AND_INSTALLATION.md
|   |-- TESTING_GUIDE.md
|   |-- internship-compliance/        # verification and compliance reports
|   `-- openapi.json
|-- frontend/
|   |-- e2e/
|   |   `-- anviksha.spec.ts
|   |-- public/
|   |   `-- brand/
|   |       |-- anviksha-app-icon.png
|   |       |-- anviksha-logo-full.png
|   |       |-- anviksha-logo-horizontal.png
|   |       `-- anviksha-symbol.png
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- contexts/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |-- routes/
|   |   |-- test/
|   |   |-- types/
|   |   |-- utils/
|   |   |-- App.tsx
|   |   |-- index.css
|   |   `-- main.tsx
|   |-- .env.example
|   |-- index.html
|   |-- package.json
|   |-- playwright.config.ts
|   |-- vite.config.ts
|   `-- vitest.config.ts
|-- scripts/
|   |-- e2e_postgres.py
|   `-- restart_persistence.py
|-- tests/
|   |-- integration/
|   |   `-- test_postgres_integration.py
|   |-- conftest.py
|   |-- helpers.py
|   |-- image_data.py
|   |-- test_auth.py
|   |-- test_avatars.py
|   |-- test_comments.py
|   |-- test_cors.py
|   |-- test_db_session.py
|   |-- test_engagement.py
|   |-- test_error_handling.py
|   |-- test_health_docs.py
|   |-- test_migrations.py
|   |-- test_posts.py
|   |-- test_profiles.py
|   |-- test_schemas.py
|   |-- test_security.py
|   `-- test_uploads.py
|-- uploads/
|   `-- .gitkeep
|-- .env.example
|-- .gitignore
|-- alembic.ini
|-- LICENSE
|-- README.md
|-- pytest.ini
`-- requirements.txt
```

Generated caches, virtual environments, `node_modules`, build output, local `.env` files, and uploaded user files are omitted.

---

## Prerequisites

| Requirement | Minimum | Verified locally |
|---|---|---|
| Python | 3.12+ | 3.14.7 |
| Node.js | 20.19+, 22.12+, or newer | 24.20.0 |
| npm | Bundled with Node.js | 11.19.0 |
| PostgreSQL | 14+ | 18.6 |
| Git | Current release | Verified in this environment |

- **PostgreSQL client tools** (`psql`) are needed for the one-time role and database setup. If `psql` is not on `PATH`, call the full path to your installation's `psql` executable.
- **Playwright Chromium** is needed only for browser end-to-end tests.
- **Docker is not required.** The repository does not include a Docker or Compose configuration.
- The setup examples use **Windows PowerShell**; Linux/macOS equivalents are provided.

Check the core versions from any directory:

```powershell
python --version
node --version
npm --version
psql --version
git --version
```

The same commands work in a Linux/macOS shell. If `python` is not available, use `python3`.

---

## Installation and Setup

Run commands from the repository root unless a step says otherwise.

### 1. Clone or enter the repository

**Windows PowerShell**

```powershell
git clone https://github.com/shaida-labs/ANVIKSHA_BLOG_API.git
Set-Location ANVIKSHA_BLOG_API
```

**Linux/macOS**

```bash
git clone https://github.com/shaida-labs/ANVIKSHA_BLOG_API.git
cd ANVIKSHA_BLOG_API
```

If the repository is already open locally, start from its root instead.

### 2. Create the backend environment

**Windows PowerShell**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip check
```

**Linux/macOS**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip check
```

`requirements.txt` pins `python-multipart`, which FastAPI needs for multipart upload endpoints.

### 3. Install frontend dependencies

From the `frontend/` directory:

**Windows PowerShell**

```powershell
Set-Location frontend
npm ci
Set-Location ..
```

**Linux/macOS**

```bash
cd frontend
npm ci
cd ..
```

### 4. Create environment files

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
Set-Location frontend
Copy-Item .env.example .env.local
Set-Location ..
```

**Linux/macOS**

```bash
cp .env.example .env
cd frontend
cp .env.example .env.local
cd ..
```

Then fill in the placeholders as described in [Environment Configuration](#environment-configuration). Do not commit either file.

### 5. Prepare the database and start the services

Continue with [Database Setup and Migrations](#database-setup-and-migrations), then [Running the Backend](#running-the-backend) and [Running the Frontend](#running-the-frontend).

---

## Environment Configuration

The backend reads `.env` from the repository root. The frontend reads `.env.local` from `frontend/`. Both files are gitignored.

### Backend variables

| Variable | Example / default | Notes |
|---|---|---|
| `APP_NAME` | `ANVIKSHA API` | FastAPI title and log label. |
| `ENVIRONMENT` | `development` | `development`, `test`, or `production`. |
| `DEBUG` | `false` | Controls log level; stack traces are not returned to clients. |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173` | Comma-separated browser origins. Add your frontend origin. |
| `DATABASE_URL` | `postgresql+psycopg://blog_user:YOUR_PASSWORD@localhost:5432/blog_api_db` | Psycopg 3 URL. Plain `postgresql://` and `postgres://` are normalized. URL-encode reserved password characters. |
| `DATABASE_ECHO` | `false` | Enables SQLAlchemy SQL logging. |
| `JWT_SECRET_KEY` | `PASTE_GENERATED_SECRET_HERE` | At least 32 characters. Generate a random value; never commit it. |
| `JWT_ALGORITHM` | `HS256` | `HS256`, `HS384`, or `HS512`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | 1-1440 minutes. |
| `UPLOAD_DIR` | `uploads` | Relative to the project root unless absolute. |
| `UPLOAD_MAX_SIZE_MB` | `5` | 1-50 MB; the backend remains authoritative. |
| `UPLOAD_MAX_IMAGE_PIXELS` | `40000000` | Maximum decoded pixel count. |

Generate a JWT secret with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

The same command works in a Linux/macOS shell. Paste the output into `JWT_SECRET_KEY`.

### Frontend variables

| Variable | Example | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Base URL of the FastAPI service. |
| `VITE_MAX_UPLOAD_MB` | `5` | Client-side cover/avatar limit. Keep aligned with `UPLOAD_MAX_SIZE_MB`; the backend validates the bytes. |

Only `VITE_*` values are exposed to the browser. Do not put secrets in `frontend/.env.local`.

The default CORS template allows the Vite dev server (`5173`) and preview server (`4173`). If you use another origin, add it to `CORS_ORIGINS` and restart the API.

Production validation rejects SQLite, non-PostgreSQL URLs, and placeholder JWT secrets. SQLite is accepted only when `ENVIRONMENT=test`.

---

## Database Setup and Migrations

Run these steps from the repository root with the backend virtual environment active. The application does not create or drop databases automatically.

### 1. Create the role and databases

Open `psql` as a PostgreSQL administrator.

**Windows PowerShell**

```powershell
psql -U postgres -h localhost
```

If `psql` is not on `PATH`, use the full path to your installation. For a PostgreSQL 18 installation on Windows:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost
```

**Linux/macOS**

```bash
psql -U postgres -h localhost
```

Then run, replacing the password with a strong local value:

```sql
CREATE ROLE blog_user WITH LOGIN PASSWORD 'replace_with_a_strong_database_password';
CREATE DATABASE blog_api_db OWNER blog_user;
CREATE DATABASE blog_api_test OWNER blog_user;
```

If the role already exists, update its password instead:

```sql
ALTER ROLE blog_user WITH LOGIN PASSWORD 'replace_with_a_strong_database_password';
```

`blog_api_test` is reserved for the opt-in PostgreSQL integration suite. The test fixture refuses to run unless the database name contains `test`, and it recreates only its dedicated test tables. Never point `TEST_DATABASE_URL` at the application database.

Verify the application connection:

**Windows PowerShell**

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U blog_user -h localhost -d blog_api_db -c "SELECT current_database();"
```

**Linux/macOS**

```bash
psql -U blog_user -h localhost -d blog_api_db -c "SELECT current_database();"
```

Adjust the PostgreSQL version in the Windows path if your installation differs.

### 2. Apply migrations

From the repository root:

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic check
```

The same commands work on Linux/macOS. Expected current revision:

```text
0005_user_avatar (head)
```

`alembic check` should report:

```text
No new upgrade operations detected.
```

### Migration history

| Revision | Change |
|---|---|
| `0001_initial_schema` | Creates `users`, `posts`, and `comments` with core constraints and indexes. |
| `0002_add_post_cover_image_url` | Adds the legacy nullable `posts.cover_image_url` column. |
| `0003_add_post_cover_image_path` | Adds `posts.cover_image_path`; copies local legacy `/uploads/...` URLs into it. |
| `0004_add_engagement_profiles_and_topics` | Adds display name/bio, post excerpt/topic, `post_likes`, and `bookmarks`. |
| `0005_add_user_avatar_path` | Adds nullable `users.avatar_path` for profile pictures. |

### Core tables

| Table | Purpose |
|---|---|
| `users` | Accounts, public profiles, avatar keys, and active state. |
| `posts` | Markdown stories, topics, cover references, and authors. |
| `comments` | Chronological comments linked to posts and authors. |
| `post_likes` | One like per user/post; cascades with post or user deletion. |
| `bookmarks` | Private saved posts and optional collection labels. |

Migrations are additive. Do not reset or drop an existing database to apply changes. For a model change, create a new migration:

```powershell
python -m alembic revision --autogenerate -m "describe the change"
python -m alembic upgrade head
```

Deleting a post cascades its comments, likes, and bookmarks. Deleting a user with posts or comments is restricted by the database; no user-deletion endpoint is exposed. No seed data is included; create an account through `/register` or the UI.

---

## Running the Backend

From the repository root, with the virtual environment active:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The same command works on Linux/macOS. Use `--reload` for local development only.

| Service | URL |
|---|---|
| API root | <http://127.0.0.1:8000/> |
| Health check | <http://127.0.0.1:8000/health> |
| Swagger UI | <http://127.0.0.1:8000/docs> |
| ReDoc | <http://127.0.0.1:8000/redoc> |
| OpenAPI JSON | <http://127.0.0.1:8000/openapi.json> |

Verify the database-aware health endpoint:

**Windows PowerShell**

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

**Linux/macOS**

```bash
curl -fsS http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "database": "reachable",
  "service": "anviksha-api",
  "project_id": "ANVIKSHA"
}
```

`/health` runs a real `SELECT 1`; it returns `503` when PostgreSQL is unavailable.

---

## Running the Frontend

From the `frontend/` directory, with `frontend/.env.local` configured:

```powershell
Set-Location frontend
npm run dev
```

The same command works on Linux/macOS after `cd frontend`.

The Vite development server runs at <http://127.0.0.1:5173/>. The backend must be running and `VITE_API_BASE_URL` must point to it.

For a production build:

```powershell
npm run build
npm run preview
```

The build is written to `frontend/dist/`; preview serves it at <http://127.0.0.1:4173/>. The backend CORS template allows both `5173` and `4173`; add other origins to `CORS_ORIGINS`.

---

## API Documentation

FastAPI generates interactive documentation from the live application.

| Resource | Local URL |
|---|---|
| Swagger UI | <http://127.0.0.1:8000/docs> |
| ReDoc | <http://127.0.0.1:8000/redoc> |
| OpenAPI JSON | <http://127.0.0.1:8000/openapi.json> |
| Committed snapshot | [`docs/openapi.json`](docs/openapi.json) |

The committed snapshot contains **18 paths and 29 operations** across General, Authentication, Posts, Comments, Topics, Library, Authors, and Uploads. The API version is `1.0.0`.

- Base URL: `http://127.0.0.1:8000`
- Authentication: `Authorization: Bearer <access_token>`; obtain a token from `POST /login`.
- JSON bodies use `application/json`; uploads use `multipart/form-data`.
- List endpoints return a pagination envelope:

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

- Errors use `{"detail": "..."}`. Validation errors use a list of location/message/type objects and do not echo submitted values.

To authorize in Swagger UI:

1. Call `POST /login` with a registered account.
2. Copy `access_token` from the response.
3. Click **Authorize**, paste the token into the Bearer field, and authorize.
4. Call protected endpoints.

`GET /uploads/{file_path:path}` serves stored images and is intentionally hidden from the OpenAPI schema. It remains part of the public image-serving contract.

---

## API Modules and Capabilities

| Module | Representative endpoints | Auth | Capabilities |
|---|---|---|---|
| General | `GET /`, `GET /health` | Public | Service metadata and a database-aware health check. |
| Authentication | `POST /register`, `POST /login`, `GET /users/me` | Public / Bearer | Account creation, JWT login, current-user lookup. |
| Authors | `PATCH /users/me`, `POST/DELETE /users/me/avatar`, `GET /users/{username}` | Bearer / Public | Profile editing, avatar lifecycle, public author profiles. |
| Posts | `GET/POST /posts`, `GET /posts/mine`, `GET/PUT/DELETE /posts/{post_id}` | Public / Bearer / Owner | Post CRUD and discovery with pagination, search, filters, and sorting. |
| Engagement | `POST/DELETE /posts/{post_id}/like`, `POST/DELETE/PATCH /posts/{post_id}/bookmark` | Bearer | Idempotent likes and bookmarks with real counts. |
| Comments | `GET/POST /comments`, `GET/PUT/DELETE /comments/{comment_id}` | Public / Bearer / Owner | Chronological comments with owner-only mutation. |
| Library | `GET /bookmarks`, `GET /bookmarks/collections` | Bearer | Private saved stories, collection labels, and counts. |
| Topics | `GET /topics` | Public | Real topic labels and post counts. |
| Uploads | `POST /uploads/images`, `GET /uploads/{file_path:path}` | Bearer / Public | Validated image upload and safe local serving. |

The OpenAPI snapshot counts 29 documented operations; the upload-serving `GET` is intentionally hidden from the schema and is included above for completeness.

### Post discovery

`GET /posts` accepts:

| Parameter | Values | Notes |
|---|---|---|
| `limit` | 1-100, default 20 | Page size. |
| `offset` | >= 0, default 0 | Rows to skip. |
| `search` | Up to 200 characters | Case-insensitive title, excerpt, and content search. |
| `topic` | Up to 60 characters | Exact topic filter; `General` maps to untagged posts. |
| `author` | Up to 50 characters | Author username filter on the public feed. |
| `sort` | `newest`, `oldest`, `title`, `popular` | Popular uses real like and comment totals. |

`GET /posts/mine` applies the same pagination, search, topic, and sort controls but always scopes results to the authenticated author. `GET /bookmarks` adds `collection` and supports `saved_newest`, `saved_oldest`, and `title` sorting.

Status codes include `201` for new accounts, posts, comments, and uploaded images; `204` for post/comment deletion; `200` for likes, bookmarks, and avatar changes; `401`/`403` for authentication and ownership failures; `404` for missing resources; `409` for conflicts; `413`/`415` for upload size or type; and `422` for validation errors.

Post and comment authors are derived from the JWT, never from client-supplied `author_id` fields. Request schemas forbid unknown fields.

---

## Testing

The repository uses isolated in-memory SQLite for the default backend suite and real PostgreSQL for the opt-in integration suite. Commands are defined by the project; run them from the directories shown.

### Local verification

These are local results from **2026-10-30**, not CI or production metrics:

| Check | Result |
|---|---|
| Backend default suite | `175 passed, 1 skipped` |
| Frontend unit tests | `47 passed in 11 files` |
| Frontend typecheck | `PASS` |
| Frontend lint | `25 warnings, 0 errors` |
| Frontend production build | `PASS` |
| API health | `200`, database reachable |
| Alembic current | `0005_user_avatar (head)` |
| Alembic check | `No new upgrade operations detected` |

The PostgreSQL integration suite and Playwright suite require external services and are not included in these default results.

### Backend

From the repository root:

```powershell
python -m pytest -q
```

The default suite does not modify the configured PostgreSQL database. The PostgreSQL integration module is skipped unless `TEST_DATABASE_URL` is set.

To run the opt-in integration suite, create the dedicated `blog_api_test` database, then:

**Windows PowerShell**

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://blog_user:YOUR_PASSWORD@localhost:5432/blog_api_test"
python -m pytest -m integration -q
```

**Linux/macOS**

```bash
export TEST_DATABASE_URL="postgresql+psycopg://blog_user:YOUR_PASSWORD@localhost:5432/blog_api_test"
python -m pytest -m integration -q
```

The opt-in module contains four PostgreSQL tests. It applies the real Alembic migrations, recreates only its dedicated test tables, and downgrades the test schema when finished. It refuses to run unless the database name contains `test`.

Run the complete backend suite with the test database configured:

```powershell
python -m pytest -q
```

### Frontend

From `frontend/`:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

The Vitest suite covers validation, image-signature checks, API error formatting, cover rendering and fallback, the cover upload field, post cards, avatar fallback, password visibility, token storage, and safe Markdown rendering. Lint warnings are non-blocking; there are no lint errors.

### Browser end-to-end

The Playwright suite is in `frontend/e2e/anviksha.spec.ts`. It requires a running backend with a reachable database and the Vite dev server (Playwright starts or reuses it).

```powershell
npx playwright install chromium
npm run test:e2e
```

The suite covers registration, cover upload, publishing, commenting, liking, bookmarking, the private library, editing, logout, protected-route redirects, second-user authorization checks, and mobile horizontal overflow. It is not executed in CI.

### Additional checks

```powershell
python -m compileall app tests
python -m pip check
python -m alembic check
```

`alembic check` requires a reachable, up-to-date database. The repository does not include a CI workflow; run these checks locally before opening a pull request.

---

## Security Considerations

The codebase includes production-minded controls, but it is not a claim of production readiness. The remaining gaps are listed explicitly below.

### Implemented controls

| Area | Control |
|---|---|
| Passwords | Argon2id hashing through `pwdlib`; passwords are never returned. |
| Tokens | JWT `HS256` by default (`HS384`/`HS512` supported); signature, expiry, subject, and `type=access` are validated. Default lifetime is 30 minutes. |
| Authorization | Post and comment mutations require the owner; the author is derived from the JWT. Unknown request fields are rejected. |
| Uploads | JPEG/PNG/WebP magic-byte checks, size and pixel limits, UUID filenames, and path-traversal protection. |
| Errors | Generic `500`/`503` responses; validation errors do not echo submitted values; integrity conflicts return `409`. |
| CORS and response headers | Explicit origin allowlist; credentials disabled; `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`. |
| Secrets | `.env` files are gitignored; secrets use `repr=False`; production rejects placeholder JWT secrets and SQLite. |
| Markdown | `rehype-sanitize` removes unsafe HTML and URLs; story content is rendered through React, not raw HTML. |

The SPA stores the access token in `sessionStorage` under `anviksha.access_token`. This is tab-scoped and simple, but readable by JavaScript in the same tab. Markdown sanitization reduces XSS exposure; a hardened deployment should consider an HttpOnly cookie session with CSRF protection.

### Known limitations

| Control | Status |
|---|---|
| Rate limiting / brute-force throttling | Not implemented. |
| Refresh-token rotation or revocation | Not implemented. |
| Email verification / password reset | Not implemented. |
| TLS termination | Not included; deploy behind an HTTPS reverse proxy or managed platform. |
| CSP / HSTS | Not set by the application; add at the edge. |
| Malware scanning for uploads | Not implemented; image type and dimension validation only. |
| Object storage / CDN | Uploads are stored on local disk only. |
| Audit logging / alerting | Not included. |
| CI dependency/advisory scanning | Not included. |
| Admin role / moderation workflow | Not implemented. |
| Draft/private posts | Not implemented; all posts are public. |
| User deletion endpoint | Not exposed; the database restricts deleting users with content. |

Before exposing ANVIKSHA publicly, address the items above and review [`docs/AUTHENTICATION_AND_SECURITY.md`](docs/AUTHENTICATION_AND_SECURITY.md).

---

## Screenshots and Demo

> **No product screenshots or demo recordings are committed yet.** The repository contains the official ANVIKSHA brand assets in `frontend/public/brand/`, but no verified UI captures. Do not add mocked or fabricated screenshots.

### Available brand assets

| Asset | Path |
|---|---|
| Horizontal logo | [`frontend/public/brand/anviksha-logo-horizontal.png`](frontend/public/brand/anviksha-logo-horizontal.png) |
| Full logo | [`frontend/public/brand/anviksha-logo-full.png`](frontend/public/brand/anviksha-logo-full.png) |
| Symbol | [`frontend/public/brand/anviksha-symbol.png`](frontend/public/brand/anviksha-symbol.png) |
| App icon | [`frontend/public/brand/anviksha-app-icon.png`](frontend/public/brand/anviksha-app-icon.png) |

### Adding genuine screenshots

1. Run the backend and frontend locally with real data.
2. Capture the running UI at desktop (for example, 1440 px wide) and mobile (for example, 390 px wide) sizes.
3. Save the files under `docs/screenshots/` using descriptive names.
4. Add Markdown image references with meaningful alt text and a short caption.

Suggested captures (not present in the repository):

| Suggested file | What to capture |
|---|---|
| `docs/screenshots/home.png` | Homepage cover story and issue contents. |
| `docs/screenshots/story.png` | Story detail with Markdown, table of contents, and comments. |
| `docs/screenshots/editor.png` | Markdown editor with cover upload. |
| `docs/screenshots/library.png` | Private library with collections and filters. |
| `docs/screenshots/profile.png` | Public author profile. |

A demo video is also not committed. If one is added later, link it from this section rather than embedding an unverified external URL.

---

## Future Enhancements

The following items are **not implemented** and are good candidates for future work:

- Add CI for backend tests, frontend checks, browser E2E, and dependency advisory scanning.
- Add refresh-token rotation, revocation, email verification, and password reset.
- Add rate limiting and abuse protection for authentication and write endpoints.
- Add draft/private posts, scheduled publishing, and an editorial review workflow.
- Add notifications for comments, likes, and new stories from followed authors.
- Add moderation, reporting, and an admin role.
- Move uploads to object storage/CDN and add orphan-file cleanup.
- Add PostgreSQL full-text search or an external search service for larger corpora.
- Add accessibility audits, visual regression tests, and load testing.
- Add Docker/Compose and a documented HTTPS deployment with observability and backups.

---

## Contributing

Contributions are welcome. Keep changes focused, preserve the existing API contract, and include tests and documentation updates.

1. Fork the repository and create a branch:

   ```bash
   git checkout -b feature/your-change
   ```

2. Make the change. Do not commit `.env` files, credentials, uploaded files, or generated caches.
3. Add or update tests.
4. Run the relevant checks:

   ```powershell
   python -m pytest -q
   Set-Location frontend
   npm test
   npm run lint
   npm run typecheck
   npm run build
   ```

5. Update the README or docs when behavior changes.
6. Open a pull request with a clear summary and test evidence.

Use additive Alembic migrations; never rewrite an existing migration that may have been applied. For security-sensitive issues, avoid posting secrets or exploit details in a public issue.

---

## License

Released under the **MIT License**. See [`LICENSE`](LICENSE) for the full text.

Copyright (c) 2026 ANVIKSHA Knowledge Platform Contributors.

---

## Project Information and Acknowledgements

| Item | Detail |
|---|---|
| Project | ANVIKSHA - Knowledge Platform for Curious Minds |
| Tagline | Question Deeper. Understand Better. |
| Repository | [shaida-labs/ANVIKSHA_BLOG_API](https://github.com/shaida-labs/ANVIKSHA_BLOG_API) |
| API version | `1.0.0` |
| Database revision | `0005_user_avatar` |
| License | MIT |
| Deployment | No hosted demo or deployment URL is included. |

### Brand palette

| Token | Hex | Use |
|---|---|---|
| `--color-paper` | `#F2EEE5` | Page background (warm ivory) |
| `--color-ink` | `#171714` | Primary text (ink black) |
| `--color-accent` | `#A47A43` | Accent and links (muted bronze) |

### Documentation

| Document | Purpose |
|---|---|
| [Project overview](docs/PROJECT_OVERVIEW.md) | Product identity, scope, and feature summary. |
| [Architecture](docs/ARCHITECTURE.md) | Layers, request lifecycle, and data flow. |
| [Database schema](docs/DATABASE_SCHEMA.md) | Tables, relationships, constraints, and migration history. |
| [API documentation](docs/API_DOCUMENTATION.md) | Endpoint contracts, payloads, and status codes. |
| [Authentication and security](docs/AUTHENTICATION_AND_SECURITY.md) | Implemented controls and production follow-ups. |
| [Setup and installation](docs/SETUP_AND_INSTALLATION.md) | Detailed local setup and verification notes. |
| [Testing guide](docs/TESTING_GUIDE.md) | Test commands and evidence. |
| [Deployment guide](docs/DEPLOYMENT_GUIDE.md) | A practical deployment path; no live deployment is claimed. |
| [OpenAPI snapshot](docs/openapi.json) | Generated 18-path / 29-operation schema. |

### Project context and acknowledgements

ANVIKSHA was developed as a full-stack internship assignment focused on a RESTful Blog Application API. The FastAPI service is the primary deliverable; the React client is a real API consumer.

Built with FastAPI, SQLAlchemy, Alembic, PostgreSQL, Pydantic, React, Vite, TypeScript, Tailwind CSS, React Router, Axios, React Markdown, highlight.js, and Lucide. The ANVIKSHA brand assets live in `frontend/public/brand/`.

<p align="center"><em>Question Deeper. Understand Better.</em></p>
