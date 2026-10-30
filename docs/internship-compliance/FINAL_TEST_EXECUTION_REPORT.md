# ANVIKSHA - Final Test Execution Report

**Date:** 2026-10-30  
**Platform:** Windows 11, PowerShell  
**Python:** 3.14.7  
**Node.js:** 24.20.0  
**npm:** 11.19.0  
**PostgreSQL:** 18.6  
**Verification database:** disposable cluster on `127.0.0.1:55432`  
**Overall functional test verdict:** **PASS**  
**Configured local database gate:** **BLOCKED**

## 1. Summary

| Test gate | Result | Status |
|---|---|---|
| Backend default suite | `175 passed, 1 skipped in 24.15s` | **PASS** |
| PostgreSQL integration selection | `4 passed, 175 deselected in 1.72s` | **PASS** |
| Complete backend suite with PostgreSQL | `179 passed in 25.53s` | **PASS** |
| Live PostgreSQL HTTP E2E | `49/49 checks passed` | **PASS** |
| Restart persistence | create and verify both pass | **PASS** |
| Alembic upgrade/current/check | head `0005_user_avatar`; no drift | **PASS** |
| `pip check` | no broken requirements | **PASS** |
| Fresh virtual environment install | install, import, and `pip check` pass | **PASS** |
| Python compileall | exit 0 | **PASS** |
| Frontend typecheck | exit 0 | **PASS** |
| Frontend unit tests | `47 passed` in 11 files | **PASS** |
| Frontend lint | 25 warnings, 0 errors | **PASS** |
| Frontend production build | PASS; main chunk 299.47 kB | **PASS** |
| Browser E2E (Playwright) | `2 passed (13.9s)` | **PASS** |
| Existing `.env` database connection | SQLAlchemy `OperationalError`; health 503 | **BLOCKED** |
| GitHub remote/push | none configured | **BLOCKED** |

## 2. Backend default suite

Command:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Output:

```text
175 passed, 1 skipped in 24.15s
```

The skip is:

```text
tests/integration/test_postgres_integration.py:40:
TEST_DATABASE_URL is not set; PostgreSQL integration tests skipped.
```

The default suite uses an isolated in-memory SQLite database and an overridden
database dependency. SQLite foreign-key enforcement is explicitly enabled.

## 3. PostgreSQL integration selection

Command:

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://blog_user:<test-password>@127.0.0.1:55432/anviksha_test"
$env:DATABASE_URL = "postgresql+psycopg://blog_user:<test-password>@127.0.0.1:55432/anviksha_dev"
$env:ENVIRONMENT = "test"
.\.venv\Scripts\python.exe -m pytest -q -m integration
```

Output:

```text
4 passed, 175 deselected in 1.72s
```

The integration fixture applies real Alembic migrations, refuses a database name
without `test`, truncates only the dedicated test tables, and downgrades its test
schema.

## 4. Complete backend suite with PostgreSQL

Output:

```text
179 passed in 25.53s
```

This is 175 default tests plus 4 real PostgreSQL integration tests.

## 5. Alembic verification

Commands:

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic check
```

Output:

```text
0005_user_avatar (head)
No new upgrade operations detected.
```

The migration chain was applied from an empty disposable database:

```text
0001_initial
0002_post_cover_image
0003_post_cover_image_path
0004_engagement_profiles
0005_user_avatar
```

No existing database was reset or dropped.

## 6. Live PostgreSQL API E2E

Script: `scripts/e2e_postgres.py`

Output:

```text
49/49 checks passed
```

The script performs real HTTP requests against Uvicorn, uses real JWTs, creates
two users, exercises post/comment CRUD, checks ownership failures, uploads real
image bytes, verifies static serving, checks private library isolation, and
queries PostgreSQL directly. It redacts tokens and passwords in its results.

## 7. Restart persistence

Script: `scripts/restart_persistence.py`

Output:

```text
restart_create=PASS
restart_verify=PASS
```

A post and its uploaded cover image were created, the API process was stopped
and restarted, and both were read back successfully.

## 8. Dependency and installation checks

```powershell
python -m pip check
python -m compileall -q app tests
```

Output:

```text
No broken requirements found.
compileall: exit 0
```

Fresh environment test:

```text
fresh_install_exit=0
No broken requirements found.
fresh_import=ok
```

The fresh environment was created from `requirements.txt` only. This verifies
that `python-multipart==0.0.32` and all other declared backend dependencies are
sufficient for a clean installation.

## 9. Frontend checks

Commands:

```powershell
cd frontend
npm run typecheck
npm test -- --reporter=dot
npm run lint
npm run build
```

Results:

```text
Typecheck: PASS
Vitest: 47 passed in 11 files, 5.77s
Lint: 25 warnings, 0 errors
Build: PASS
```

The lint warnings are non-blocking React `set-state-in-effect`/style advisories.
They are recorded, not suppressed.

### Production build

Route-level code splitting is implemented in
`frontend/src/routes/AppRouter.tsx`. The build output showed:

```text
Main application chunk: 299.47 kB (gzip 97.90 kB)
Markdown renderer chunk: 238.89 kB (lazy)
No chunk above Vite's 500 kB warning threshold
```

The previous single-chunk warning is resolved.

## 10. Browser E2E

Command:

```powershell
cd frontend
npm run test:e2e
```

Output:

```text
Running 2 tests using 1 worker
✓ reader can register, publish, engage, edit, and sign out
✓ mobile layout has no horizontal overflow
2 passed (13.9s)
```

The browser suite covered:

- Registration.
- Protected editor.
- Real PNG cover upload.
- Publishing.
- Comment creation.
- Like.
- Bookmark.
- Private library.
- Edit and updated title.
- Logout.
- Protected-route redirect.
- Second-user authorization (owner controls absent).
- Mobile overflow on `/`, `/login`, and `/community`.

The backend was running on `http://127.0.0.1:8001` with the disposable
PostgreSQL database; `frontend/.env.local` pointed at that backend. The Vite dev
server was started/reused by Playwright.

## 11. Existing configured database failure

A safe SQLAlchemy connection check using the current `.env` produced:

```text
configured_db_connect=FAIL
exception_class=OperationalError
driver_exception_class=OperationalError
```

A Uvicorn process using the current `.env` returned:

```text
health_status=503
```

This is a credential/environment blocker. It is not a test failure in the API
implementation, but it prevents claiming the current local `.env` is runnable.
No database was reset, dropped, or modified.

## 12. Not executed or not verified

| Item | Status |
|---|---|
| GitHub Actions/CI workflow | **NOT APPLICABLE** - no workflow claimed |
| Production deployment | **NOT VERIFIED** - not performed |
| Docker/Compose | **NOT APPLICABLE** - not included |
| TLS/domain | **NOT VERIFIED** - not performed |
| Load/concurrency testing | **NOT VERIFIED** - no load test |
| WCAG/axe audit | **NOT VERIFIED** - no automated accessibility audit |
| Rate limiting/brute-force test | **NOT APPLICABLE** - control not implemented |
| Existing local `5432` DB run | **BLOCKED** - credential mismatch |
| GitHub remote/push | **BLOCKED** - no remote/authorization |

## 13. Final test verdict

All committed functional test gates pass on the verified environment. The only
failing runtime gate is the pre-existing local PostgreSQL credential, which is
**BLOCKED** pending administrator access. The repository should not be described
as fully submission-ready until that credential is fixed and a GitHub remote is
authorized.
