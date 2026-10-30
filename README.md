# ANVIKSHA — Knowledge Publishing Platform

**Question Deeper. Understand Better.**

ANVIKSHA is a database-backed editorial publishing platform for curious minds.
It combines a FastAPI/PostgreSQL API with a React, Vite, and TypeScript frontend:
a public journal of stories organized by topics, authenticated writing, safe
Markdown reading, real cover-image and profile-picture uploads, likes,
bookmarks, comments, author profiles, search, sorting, pagination, a private
library for each reader, and a personal page for the signed-in author. The
interface is a magazine-style issue rather than a generic dashboard: cover
story, topic index, marginalia, contributors, and a colophon.

| | |
|---|---|
| **Project ID** | ANVIKSHA |
| **Backend** | Python, FastAPI, SQLAlchemy 2.x |
| **Database** | PostgreSQL 14+ |
| **Authentication** | JWT Bearer tokens |
| **Frontend** | React 19, Vite 8, TypeScript 6, Tailwind CSS 4 |
| **API version** | 1.0.0 |

## Documentation and verification

Technical and compliance documents:

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database schema and migrations](docs/DATABASE_SCHEMA.md)
- [Setup and installation](docs/SETUP_AND_INSTALLATION.md)
- [API documentation](docs/API_DOCUMENTATION.md)
- [Authentication and security](docs/AUTHENTICATION_AND_SECURITY.md)
- [Testing guide](docs/TESTING_GUIDE.md)
- [Deployment guide](docs/DEPLOYMENT_GUIDE.md)
- [Generated OpenAPI snapshot](docs/openapi.json)
- [Final internship compliance report](docs/internship-compliance/FINAL_INTERNSHIP_COMPLIANCE_REPORT.md)

Verified on 2026-10-30:

```text
Backend default suite:        175 passed, 1 skipped
Backend with PostgreSQL:      179 passed
PostgreSQL integration:       4 passed, 175 deselected
Live PostgreSQL API E2E:      49/49 checks passed
Configured PostgreSQL health: 200 (database reachable)
Restart persistence:          PASS
Frontend typecheck:           PASS
Frontend unit tests:          47 passed
Frontend lint:                25 warnings, 0 errors
Frontend production build:    PASS (main chunk 299.47 kB, below 500 kB)
Browser E2E (Playwright):     2 passed
```

The configured PostgreSQL service on `5432` now authenticates successfully:
`/health` returns `200` with `"database": "reachable"`, `alembic current` reports
`0005_user_avatar (head)`, and the live PostgreSQL API E2E passed `49/49`
checks against that configured database. The only remaining submission gate is
GitHub publication: no remote is configured and no push has been authorized. See
the final compliance report.

## Features

- Magazine-style journal homepage built from the real API: cover story, issue
  contents, four-column topic index, marginalia from a real comment,
  most-engaged rail, open question, contributors, and archive counts.
- Community page built from real API data: recent responses, contributors,
  topic rankings, and the latest stories.
- Cover story, story grid with folio numbers, excerpts, author/date metadata,
  covers, and real like, comment, and bookmark state.
- Case-insensitive search across story titles, excerpts, and body text.
- Newest, oldest, title, and popular sorting with server-side pagination.
- Topic and author filters backed by real post data.
- Loading skeletons, empty states, error states, and retry controls.
- Registration and login with Argon2id password hashing and JWT access tokens.
- Safe, local-only post-login redirects.
- The **My page** at `/my-posts` with the signed-in author's profile, real story
  count, server-side author filtering, search, refresh, edit, delete, and
  pagination.
- Create, edit, and delete owned stories with confirmation dialogs, excerpts,
  topics, Markdown authoring, and preview.
- Real multipart cover-image uploads with drag/drop, file picker, preview,
  replace/remove, progress, and validation states.
- Profile pictures with upload, replace, and remove controls on the account page.
  Real avatars appear in navigation, posts, comments, author profiles, and the
  account identity; users without a picture show their initials.
- Byte-level server validation for JPEG, PNG, and WebP uploads.
- Safe Markdown rendering with GitHub-flavored tables/task lists, sanitized
  HTML, heading IDs, table of contents, and highlighted code blocks.
- Reading progress, share controls, and a focused deep-read mode.
- Persistent likes and bookmarks with one like and one bookmark per user/post.
- Private library at `/library` with collection labels, filters, search,
  sorting, and server-backed pagination. Legacy `/vault` URLs redirect.
- Public author profiles with avatars, display names, biographies, real story
  counts, and author-filtered story lists.
- Related stories based on the current story's topic or title.
- Chronological comments with real authors, avatars, timestamps, counts, and
  API-backed edit/delete controls for the comment owner.
- Ownership enforcement on every post and comment write.
- A premium editorial system: the ANVIKSHA lotus-book identity, ivory/ink/bronze
  palette, Cormorant Garamond and Manrope typography, ornamental rules, folio
  numbering, a colophon footer, and single-column authentication pages.
- Additive Alembic migrations that preserve existing data.
- Backend and frontend test suites, including PostgreSQL migration and
  integration coverage.

## Technology stack

| Component | Version / tool |
|---|---|
| Python | 3.12+ (verified with 3.14.7 on Windows) |
| Web framework | FastAPI 0.161.1 |
| ASGI server | Uvicorn 0.54.0 |
| ORM | SQLAlchemy 2.1.6 |
| Database driver | Psycopg 3.3.6 |
| Migrations | Alembic 1.20.1 |
| Validation | Pydantic 2.14.1, pydantic-settings 2.16.1 |
| Passwords | pwdlib with Argon2 |
| Tokens | PyJWT 2.15.1 |
| Testing | Pytest 9.1.1, Starlette TestClient with httpx2 2.16.0 |
| Frontend | React 19.3, TypeScript 6.0, Vite 8.3 |
| Styling | Tailwind CSS 4.3, Lucide React icons |
| Routing and data | React Router 7.18, Axios |
| Frontend testing | Vitest 5.0, Testing Library |

Exact Python versions are pinned in `requirements.txt`; frontend versions are
pinned in `frontend/package-lock.json`.

## Architecture

```text
HTTP request
    |
FastAPI route          app/api/routes/
    |
Pydantic schema        app/schemas/
    |
Service function       app/services/
    |
SQLAlchemy model       app/models/
    |
PostgreSQL             via app/db/session.py
```

- Routes handle HTTP concerns: dependencies, query parameters, multipart
  parsing, and response models.
- Services contain business rules, ownership checks, upload validation, and
  transaction boundaries.
- Models define tables, relationships, and database constraints.
- Schemas define request validation and response shapes.
- `app/dependencies.py` provides the database session and authenticated user.
- `app/core/` contains settings, JWT/password logic, and UTC time helpers.
- Uploaded files are stored on disk; the database stores only relative paths.

## Project structure

```text
blog-api/
  app/
    main.py
    dependencies.py
    api/routes/
      auth.py
      posts.py
      comments.py
      uploads.py
      bookmarks.py
      profiles.py
      topics.py
    core/
      config.py
      security.py
      time.py
    db/
      base.py
      session.py
    models/
      user.py
      post.py
      comment.py
      post_like.py
      bookmark.py
    schemas/
      auth.py
      comment.py
      common.py
      post.py
      upload.py
      user.py
    services/
      auth.py
      comments.py
      images.py
      posts.py
      profiles.py
  alembic/versions/
    0001_initial_schema.py
    0002_add_post_cover_image_url.py
    0003_add_post_cover_image_path.py
    0004_add_engagement_profiles_and_topics.py
    0005_add_user_avatar_path.py
  tests/
    conftest.py
    helpers.py
    image_data.py
    test_auth.py
    test_avatars.py
    test_comments.py
    test_cors.py
    test_db_session.py
    test_engagement.py
    test_health_docs.py
    test_migrations.py
    test_posts.py
    test_profiles.py
    test_schemas.py
    test_security.py
    test_uploads.py
    integration/test_postgres_integration.py
  uploads/
    .gitkeep
  .env.example
  .gitignore
  alembic.ini
  LICENSE
  README.md
  requirements.txt
```

## Frontend structure

```text
frontend/
  public/brand/                  # ANVIKSHA logo and app-icon assets
  src/
    api/                         # Axios calls for auth, posts, comments, uploads,
                                 # bookmarks, profiles, and topics
    components/
      authors/                   # Author links and profile presentation
      auth/                      # Auth shell and password field
      comments/                  # Paginated comments and owner controls
      home/                      # Cover story, issue contents, topic index,
                                 # marginalia, and journal issue sections
      layout/                    # Site layout and colophon footer
      navigation/                # Brand, masthead, and responsive navigation
      posts/                     # Cards, covers, Markdown, TOC, engagement
      profile/                   # Avatar upload and profile presentation
      ui/                        # Buttons, fields, dialogs, alerts, empty states
    contexts/                    # Authentication and toast state
    hooks/                       # Auth, author posts, reading progress, titles
    pages/                       # Stories, community, detail, editor, library,
                                 # My page, authors, auth
    routes/                      # Route tree and protected-route handling
    test/                        # Vitest setup
    types/                       # API contracts
    utils/                       # Markdown, highlighting, validation, formatting
    App.tsx
    index.css
    main.tsx
  index.html
  package.json
  vite.config.ts
  vitest.config.ts
  README.md
  .env.example
```

## Prerequisites

- Windows PowerShell (the examples below use PowerShell).
- Python 3.12 or newer.
- Node.js 20.19+, 22.12+, or newer.
- PostgreSQL 14 or newer, running locally or reachable on the network.
- PostgreSQL command-line tools (`psql`, `createdb`, or `pgAdmin`) for the
  initial database and role setup.

```powershell
python --version
node --version
npm --version
Get-Service -Name postgresql*
```

If `psql` is not on `PATH`, use its full installation path, for example:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

## Backend setup

Run these commands from the project root.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip check
```

`requirements.txt` pins `python-multipart==0.0.32`, required by the cover-image
and avatar multipart endpoints.

## PostgreSQL database and role setup

The application does not create databases automatically, and it never drops or
resets an existing database. Run these administrative steps once.

Open `psql` as a PostgreSQL administrator:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost
```

Replace the password before running the SQL:

```sql
CREATE ROLE blog_user WITH LOGIN PASSWORD 'replace_with_a_strong_database_password';
CREATE DATABASE blog_api_db OWNER blog_user;
CREATE DATABASE blog_api_test OWNER blog_user;
```

If the role already exists, update its password instead of creating it again:

```sql
ALTER ROLE blog_user WITH LOGIN PASSWORD 'replace_with_a_strong_database_password';
```

Verify the application database connection:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U blog_user -h localhost -d blog_api_db -c "SELECT current_database();"
```

`blog_api_test` is reserved for the opt-in PostgreSQL integration suite. Do not
point `TEST_DATABASE_URL` at a production or shared development database: the
integration fixture recreates its application tables and applies migrations.

## Environment configuration

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

Generate a random JWT secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Edit `.env` and set:

```dotenv
APP_NAME=ANVIKSHA API
ENVIRONMENT=development
DEBUG=false
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
DATABASE_URL=postgresql+psycopg://blog_user:YOUR_DATABASE_PASSWORD@localhost:5432/blog_api_db
DATABASE_ECHO=false
JWT_SECRET_KEY=PASTE_THE_GENERATED_SECRET_HERE
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
UPLOAD_DIR=uploads
UPLOAD_MAX_SIZE_MB=5
UPLOAD_MAX_IMAGE_PIXELS=40000000
```

Important details:

- `.env` is gitignored. Never commit real credentials.
- `DATABASE_URL` uses the explicit Psycopg 3 dialect,
  `postgresql+psycopg://`. Plain `postgresql://` and `postgres://` URLs are
  normalized to this dialect.
- URL-encode special characters in the database password (for example `@` as
  `%40`) or choose a password without reserved URL characters.
- `JWT_SECRET_KEY` must be at least 32 characters.
- `CORS_ORIGINS` is a comma-separated list of browser origins. The FastAPI
  backend only sends CORS headers for those origins.
- `UPLOAD_DIR` is relative to the project root unless an absolute path is used.
- `UPLOAD_MAX_SIZE_MB` defaults to 5 and is capped at 50.
- `UPLOAD_MAX_IMAGE_PIXELS` defaults to 40,000,000 and prevents decompression
  bombs from being stored.
- SQLite is only accepted when `ENVIRONMENT=test`; the application has no
  hidden SQLite fallback for development or production.
- When `ENVIRONMENT=production`, placeholder JWT secrets are rejected at
  startup and a PostgreSQL URL is required.
- `DEBUG` controls application log level only. Stack traces are never returned
  to API clients.

## Database migrations

Apply all migrations, including the cover-image, engagement, and avatar
revisions:

```powershell
python -m alembic upgrade head
```

The migrations are additive and non-destructive:

- `0002_add_post_cover_image_url.py` adds the nullable
  `posts.cover_image_url` column for legacy URL-based covers.
- `0003_add_post_cover_image_path.py` adds the nullable
  `posts.cover_image_path` column. It copies any local legacy `/uploads/...`
  URL into the new column so existing local images remain visible.
- `0004_add_engagement_profiles_and_topics.py` adds nullable
  `users.display_name`, `users.bio`, `posts.excerpt`, and `posts.topic` columns,
  plus the `post_likes` and `bookmarks` tables. Both engagement tables enforce
  one row per user/post and use cascading foreign keys so deleting a user or
  post cannot leave orphaned likes or bookmarks.
- `0005_add_user_avatar_path.py` adds nullable `users.avatar_path` for
  server-stored profile pictures. Existing users remain valid and fall back to
  their initials until they upload a picture.

No migration deletes or recreates existing rows. Existing posts without a
cover, excerpt, or topic remain valid, existing authors can add profile
details later, and existing users can keep working without an avatar. The
`0004` and `0005` revisions backfill nothing and preserve all existing users,
posts, and comments.

Check the current revision:

```powershell
python -m alembic current
```

Verify that ORM metadata and migrations agree (requires a reachable database):

```powershell
python -m alembic check
```

Create a new migration after changing models:

```powershell
python -m alembic revision --autogenerate -m "describe the change"
python -m alembic upgrade head
```

Use `python -m alembic downgrade -1` only when intentionally rolling back a
migration. Do not use `Base.metadata.create_all()` as a production substitute
for migrations, and do not reset or drop an existing database to apply changes.

## Running the backend

With the virtual environment active and `.env` configured:

```powershell
python -m uvicorn app.main:app --reload
```

The API is available at:

- API root: <http://127.0.0.1:8000/>
- Swagger UI: <http://127.0.0.1:8000/docs>
- ReDoc: <http://127.0.0.1:8000/redoc>
- OpenAPI JSON: <http://127.0.0.1:8000/openapi.json>
- Health check: <http://127.0.0.1:8000/health>

`/health` performs a real `SELECT 1` database check. It returns `200` when the
API and database are reachable, and `503` when the database is unavailable.

## Frontend setup

From the `frontend/` directory:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

The dev server runs at <http://127.0.0.1:5173/>. The frontend reads:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_MAX_UPLOAD_MB=5
```

- `VITE_API_BASE_URL` must point at the running API.
- `VITE_MAX_UPLOAD_MB` is the client-side upload limit. Keep it in sync with the
  backend `UPLOAD_MAX_SIZE_MB`; the backend remains authoritative.
- `.env.local` is gitignored.
- The JWT is stored in `sessionStorage` under `anviksha.access_token`. Closing
  the tab ends the session. The backend uses bearer tokens rather than an
  HttpOnly cookie flow.

For a production build:

```powershell
npm run build
npm run preview
```

The build is emitted to `frontend/dist` and preview runs at
<http://127.0.0.1:4173/>. The backend CORS template allows that origin.

## Frontend routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Stories homepage: cover story, issue contents, topic index, marginalia, most-engaged rail, open question, contributors, feed, search, sort, and pagination. |
| `/community` | Public | Community page with recent responses, contributors, topic rankings, latest stories, and the local reading trail. |
| `/posts/:id` | Public | Full story with safe Markdown, TOC, reading progress, engagement, related stories, comments, deep-read mode, and owner controls. |
| `/authors/:username` | Public | Public author profile with avatar, biography, real counts, and author-filtered stories. |
| `/library` | Protected | The reader's private library with collections, filters, search, sort, and pagination. |
| `/vault` | Redirect | Legacy redirect to `/library`. |
| `/login` | Public | Sign in with a safe local redirect. No site footer. |
| `/register` | Public | Create an account. No site footer. |
| `/my-posts` | Protected | **My page**: the signed-in author's profile, story count, search, refresh, edit, delete, pagination, and public-page link. |
| `/write` | Protected | Create a Markdown story with excerpt, topic, and cover image. |
| `/write/:id/edit` | Protected | Edit an owned story. |
| `/account` | Protected | Account details plus public display name, biography, and profile picture editing. |
| `/dashboard` | Redirect | Legacy redirect to `/my-posts`. |
| `/dashboard/posts` | Redirect | Legacy redirect to `/my-posts`. |
| `/dashboard/posts/new` | Redirect | Legacy redirect to `/write`. |
| `/dashboard/posts/:id/edit` | Redirect | Legacy redirect to `/write/:id/edit`. |
| `/dashboard/account` | Redirect | Legacy redirect to `/account`. |

Protected routes wait for authentication to resolve, then redirect an anonymous
user to `/login?next=<requested-path>`. Only local paths are accepted as
redirect targets.

## API endpoints

| Method | Path | Authentication | Description | Success |
|---|---|---|---|---|
| GET | `/` | Public | API metadata | 200 |
| GET | `/health` | Public | API and database health | 200 / 503 |
| POST | `/register` | Public | Register a user | 201 |
| POST | `/login` | Public | Obtain a JWT access token | 200 |
| GET | `/users/me` | Bearer | Current user profile | 200 |
| PATCH | `/users/me` | Bearer | Update the current user's display name and biography | 200 |
| POST | `/users/me/avatar` | Bearer | Upload or replace the current user's profile picture | 200 |
| DELETE | `/users/me/avatar` | Bearer | Remove the current user's profile picture | 200 |
| GET | `/users/{username}` | Public | Public author profile, avatar, and real counts | 200 |
| GET | `/topics` | Public | Distinct real topics with post counts | 200 |
| GET | `/posts` | Public | Story feed with pagination, search, topic/author filters, and sorting | 200 |
| GET | `/posts/mine` | Bearer | The current author's posts with pagination and search | 200 |
| POST | `/posts` | Bearer | Create a post | 201 |
| GET | `/posts/{post_id}` | Public | Retrieve a post, including optional viewer engagement state | 200 |
| PUT | `/posts/{post_id}` | Bearer + owner | Replace a post | 200 |
| DELETE | `/posts/{post_id}` | Bearer + owner | Delete a post, its comments, likes, and bookmarks | 204 |
| POST | `/posts/{post_id}/like` | Bearer | Like a post; idempotent | 200 |
| DELETE | `/posts/{post_id}/like` | Bearer | Remove the current user's like; idempotent | 200 |
| POST | `/posts/{post_id}/bookmark` | Bearer | Save a post to the library, optionally with a collection | 200 |
| DELETE | `/posts/{post_id}/bookmark` | Bearer | Remove a post from the library; idempotent | 200 |
| PATCH | `/posts/{post_id}/bookmark` | Bearer | Change only the bookmark's collection label | 200 |
| GET | `/bookmarks` | Bearer | The current user's private library with filters and pagination | 200 |
| GET | `/bookmarks/collections` | Bearer | Real collection labels and counts for the current user | 200 |
| POST | `/uploads/images` | Bearer | Upload a validated cover image | 201 |
| GET | `/uploads/{file_path:path}` | Public | Serve a stored image safely | 200 / 404 |
| GET | `/comments?post_id={post_id}` | Public | List a post's comments chronologically | 200 |
| POST | `/comments` | Bearer | Create a comment | 201 |
| GET | `/comments/{comment_id}` | Public | Retrieve a comment | 200 |
| PUT | `/comments/{comment_id}` | Bearer + owner | Update a comment | 200 |
| DELETE | `/comments/{comment_id}` | Bearer + owner | Delete a comment | 204 |

### Posts

`GET /posts` and `GET /posts/mine` accept:

- `limit`: 1–100, default `20`.
- `offset`: 0 or greater, default `0`.
- `search`: optional case-insensitive search across title, excerpt, and body
  text, maximum 200 characters.
- `topic`: optional exact topic label filter. The API keeps the `topic` field
  name for compatibility with existing clients and data.
- `author`: optional author username filter for the public feed.
- `sort`: `newest` (default), `oldest`, `title`, or `popular`. Popular sorting
  uses real like and comment totals; it never uses fabricated engagement.

`GET /posts/mine` always filters by the authenticated author. It is not a
client-supplied author filter. Public post endpoints resolve an optional Bearer
token so `liked_by_me` and `bookmarked_by_me` reflect the current viewer while
remaining readable without authentication.

`PUT /posts/{post_id}` is a full replacement: `title` and `content` are
required; `excerpt` and `topic` are optional. `created_at` is unchanged and
`updated_at` is refreshed. For uploaded covers, the frontend submits the current
`cover_image_path`, so editing preserves the cover unless the author replaces or
removes it. Legacy URL-only covers are shown read-only in the editor; saving
without a replacement removes the legacy URL, and the editor warns before that
happens.

Every post response includes:

- `cover_image_path`: relative upload key, or `null`.
- `cover_image_url`: legacy read-only URL for older data, or `null`.
- `excerpt`: optional short summary, or `null`.
- `topic`: optional topic label, or `null`.
- `comment_count`: a real count from the comments table.
- `like_count`: a real count from the `post_likes` table.
- `liked_by_me`: whether the optional authenticated viewer liked the post.
- `bookmarked_by_me`: whether the optional authenticated viewer saved the post.

New writes accept only `cover_image_path`. Remote `http://` or `https://` cover
URLs are rejected with `422`.

## Cover image uploads

Cover uploads are real multipart requests. The editor never accepts a remote
image URL.

### Backend contract

`POST /uploads/images` requires a Bearer token and a multipart field named
`file`.

Accepted formats:

- JPEG (`image/jpeg`)
- PNG (`image/png`)
- WebP (`image/webp`)

The backend inspects the actual file bytes, not only the client-provided
`Content-Type` or filename. It also validates dimensions and size before
storing anything.

| Condition | Response |
|---|---|
| Successful upload | `201` with `path`, `url`, `content_type`, `size`, `width`, `height` |
| Missing or invalid token | `401` |
| Empty file | `422` |
| Unsupported or malformed image bytes | `415` |
| Image larger than `UPLOAD_MAX_SIZE_MB` | `413` |
| Dimensions above `UPLOAD_MAX_IMAGE_PIXELS` | `422` |
| Storage failure | `500` |

Stored files use server-generated names:

```text
UPLOAD_DIR/covers/YYYY/MM/<uuid>.<jpg|png|webp>
```

The database stores the relative key, for example
`covers/2026/10/8f3c...png`, not the binary file or a browser object URL. The
public URL is `/uploads/covers/2026/10/8f3c...png`.

The serving endpoint:

- Normalizes separators and resolves paths inside `UPLOAD_DIR` only.
- Rejects traversal segments, drive letters, and disallowed extensions.
- Returns `404` for missing or unsafe paths.
- Serves the detected media type with `Content-Disposition: inline` and a long
  immutable cache lifetime.

When a post's cover is replaced or the post is deleted, the previous stored file
is removed on a best-effort basis. Files are not served from a directory that
allows execution or directory listing.

`uploads/` is gitignored except for `uploads/.gitkeep`. The directory is created
automatically when the first image is stored.

### Frontend behavior

The editor's cover field supports:

- Drag and drop.
- File picker.
- Live 16:9 preview.
- Replace and remove controls.
- Upload progress.
- Client-side type and size validation before the request.
- Disabled and error states.
- A legacy-cover notice when editing an older URL-based post.

Saving is blocked while an upload is in progress. The editor sends only the
relative `cover_image_path` returned by the API.

### Profile picture uploads

Profile pictures are uploaded from the account page as a multipart `file` field
to `POST /users/me/avatar`. The same JPEG, PNG, and WebP byte-level validation,
size limit, and dimension limit apply. The API stores the image at:

```text
UPLOAD_DIR/avatars/YYYY/MM/<uuid>.<jpg|png|webp>
```

`users.avatar_path` stores only the relative key, for example
`avatars/2026/10/8f3c...png`. The public URL is
`/uploads/avatars/2026/10/8f3c...png`. Replacing or removing an avatar deletes
the previous stored file on a best-effort basis. The account page exposes add,
change, and remove controls, and the resulting avatar is reflected immediately
in the navigation identity and across the publishing surfaces.

### Example upload

```powershell
$upload = curl.exe -s -X POST "http://127.0.0.1:8000/uploads/images" `
    -H "Authorization: Bearer $token" `
    -F "file=@C:\path\to\cover.png" | ConvertFrom-Json

$postBody = @{
    title           = "My first ANVIKSHA story"
    content         = "This is the content of my first story."
    cover_image_path = $upload.path
} | ConvertTo-Json

$post = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:8000/posts" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $postBody
```

### Legacy cover URLs

Existing posts may still have `cover_image_url` from the earlier URL-based
editor. The API continues to return that field for compatibility. Migration
`0003_post_cover_image_path` copies local `/uploads/...` legacy URLs into
`cover_image_path`. Remote legacy URLs remain readable but cannot be submitted
for new posts or updates. When an author edits a legacy-only post, the editor
shows the old cover with a warning and removes the legacy URL on save unless the
author uploads a replacement.

## Comments

`GET /comments` requires the `post_id` query parameter. Comments are returned in
chronological order. The same `limit` and `offset` rules apply.

`PUT /comments/{comment_id}` requires the new `content`; `post_id` and
`author_id` cannot be changed. Only the comment author sees edit and delete
controls in the UI, and the API enforces the same ownership rule.

## Topics, engagement, and the library

Topics are plain optional labels on posts. The public interface calls them
topics; the API keeps the `topic` field name for compatibility. `GET /topics`
returns the distinct labels currently used by at least one post, with real
counts. The homepage and library use those server counts for topic filters; no
topic list is hardcoded.

Likes and bookmarks are persisted in their own tables:

- `POST /posts/{post_id}/like` creates at most one like per user/post.
- `DELETE /posts/{post_id}/like` removes only the current user's like.
- `POST /posts/{post_id}/bookmark` saves a post with an optional collection
  label of up to 80 characters.
- `PATCH /posts/{post_id}/bookmark` changes only the collection label.
- `DELETE /posts/{post_id}/bookmark` removes the saved post.

All engagement endpoints are idempotent and require authentication. The API
returns the resulting boolean state and real count, so the frontend never
invents engagement values. `GET /bookmarks` is private to the authenticated
user and supports search, topic, collection, sort, limit, and offset.
`GET /bookmarks/collections` returns only the labels currently attached to that
user's bookmarks, with counts. The library is never exposed on a public
endpoint.

## Author profiles and avatars

`GET /users/{username}` returns a public profile: username, display name,
biography, avatar path, member-since date, and real published-story counts for
posts, comments, and likes received. `PATCH /users/me` lets the authenticated
user update only their display name and biography. Usernames and email
addresses are not changed by that endpoint.

Profile pictures use the same byte-level image validation as cover uploads:

- `POST /users/me/avatar` accepts a multipart `file` field with a JPEG, PNG, or
  WebP image, stores it under `UPLOAD_DIR/avatars/YYYY/MM/`, and replaces any
  previous picture.
- `DELETE /users/me/avatar` clears `users.avatar_path` and removes the unused
  file on a best-effort basis.
- The account page supports add, change, and remove actions. The frontend shows
  real avatars in the header identity, post cards, comments, author profiles,
  and the account page. Users without a picture fall back to their initials.

## Markdown, table of contents, and deep-read mode

Story bodies are rendered as GitHub-flavored Markdown through `react-markdown`.
`remark-gfm` enables tables, task lists, and strikethrough; `rehype-sanitize`
removes unsafe HTML, event handlers, and dangerous URLs; `rehype-slug` creates
stable heading IDs. The table of contents is extracted from the same Markdown
source and linked to those IDs, including duplicate-heading suffixes. Code
blocks are highlighted with `highlight.js` and include a copy control.

The detail page shows reading progress, a share control, related stories, and a
focus mode that hides site chrome while leaving an exit control available. The
frontend never uses `dangerouslySetInnerHTML` for story content.

## Authorization policy

- Missing, malformed, expired, or invalid tokens return `401 Unauthorized` with
  `WWW-Authenticate: Bearer`.
- Existing resources owned by another user return `403 Forbidden`.
- Missing resources return `404 Not Found`.
- A user may update or delete only their own posts and comments.
- Likes and bookmarks are scoped to the authenticated user; a user cannot
  remove another user's like or bookmark.
- `author_id` is always derived from the authenticated token. Attempts to send
  it in a request body are rejected with `422` because write schemas forbid
  unknown fields.
- Deleting a post deletes its comments, likes, and bookmarks through database
  cascades.
- Deleting a user who owns content is restricted; no user-deletion endpoint is
  exposed.

## Error handling

Errors use a consistent `{"detail": ...}` shape. Validation errors return `422`
without echoing submitted values such as passwords. Database integrity
conflicts return `409`; unexpected errors return a generic `500` response while
details are logged only on the server.

## Authentication examples

### Register

```powershell
$registerBody = @{
    username = "jane_doe"
    email    = "jane@example.com"
    password = "StrongPass123"
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:8000/register" `
    -ContentType "application/json" `
    -Body $registerBody
```

Usernames and emails are normalized to lowercase. Usernames must be 3–50
characters and may contain letters, numbers, dots, underscores, and hyphens.
Passwords must be 8–128 characters with at least one letter and one digit.

### Log in and store the token

```powershell
$loginBody = @{
    email    = "jane@example.com"
    password = "StrongPass123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:8000/login" `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResponse.access_token
$headers = @{ Authorization = "Bearer $token" }
```

### Authorize in Swagger UI

1. Open <http://127.0.0.1:8000/docs>.
2. Call `POST /login`.
3. Copy `access_token` from the response.
4. Click **Authorize**.
5. Paste only the token into the Bearer field.
6. Authorize and call protected endpoints.

## Post examples

### List and search posts

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/posts?limit=10&offset=0&sort=newest"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/posts?search=fastapi&sort=title"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/posts/mine?limit=10&offset=0" -Headers $headers
```

### Update a post

```powershell
$updateBody = @{
    title            = "My updated ANVIKSHA story"
    content          = "The full replacement content."
    cover_image_path = $post.cover_image_path
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Put `
    -Uri "http://127.0.0.1:8000/posts/$($post.id)" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $updateBody
```

Sending `cover_image_path = $null` (or omitting it) removes the image, because
`PUT` replaces the whole post. Reuse the value returned by the API to keep it.

### Delete a post

```powershell
Invoke-WebRequest `
    -Method Delete `
    -Uri "http://127.0.0.1:8000/posts/$($post.id)" `
    -Headers $headers
```

A successful delete returns `204 No Content` with an empty response body.
Related comments are removed by the database, and the stored cover is removed
on a best-effort basis.

## Testing

The default backend suite uses an isolated in-memory SQLite database, overrides
the application's database dependency, and recreates the schema for each test.
SQLite connections enable foreign-key enforcement explicitly. PostgreSQL
integration tests are opt-in and use the real Alembic migrations.

Run the default suite:

```powershell
python -m pytest -q
```

Run only the non-database-integration tests:

```powershell
python -m pytest -m "not integration" -q
```

Current default result:

```text
175 passed, 1 skipped
```

The skipped test is the PostgreSQL integration module when `TEST_DATABASE_URL`
is not set. With a dedicated PostgreSQL test database configured, the complete
suite collects 179 tests (175 default + 4 integration).

### PostgreSQL integration tests

Create the dedicated `blog_api_test` database described above, then set an
explicit test URL for the current shell:

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://blog_user:YOUR_DATABASE_PASSWORD@localhost:5432/blog_api_test"
python -m pytest -m integration -q
```

The integration fixture:

- Refuses to run unless the database name contains `test`.
- Applies the real Alembic migrations.
- Truncates application tables between tests.
- Downgrades the schema after the module finishes.
- Tests PostgreSQL timestamp awareness, cascade deletion, restrictive user
  deletion, and ownership enforcement.
- Verifies the additive `0004` engagement/profile/topic migration, including
  nullable columns, unique constraints, and cascading foreign keys.
- Verifies the additive `0005` avatar migration and the nullable
  `users.avatar_path` column.

Run the complete suite with both database paths:

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://blog_user:YOUR_DATABASE_PASSWORD@localhost:5432/blog_api_test"
python -m pytest -q
```

Current result with PostgreSQL:

```text
4 passed, 175 deselected
179 passed
```

The PostgreSQL integration suite used a disposable PostgreSQL 18 cluster; the
pre-existing `5432` cluster was not reset, dropped, or modified. The configured
`5432` database was verified separately with `alembic current`, `alembic check`,
`/health`, and the live PostgreSQL API E2E (`49/49`). See
[the testing guide](docs/TESTING_GUIDE.md) for exact evidence and limitations.

### Frontend checks

From `frontend/` run:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Current frontend result:

```text
47 tests passed in 11 files
Typecheck: PASS
Lint: 25 warnings, 0 errors
Build: PASS
```

The suite covers safe Markdown rendering (including heading IDs, duplicate
headings, sanitized scripts, external links, and highlighted code), image
validation, API error formatting, cover rendering and fallback, the cover upload
field, post cards, avatar fallback, password visibility, and token storage. The
typecheck and production build finish without errors. Lint reports warnings
only; there are no lint errors.

### Browser end-to-end tests

The checked-in Playwright suite is in `frontend/e2e/anviksha.spec.ts`:

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

Current result:

```text
2 passed (15.3s)
```

It covers registration, cover upload, publishing, commenting, liking,
bookmarking, the private library, editing, logout, protected-route redirects,
second-user authorization checks, and mobile horizontal overflow. The backend
must already be running at the URL in `frontend/.env.local`; Playwright starts
or reuses the Vite dev server.

### Other verification commands

```powershell
python -m compileall app tests
python -m pip check
python -m alembic check
```

`alembic check` requires a reachable database and an up-to-date migration.

## Troubleshooting

### `psql` is not recognized

Add the PostgreSQL `bin` directory to `PATH`, or call the executable using its
full path:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost
```

### PowerShell blocks `Activate.ps1`

Use a process-scoped policy change:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### Application fails at startup with a settings error

Check that:

- `.env` exists and was copied from `.env.example`.
- `JWT_SECRET_KEY` is at least 32 characters.
- `DATABASE_URL` begins with `postgresql+psycopg://`.
- `ENVIRONMENT` is `development`, `test`, or `production`.
- `UPLOAD_DIR` is writable by the API process.

### `/health` returns 503

The API is running but cannot query PostgreSQL. Verify:

- The PostgreSQL service is running.
- The role, password, host, port, and database name in `.env` are correct.
- The database exists.
- Migrations have been applied: `python -m alembic upgrade head`.

### Post creation returns a database error

If the `posts` table predates the cover-image migration, it may lack the
`cover_image_path` column. Apply the additive migration:

```powershell
python -m alembic upgrade head
```

### Profile picture upload returns a database error

If the `users` table predates the avatar migration, it may lack the
`avatar_path` column. Apply the additive migration:

```powershell
python -m alembic upgrade head
```

Do not reset or drop the database.

### Uploads fail with `413` or `415`

- `413`: the file exceeds `UPLOAD_MAX_SIZE_MB`. Raise the backend limit and the
  frontend `VITE_MAX_UPLOAD_MB` together.
- `415`: the bytes are not a valid JPEG, PNG, or WebP image. Renaming a file does
  not change its format.
- `422`: the file is empty, malformed, or has dimensions above
  `UPLOAD_MAX_IMAGE_PIXELS`.

### Uploaded images return `404`

- Confirm `UPLOAD_DIR` points at the directory containing the stored files.
- Confirm the relative `cover_image_path` was saved, not a browser object URL.
- Do not move or rename files manually; the database stores the relative key.
- Re-upload the image if the file was deleted outside the application.

### The frontend cannot call the API

Check that:

- The API is running and accepts requests on the URL configured in
  `frontend/.env.local` or the default `http://127.0.0.1:8000`.
- The frontend origin is listed in `CORS_ORIGINS` in `.env`.
- You restart the API after changing `CORS_ORIGINS`.

### `password authentication failed for user "blog_user"`

Reset the role password in `psql`, update the password in `.env`, and remember
to URL-encode reserved characters if present.

### `alembic` cannot connect to the database

Alembic reads the same application settings as the API. Test the configured URL
with `psql`, or run:

```powershell
python -m alembic current
```

### Tests cannot import `app`

Run pytest from the project root with the virtual environment active. The
included `pytest.ini` adds the project root to the test import path.

### Integration tests are skipped

`TEST_DATABASE_URL` is not set. Set it to a dedicated PostgreSQL test database
whose name contains `test`.

## Security notes

- Passwords are hashed with Argon2id and never returned by the API.
- JWT secrets and database credentials come from environment variables.
- Tokens include `sub`, `type`, `iat`, and `exp`; signature, expiration, subject,
  and token type are validated.
- Protected writes require an active authenticated user.
- Ownership is verified on every update and delete.
- Request schemas forbid undeclared fields, preventing client-supplied
  `author_id` or other privileged values.
- Uploaded images, including profile pictures, are validated from their actual
  bytes, not their filename or client content type.
- Uploaded files receive server-generated UUID names and are stored only inside
  `UPLOAD_DIR`. Profile pictures live under `UPLOAD_DIR/avatars/`; covers live
  under `UPLOAD_DIR/covers/`.
- Upload serving rejects traversal segments, drive letters, and disallowed
  extensions, and verifies that the resolved file stays inside `UPLOAD_DIR`.
- Remote image URLs are not accepted for new posts, so the backend never fetches
  user-supplied URLs.
- Validation errors do not echo request values.
- Unexpected exceptions return generic messages; details stay in server logs.
- Database foreign keys enforce cascade or restrict behavior independently of
  application code. SQLite test connections explicitly enable foreign keys.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`) are added to responses.

This project does not include rate limiting, refresh-token rotation, token
revocation, email verification, draft/private posts, or deployment/TLS
configuration. All posts are public. Add the relevant controls before exposing a
public production deployment.

## Known limitations

- PostgreSQL integration tests are opt-in and are skipped unless
  `TEST_DATABASE_URL` points at a dedicated test database.
- Uploaded images are stored on local disk. There is no object-storage/CDN
  integration or automatic orphan-file cleanup job.
- The frontend uses route-level code splitting; the main production chunk is
  below Vite's 500 kB warning threshold. Markdown rendering is a separate lazy
  chunk. A full accessibility (WCAG) audit is not included.
- Browser E2E is checked in and passes locally, but it requires a running backend
  and frontend. It is not executed in CI.
- Rate limiting, refresh-token rotation, token revocation, email verification,
  draft/private posts, and deployment/TLS configuration are out of scope; see
  [Security notes](#security-notes).
- The configured local PostgreSQL `5432` credential now authenticates and the
  application health check returns `200`. PostgreSQL integration tests still use
  a disposable test database so they never truncate application data.
- No GitHub remote or push has been configured. The repository is prepared
  locally and is GitHub-ready; publishing requires an explicit remote URL and
  authorization.

## License

MIT. See [LICENSE](LICENSE).
