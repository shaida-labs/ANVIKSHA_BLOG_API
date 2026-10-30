# ANVIKSHA - Testing Guide

## Verification date

All results below were produced on **2026-10-30** on Windows 11 with Python
3.14.7, Node.js 24.20.0, npm 11.19.0, and PostgreSQL 18.6.

The PostgreSQL verification used a disposable cluster on
`127.0.0.1:55432`. The pre-existing local PostgreSQL service on `5432` was not
reset, dropped, or modified. The application `.env` was not switched to the
disposable cluster.

## Test layers

| Layer | What it proves | Command |
|---|---|---|
| Unit/schema tests | Validation, security helpers, serializers, settings | `python -m pytest -q` |
| API tests with isolated SQLite | HTTP contracts, auth, ownership, uploads, errors | `python -m pytest -q` |
| PostgreSQL integration | Real migrations, constraints, cascades, ownership | `python -m pytest -m integration -q` with `TEST_DATABASE_URL` |
| Live API E2E | Real HTTP requests against PostgreSQL, JWT, uploads, two users | `python scripts/e2e_postgres.py` |
| Restart persistence | Post and cover survive a real API restart | `python scripts/restart_persistence.py create` then `verify` |
| Frontend unit tests | Components, API helpers, validation, routing | `npm test` |
| Browser E2E | Real browser against real API and PostgreSQL | `npm run test:e2e` |
| Build checks | TypeScript, production bundling, code splitting | `npm run typecheck`, `npm run build` |

## Backend test results

### Default isolated suite

```powershell
python -m pytest -q
```

Result:

```text
175 passed, 1 skipped in 24.15s
```

The skipped test is `tests/integration/test_postgres_integration.py` because
`TEST_DATABASE_URL` was not set. The default suite uses an isolated in-memory
SQLite database, overrides the application's database dependency, recreates the
schema for each test, and explicitly enables SQLite foreign-key enforcement.

### PostgreSQL integration selection

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://blog_user:<test-password>@127.0.0.1:55432/anviksha_test"
python -m pytest -m integration -q
```

Result:

```text
4 passed, 175 deselected in 1.72s
```

The integration fixture:

- Refuses to run unless the database name contains `test`.
- Applies the real Alembic migrations.
- Verifies timezone-aware timestamps, constraints, cascade/restrict behavior,
  authentication, and ownership.
- Downgrades its dedicated test schema.

### Complete suite with PostgreSQL

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://blog_user:<test-password>@127.0.0.1:55432/anviksha_test"
$env:DATABASE_URL = "postgresql+psycopg://blog_user:<test-password>@127.0.0.1:55432/anviksha_dev"
$env:ENVIRONMENT = "test"
python -m pytest -q
```

Result:

```text
179 passed in 25.53s
```

This is the authoritative full-suite result: 175 default tests plus 4 real
PostgreSQL integration tests.

### Migration checks

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic check
```

Evidence:

```text
current: 0005_user_avatar (head)
alembic check: No new upgrade operations detected.
```

The migration chain is `0001_initial` -> `0002_post_cover_image` ->
`0003_post_cover_image_path` -> `0004_engagement_profiles` ->
`0005_user_avatar`.

### Dependency and syntax checks

```powershell
python -m pip check
python -m compileall -q app tests
```

Evidence:

```text
No broken requirements found.
compileall: PASS (exit code 0)
```

A clean temporary virtual environment was also installed from
`requirements.txt`:

```text
fresh_install_exit=0
No broken requirements found.
fresh_import=ok
```

This verifies the documented manifest includes `python-multipart==0.0.32` and is
sufficient for a clean backend install.

## Backend test coverage map

| Area | Main test files |
|---|---|
| Authentication/JWT | `tests/test_auth.py`, `tests/test_security.py` |
| Posts and ownership | `tests/test_posts.py`, `tests/test_schemas.py` |
| Comments and ownership | `tests/test_comments.py` |
| Likes/bookmarks/topics | `tests/test_engagement.py` |
| Profiles/avatars | `tests/test_profiles.py`, `tests/test_avatars.py` |
| Uploads/path safety | `tests/test_uploads.py` |
| Error handling | `tests/test_error_handling.py`, `tests/test_health_docs.py` |
| CORS/security headers | `tests/test_cors.py` |
| Database session/migrations | `tests/test_db_session.py`, `tests/test_migrations.py` |
| Real PostgreSQL | `tests/integration/test_postgres_integration.py` |

## Live PostgreSQL E2E

The optional script `scripts/e2e_postgres.py` performs real HTTP requests against
a running API backed by PostgreSQL. It covers:

- Registration and login for two users.
- JWT-protected profile reads.
- Post creation, retrieval, listing, update, and ownership rejection.
- Comment creation, retrieval, update, and ownership rejection.
- Likes, bookmarks, collections, and private-library isolation.
- Real PNG upload, static serving, and invalid-upload rejection.
- Health and OpenAPI availability.
- Database-level checks for persisted rows.
- Generic error behavior.

Result:

```text
49/49 checks passed
```

The script writes sanitized results only. It redacts `access_token`, `password`,
`hashed_password`, and `token` fields. It still uses a disposable test database
and test upload directory; do not point it at production data.

### Running the live E2E script

```powershell
$env:E2E_BASE_URL = "http://127.0.0.1:8001"
$env:E2E_DATABASE_URL = "postgresql+psycopg://blog_user:<test-password>@127.0.0.1:55432/anviksha_test"
$env:E2E_JWT_SECRET = "<the same JWT secret the API process uses>"
$env:E2E_UPLOAD_DIR = "C:\path\to\api\uploads"
$env:E2E_RESULTS = "C:\path\to\e2e-results.json"
python scripts/e2e_postgres.py
```

The API must already be running. The script does not start or stop it.

## Restart persistence

`scripts/restart_persistence.py` creates a post with a real cover upload, writes
a temporary state file, and verifies the post and image after the API process is
restarted.

```powershell
$env:E2E_BASE_URL = "http://127.0.0.1:8001"
$env:E2E_STATE = "C:\path\to\restart-state.json"
python scripts/restart_persistence.py create
# stop and restart the API
python scripts/restart_persistence.py verify
```

Result:

```text
restart_create=PASS
restart_verify=PASS
```

The state file contains a disposable test password; keep it outside the
repository and delete it after verification.

## Frontend unit and build checks

```powershell
cd frontend
npm run typecheck
npm test
npm run lint
npm run build
```

Results:

```text
Typecheck: PASS
Vitest: 47 passed in 11 files
Lint: 25 warnings, 0 errors
Build: PASS
```

The 25 lint warnings are non-blocking React effect warnings in existing pages
(`set-state-in-effect`) and related style advisories. There are no lint errors.
They are recorded as a code-quality follow-up, not hidden.

### Production bundle

Route-level lazy loading is implemented in
`frontend/src/routes/AppRouter.tsx` with `React.lazy` and `Suspense`.

Verified production output:

```text
Main application chunk: 299.47 kB (gzip 97.90 kB)
Markdown renderer chunk: 238.89 kB (lazy)
No chunk exceeds Vite's 500 kB warning threshold.
```

The previous single-chunk warning is resolved.

## Browser E2E with Playwright

Configuration: `frontend/playwright.config.ts`
Spec: `frontend/e2e/anviksha.spec.ts`

The suite expects a running backend at the URL configured in
`frontend/.env.local` and starts/reuses the Vite dev server at
`http://127.0.0.1:5173`.

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

Result:

```text
2 passed (13.9s)
```

Covered journeys:

1. Register a new user in the browser.
2. Open the protected editor.
3. Upload a real PNG cover image.
4. Publish a post.
5. Add a comment.
6. Like the post.
7. Save it to the private library.
8. Open `/library` and see the saved story.
9. Edit the story and verify the updated title.
10. Sign out.
11. Verify a protected route redirects to login.
12. Register a second user and verify owner-only edit/delete controls are absent.
13. Verify mobile layout has no horizontal overflow on `/`, `/login`, and
    `/community`.

For local browser E2E the backend was started on `http://127.0.0.1:8001` with
the disposable PostgreSQL database, and `frontend/.env.local` pointed at that
URL. The `.env.local` file is gitignored.

## What is not covered

- No CI workflow is committed; all results are local execution evidence.
- No load, stress, or concurrency test is committed.
- No automated accessibility audit (axe) is committed; responsive overflow and
  keyboard-usable native controls are exercised by the browser suite.
- No malware scanner is applied to uploads; validation is file-type, dimension,
  and size based.
- No production deployment was performed, so deployment-specific TLS, reverse
  proxy, process supervision, and object-storage behavior are not verified.
- The existing local PostgreSQL `5432` credential blocker prevents running the
  app with the current `.env`; see the final compliance report.

## Acceptance summary

| Gate | Status | Evidence |
|---|---|---|
| Default backend suite | **PASS** | `175 passed, 1 skipped` |
| Full PostgreSQL suite | **PASS** | `179 passed` |
| PostgreSQL integration selection | **PASS** | `4 passed, 175 deselected` |
| Migrations and drift check | **PASS** | head `0005_user_avatar`; no new operations |
| Live PostgreSQL API E2E | **PASS** | `49/49` checks |
| Restart persistence | **PASS** | create and verify both pass |
| Fresh dependency install | **PASS** | clean venv, `pip check` clean |
| Frontend typecheck | **PASS** | exit 0 |
| Frontend unit tests | **PASS** | `47 passed` |
| Frontend lint | **PASS with warnings** | 25 warnings, 0 errors |
| Production build | **PASS** | main chunk below 500 kB |
| Browser E2E | **PASS** | `2 passed` |
| Existing local `5432` database | **BLOCKED** | credential mismatch; no admin reset authorization |
| GitHub push | **BLOCKED** | no remote and no push authorization |
