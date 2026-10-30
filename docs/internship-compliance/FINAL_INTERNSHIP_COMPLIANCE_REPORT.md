# ANVIKSHA - Final Internship Compliance Report

**Report date:** 2026-10-30  
**Assignment:** InnoByte Services - Full Stack Developer Intern - RESTful Blog
Application API  
**Project:** ANVIKSHA - Knowledge Platform for Curious Minds  
**Report status:** Final verification report. Supersedes the four historical
audit files in this directory.

## 1. Verdict

# ANVIKSHA - NOT YET FULLY SUBMISSION READY

The application code, database migrations, automated tests, API documentation,
frontend build, and browser E2E suite are implemented and verified. The
repository is prepared as an independent local Git repository. However, two
external/local blockers remain:

1. The existing local PostgreSQL service on `5432` rejects the configured
   `blog_user` credentials. The application `.env` therefore produces a `503`
   health response. Resetting the role requires the PostgreSQL administrator
   password, which was not available.
2. No GitHub remote is configured and no push authorization has been given. The
   repository is local-only.

Until those are resolved, the correct submission status is **not fully
submission ready**, even though the API itself passes its functional gates.

## 2. Scope and method

- Source was inspected and modified only where a verified defect or mandatory
  gap existed.
- Existing databases were not reset, dropped, or truncated. The pre-existing
  `5432` cluster was left untouched.
- PostgreSQL verification used a disposable PostgreSQL 18 cluster on
  `127.0.0.1:55432`, with separate `anviksha_dev` and `anviksha_test` databases.
- Verification used real HTTP requests, real PostgreSQL queries, real image
  bytes, real browser automation, and process restarts.
- No commit or push was made to a public remote.
- Secrets, JWTs, database passwords, `.env` contents, and user data are not
  included in this report.

## 3. Requirement scorecard

Status vocabulary: **PASS**, **PARTIAL**, **FAIL**, **BLOCKED**,
**NOT VERIFIED**, **NOT APPLICABLE**.

| Requirement | Status | Evidence |
|---|---|---|
| RESTful API implemented | **PASS** | 18 paths / 29 operations in generated OpenAPI; FastAPI routers |
| PostgreSQL database schema | **PASS** | SQLAlchemy models, 5 additive Alembic revisions |
| Database setup documented | **PASS** | README and `docs/SETUP_AND_INSTALLATION.md` |
| Migrations from empty database | **PASS** | `0001` -> `0005` on PostgreSQL 18; `alembic current` at head |
| Migration drift check | **PASS** | `alembic check`: No new upgrade operations detected |
| User registration | **PASS** | API tests and live PostgreSQL E2E |
| Login and JWT issuance | **PASS** | API tests, live E2E, browser E2E |
| Password hashing | **PASS** | Argon2id helper and auth tests |
| JWT validation | **PASS** | Expired, forged, malformed, missing, wrong-type tests |
| Authentication required for writes | **PASS** | 401 tests for post/comment/upload/profile writes |
| Ownership authorization | **PASS** | Two-user 403 tests and live PostgreSQL E2E |
| Post CRUD | **PASS** | Create/read/list/update/delete tests and live E2E |
| Comment CRUD | **PASS** | Create/list/read/update/delete tests and live E2E |
| Validation | **PASS** | Pydantic schemas, unknown-field rejection, bounds/blank checks |
| Error handling | **PASS** | 400/401/403/404/409/413/415/422/500/503 coverage |
| Generic 500 handling | **PASS** | `tests/test_error_handling.py`; no stack/SQL leakage |
| File uploads | **PASS** | Real PNG/JPEG/WebP, size/type/dimension, traversal tests |
| API documentation | **PASS** | `/docs`, `/redoc`, `/openapi.json`, `docs/API_DOCUMENTATION.md` |
| README | **PASS** | Setup, API, security, testing, limitations updated |
| Backend default tests | **PASS** | `175 passed, 1 skipped` |
| PostgreSQL integration tests | **PASS** | `4 passed, 175 deselected` |
| Full suite with PostgreSQL | **PASS** | `179 passed` |
| Live PostgreSQL API E2E | **PASS** | `49/49` checks |
| Restart persistence | **PASS** | Post and cover image survived API restart |
| Frontend typecheck | **PASS** | exit code 0 |
| Frontend unit tests | **PASS** | `47 passed` in 11 files |
| Frontend lint | **PASS** | 25 warnings, 0 errors |
| Frontend production build | **PASS** | route-level code splitting; main chunk 299.47 kB |
| Browser E2E | **PASS** | Playwright `2 passed`; desktop journey and mobile overflow |
| Security baseline | **PARTIAL** | Core auth/ownership/upload/error controls pass; rate limiting, TLS, revocation, CSP not implemented |
| Existing local `5432` runtime | **BLOCKED** | Configured `blog_user` auth fails; health 503; no admin reset authorization |
| Independent local Git repository | **PASS** | Initialized in `blog-api`; local commit `a24a535`; staged-file audit documented in the checklist |
| GitHub remote/push | **BLOCKED** | No remote, no push authorization |
| Deployment | **NOT APPLICABLE** | Not required for the internship API assignment; deployment guide is documentation only and not executed |
| CI/CD pipeline | **NOT APPLICABLE** | No CI workflow is included or claimed |

## 4. Work completed in this pass

### Functional and test fixes

- Added `python-multipart==0.0.32` to `requirements.txt`, fixing multipart
  upload startup/runtime dependency risk.
- Added `tests/test_error_handling.py` covering unexpected exceptions and
  database errors as sanitized generic 500 responses.
- Verified the full suite against real PostgreSQL, not only SQLite.
- Verified Alembic from an empty database, at head, with no drift.
- Verified real image upload and static serving against PostgreSQL.
- Verified two-user ownership and authorization with real JWTs.
- Verified restart persistence for a post and its cover image.
- Installed the backend in a clean temporary virtual environment from
  `requirements.txt`; `pip check` is clean.

### Frontend and browser verification

- Added route-level `React.lazy`/`Suspense` code splitting in
  `frontend/src/routes/AppRouter.tsx`.
- Confirmed the main production chunk is below Vite's 500 kB warning threshold.
- Added `@playwright/test` 1.63.0, `frontend/playwright.config.ts`, and
  `frontend/e2e/anviksha.spec.ts`.
- Browser E2E passes registration, cover upload, publishing, commenting,
  liking, bookmarking, library, editing, logout, protected-route redirect,
  second-user authorization, and mobile overflow.
- Added Playwright artifacts to `frontend/.gitignore`.

### Documentation

- Created `docs/PROJECT_OVERVIEW.md`.
- Created `docs/ARCHITECTURE.md`.
- Created `docs/DATABASE_SCHEMA.md`.
- Created `docs/SETUP_AND_INSTALLATION.md`.
- Created `docs/API_DOCUMENTATION.md`.
- Created `docs/AUTHENTICATION_AND_SECURITY.md`.
- Created `docs/TESTING_GUIDE.md`.
- Created `docs/DEPLOYMENT_GUIDE.md`.
- Generated `docs/openapi.json` (18 paths / 29 operations).
- Copied reusable live PostgreSQL and restart scripts into `scripts/`.
- Updated README counts, browser E2E status, code-splitting status, and known
  limitations.

## 5. Evidence summary

| Gate | Exact result |
|---|---|
| Default backend suite | `175 passed, 1 skipped in 24.15s` |
| PostgreSQL integration selection | `4 passed, 175 deselected in 1.72s` |
| Full suite with PostgreSQL | `179 passed in 25.53s` |
| Live PostgreSQL API E2E | `49/49 checks passed` |
| Restart persistence | create: PASS; verify: PASS |
| Alembic current | `0005_user_avatar (head)` |
| Alembic check | `No new upgrade operations detected.` |
| `pip check` | `No broken requirements found.` |
| Fresh venv install | install PASS; `pip check` clean; import PASS |
| Frontend typecheck | PASS |
| Frontend unit tests | `47 passed` in 11 files |
| Frontend lint | 25 warnings, 0 errors |
| Frontend build | PASS; main chunk 299.47 kB; no >500 kB warning |
| Browser E2E | `2 passed (13.9s)` |
| OpenAPI | 18 paths / 29 operations |
| Current `.env` database health | `503`; configured `5432` auth fails |
| Project Git remote | none configured |
| Project push | not performed |

## 6. Remaining blockers and exact remediation

### Blocker A - existing local PostgreSQL credentials

Observed safely: the application `.env` points at
`localhost:5432/blog_api_db`, role `blog_user`, and the configured password is
present. A real SQLAlchemy connection attempt raises `OperationalError`; the
application `/health` endpoint returns `503`. No database was changed.

Required remediation, with PostgreSQL administrator access:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost
```

```sql
ALTER ROLE blog_user WITH LOGIN PASSWORD '<new-strong-password>';
```

Then update `.env` with the new password (URL-encode reserved characters such as
`@` as `%40`) and verify:

```powershell
python -m alembic current
Invoke-RestMethod http://127.0.0.1:8000/health
```

Do not drop or recreate the database. If the administrator password is not
available, use a separate disposable cluster for local verification or ask the
PostgreSQL owner to perform the reset. The existing role password should be
rotated because a diagnostic command in the local verification log echoed the
configured URL; the secret was not written to the repository, but rotation is the
safe response to any credential exposure.

### Blocker B - GitHub remote and push

The project has an independent local repository. No remote exists and no push
has been made. Required before public submission:

1. Create an empty GitHub repository owned by the student.
2. Add the remote after reviewing the staged file list:

```powershell
git remote add origin https://github.com/<account>/<repository>.git
git push -u origin main
```

3. Do not push until the owner explicitly authorizes the account, repository
   name, and visibility. Never commit `.env`, uploads, databases, JWTs, or
   passwords.

### Non-blocking limitations

- Browser E2E is local evidence, not a CI job.
- Rate limiting, refresh-token rotation, token revocation, email verification,
  password reset, CSP/HSTS, TLS termination, malware scanning, and
  object-storage/CDN integration are not implemented.
- No production deployment was performed.
- Lint has 25 non-blocking warnings and no errors.

## 7. Final compliance statement

The core internship API requirements are **PASS** on the verified disposable
PostgreSQL environment. The repository is substantially complete and ready for
a local commit. It is **not yet fully submission ready** because the configured
local database cannot authenticate and no GitHub remote/push exists. The
remaining actions require the PostgreSQL administrator password and explicit
GitHub authorization; they cannot be safely invented or bypassed.
