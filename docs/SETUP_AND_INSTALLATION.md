# ANVIKSHA - Setup and Installation

## Verified environment

| Tool | Verified version |
|---|---|
| Python | 3.14.7 (project requires 3.12+) |
| Node.js | 24.20.0 (project requires 20.19+, 22.12+, or newer) |
| npm | 11.19.0 |
| PostgreSQL | 18.6 (project requires 14+) |
| Operating system | Windows 11 / PowerShell |

The exact Python dependencies are pinned in `requirements.txt`; frontend
dependencies are pinned in `frontend/package-lock.json`.

## 1. Clone or open the project

```powershell
Set-Location C:\Users\dalve\OneDrive\Documents\projects\blog-api
```

The project is an independent repository. Do not run commands from the parent
`projects` directory.

## 2. Create the backend environment

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip check
```

`requirements.txt` includes `python-multipart==0.0.32`, which FastAPI needs for
the cover-image and avatar multipart endpoints.

### Fresh installation evidence

A clean temporary virtual environment was created and installed from
`requirements.txt`:

```text
fresh_install_exit=0
No broken requirements found.
fresh_import=ok
```

This confirms the documented manifest is sufficient for a clean backend
installation, including the multipart upload dependency.

## 3. Prepare PostgreSQL

The application does not create or drop databases automatically. Run these
steps once as a PostgreSQL administrator.

Open `psql`:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost
```

Replace the password with a strong local password, then run:

```sql
CREATE ROLE blog_user WITH LOGIN PASSWORD 'replace_with_a_strong_database_password';
CREATE DATABASE blog_api_db OWNER blog_user;
CREATE DATABASE blog_api_test OWNER blog_user;
```

If the role already exists, update its password instead:

```sql
ALTER ROLE blog_user WITH LOGIN PASSWORD 'replace_with_a_strong_database_password';
```

Verify the application connection:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U blog_user -h localhost -d blog_api_db -c "SELECT current_database();"
```

`blog_api_test` is reserved for the opt-in integration suite. The integration
fixture refuses to run unless the database name contains `test`, applies the
real migrations, and truncates only its dedicated tables.

### Existing local PostgreSQL status

The configured PostgreSQL 18 service on port `5432` now authenticates with the
`blog_user` role. The application `.env` was updated and verified without
resetting, dropping, or recreating the database:

```text
alembic current: 0005_user_avatar (head)
alembic check:   No new upgrade operations detected.
/health:         200, "database": "reachable"
```

If the credential is ever rotated again, update the password in `.env` and
URL-encode reserved characters such as `@` as `%40`. Do not delete or recreate
the database. Use a separate disposable PostgreSQL cluster for integration
tests so application data is never truncated.

## 4. Configure environment variables

Copy the safe template:

```powershell
Copy-Item .env.example .env
```

Generate a JWT secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Edit `.env`:

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

Important:

- `.env` is gitignored. Never commit real credentials.
- Use `postgresql+psycopg://`; plain `postgresql://` and `postgres://` are
  normalized by the application.
- `JWT_SECRET_KEY` must be at least 32 characters.
- `UPLOAD_DIR` is relative to the project root unless absolute.
- SQLite is accepted only when `ENVIRONMENT=test`.
- Production rejects placeholder JWT secrets and SQLite.

## 5. Apply migrations

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic check
```

Expected current revision:

```text
0005_user_avatar (head)
```

`alembic check` should print:

```text
No new upgrade operations detected.
```

If it reports drift, create a new additive migration rather than resetting the
database:

```powershell
python -m alembic revision --autogenerate -m "describe the change"
python -m alembic upgrade head
```

## 6. Run the backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expected:

```json
{
  "status": "healthy",
  "database": "reachable",
  "service": "anviksha-api",
  "project_id": "ANVIKSHA"
}
```

Interactive documentation:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## 7. Install and run the frontend

```powershell
Set-Location frontend
npm ci
npm run dev
```

The checked-in local example `frontend/.env.example` uses:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_MAX_UPLOAD_MB=5
```

The developer's local `frontend/.env.local` may point at a different backend
port; it is gitignored. Keep `VITE_MAX_UPLOAD_MB` aligned with the backend
`UPLOAD_MAX_SIZE_MB`.

Open `http://127.0.0.1:5173`.

## 8. Run the backend tests

Default isolated suite:

```powershell
Set-Location ..
python -m pytest -q
```

Expected current result:

```text
175 passed, 1 skipped
```

The skip is the PostgreSQL integration module when `TEST_DATABASE_URL` is not
set.

PostgreSQL integration suite:

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://blog_user:YOUR_DATABASE_PASSWORD@localhost:5432/blog_api_test"
python -m pytest -m integration -q
python -m pytest -q
```

Expected with PostgreSQL:

```text
4 passed, 175 deselected
179 passed
```

The integration database must be dedicated to tests and its name must contain
`test`.

## 9. Run the frontend checks

```powershell
Set-Location frontend
npm run typecheck
npm test
npm run lint
npm run build
```

Expected current result:

```text
Typecheck: PASS
Vitest: 47 passed in 11 files
Lint: 25 warnings, 0 errors
Build: PASS
```

The production build now uses route-level code splitting. The main application
chunk is below Vite's 500 kB warning threshold; Markdown rendering is a separate
lazy chunk.

## 10. Run browser E2E tests

The Playwright suite is in `frontend/e2e/`. It expects:

- A running backend at the URL in `frontend/.env.local` (default example:
  `http://127.0.0.1:8000`).
- A reachable database configured for that backend.
- The frontend dev server; Playwright can start it automatically.

Install browsers once:

```powershell
cd frontend
npx playwright install chromium
```

Run:

```powershell
npm run test:e2e
```

The suite covers registration, cover upload, publishing, commenting, liking,
bookmarking, the private library, editing, logout, protected-route redirects,
second-user authorization checks, and mobile horizontal overflow.

## 11. Optional live PostgreSQL E2E scripts

`scripts/e2e_postgres.py` and `scripts/restart_persistence.py` are optional
evidence scripts that run against an already-running API. They require:

```powershell
$env:E2E_BASE_URL = "http://127.0.0.1:8000"
$env:E2E_DATABASE_URL = "postgresql+psycopg://blog_user:YOUR_PASSWORD@localhost:5432/blog_api_test"
$env:E2E_JWT_SECRET = "the-same-jwt-secret-the-api-is-using"
$env:E2E_UPLOAD_DIR = "C:\path\to\the\api\uploads"
$env:E2E_RESULTS = "C:\path\to\e2e-results.json"
python scripts/e2e_postgres.py
```

Use a disposable test database and test upload directory for repeat runs. Do not
point these scripts at production data. The final verification used the
configured local `blog_api_db` (which was empty), then removed the generated test
users. The scripts write sanitized evidence only; they do not persist tokens or
passwords.

## Troubleshooting

### `psql` is not recognized

Use the full path:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

### `password authentication failed for user "blog_user"`

The role exists but the password in `.env` does not match the server. Ask the
PostgreSQL administrator to reset the role password, then update `.env`. Do not
change `pg_hba.conf` or disable authentication as a workaround.

### `/health` returns 503

The API is running but cannot query the database. Check the service, role,
database name, password, port, and migrations.

### Uploads return 413, 415, or 422

- 413: file exceeds `UPLOAD_MAX_SIZE_MB`.
- 415: bytes are not a valid JPEG/PNG/WebP image.
- 422: empty/malformed image or dimensions exceed
  `UPLOAD_MAX_IMAGE_PIXELS`.

### Integration tests are skipped

`TEST_DATABASE_URL` is not set. Set it to a dedicated test database whose name
contains `test`.

### Browser E2E fails to connect

Confirm the backend is running at the URL in `frontend/.env.local`, CORS
includes the frontend origin, and the backend database is reachable.
