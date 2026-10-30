> **Historical document - superseded by final verification.**
> This file records an earlier audit pass and may contain stale counts or findings.
> The authoritative current status is in
> docs/internship-compliance/FINAL_INTERNSHIP_COMPLIANCE_REPORT.md,
> FINAL_API_VERIFICATION_REPORT.md, FINAL_TEST_EXECUTION_REPORT.md, and
> FINAL_SUBMISSION_CHECKLIST.md. Current code/API tests pass on the verified
> disposable PostgreSQL environment; the existing local `5432` credentials and
> GitHub remote/push remain blockers.
# Test Execution Report — ANVIKSHA

**Audit date:** 2026-10-30  
**Scope:** Backend unit and integration tests, isolated live API workflow, migration-created schema workflow, and supplementary frontend tests.  
**Rule:** Results in this report were produced during this audit; prior test claims were not accepted as evidence. No application source was modified, and no production data was used.

---

## 1. Environment

| Item | Value |
|---|---|
| Operating system | Windows (PowerShell) |
| Python | 3.14.7 |
| Pytest | 9.1.1 |
| FastAPI | 0.161.1 |
| SQLAlchemy | 2.1.6 |
| Alembic | 1.20.1 |
| Psycopg | 3.3.6 |
| PyJWT | 2.15.1 |
| pwdlib | 0.3.1 |
| httpx2 | 2.16.0 |
| PostgreSQL service | PostgreSQL 18 service running; port 5432 listening |
| PostgreSQL application access | **Authentication failed**; no safe schema/runtime access |
| Test database for default suite | In-memory SQLite, isolated per test |
| Live E2E database | Temporary SQLite files outside the repository |
| Production database | Not read, modified, reset, or dropped |

---

## 2. Executed Commands and Results

| # | Command | Result | Status |
|---:|---|---|---|
| 1 | `python -m pytest -q` | **173 passed, 1 skipped in 52.48s** | **PASS** |
| 2 | `python -m pytest -q -m integration` | **1 skipped, 173 deselected in 0.17s**; skip reason: `TEST_DATABASE_URL is not set; PostgreSQL integration tests skipped.` | **BLOCKED** |
| 3 | `python -m pytest --collect-only -q` | **173 tests collected in 0.17s**; integration module reported as skipped | **PASS** |
| 4 | `python -m pip check` | **No broken requirements found.** | **PASS** |
| 5 | `alembic upgrade head` on a fresh isolated SQLite database | Exit 0; reached `0005_user_avatar` | **PASS** |
| 6 | Live E2E on `Base.metadata.create_all()` SQLite schema | **81/81 request checks; 44/44 assertions; 0 failures** | **PASS** |
| 7 | Live E2E on Alembic-migrated SQLite schema | **81/81 request checks; 44/44 assertions; 0 failures** | **PASS** |
| 8 | Frontend `npm test -- --reporter=dot` | **47 passed in 11 files in 4.94s** | **PASS** |
| 9 | Read-only PostgreSQL connection attempt | **Failed authentication** (`OperationalError`); sanitized; no credentials printed | **BLOCKED** |
| 10 | PostgreSQL-backed API `/health` | **503** | **BLOCKED** |
| 11 | `alembic check` against PostgreSQL | Not run; requires reachable database | **BLOCKED** |

### Note on command 2

`pytest -m integration` exits with a non-zero code because the only selected module is skipped and no integration test executes. This is a test-selection/skip result, not a code failure. The reason is explicit: `TEST_DATABASE_URL` is not set.

---

## 3. Backend Test Inventory

The repository contains **135 test functions**: 131 in the default suite plus 4 opt-in PostgreSQL integration tests. Parameterization expands the collected default-suite total to **173 tests**. The modules below were all inspected; command 1 executed the 131 default-suite functions, while the integration module skipped at import, so its four tests did not execute.

| Test module | Test functions | Main coverage |
|---|---:|---|
| `tests/test_auth.py` | 17 | Registration, duplicate handling, login, current user, malformed/expired/forged tokens, inactive users |
| `tests/test_posts.py` | 32 | Post CRUD, validation, ownership, pagination, timestamps, filtering, errors |
| `tests/test_comments.py` | 22 | Comment CRUD, filtering, ownership, validation, cascade |
| `tests/test_security.py` | 9 | Argon2id hashing, password verification, JWT roundtrip/expiry/type/signature |
| `tests/test_schemas.py` | 12 | Pydantic request/response validation and normalization |
| `tests/test_health_docs.py` | 6 | Health endpoint, OpenAPI, docs, security headers |
| `tests/test_migrations.py` | 2 | Additive migration behavior, legacy cover backfill, downgrade |
| `tests/test_uploads.py` | 11 | Optional upload features and dependency-sensitive multipart behavior |
| `tests/test_engagement.py` | 7 | Optional likes/bookmarks/feed features |
| `tests/test_profiles.py` | 4 | Optional profile updates |
| `tests/test_avatars.py` | 6 | Optional avatar upload/removal |
| `tests/test_cors.py` | 2 | CORS behavior |
| `tests/test_db_session.py` | 1 | Database session lifecycle |
| `tests/integration/test_postgres_integration.py` | 4 | PostgreSQL workflow, timestamps, cascade, restrict, ownership |

The four PostgreSQL integration tests were **not executed** in this audit. Their module is skipped at import time when `TEST_DATABASE_URL` is absent.

---

## 4. Test Isolation and Safety

### Default suite

`tests/conftest.py` sets test-only environment variables before importing application modules:

- `ENVIRONMENT=test`
- `DATABASE_URL=sqlite://`
- A test-only JWT secret
- `ACCESS_TOKEN_EXPIRATION=30` minutes

The fixture creates an in-memory SQLite database using `StaticPool`, enables SQLite foreign-key enforcement, creates the schema per test, and drops it afterward. The FastAPI `get_db` dependency is overridden to use the test session. Tests therefore do not touch the configured PostgreSQL database or any production data.

### PostgreSQL integration suite

`tests/integration/test_postgres_integration.py` is intentionally opt-in and has multiple safety checks:

1. It skips unless `TEST_DATABASE_URL` is set.
2. It accepts only the `postgresql+psycopg` dialect.
3. It refuses to run unless the database name contains `test`.
4. It drops and recreates tables only inside that dedicated test database.
5. It runs the real Alembic upgrade to head, and downgrades to base in the fixture teardown.
6. It truncates `comments`, `posts`, and `users` before each test.

Those protections were inspected but not executed because no PostgreSQL test URL was available. No reset/drop was attempted against the application database.

---

## 5. Live E2E Execution Details

### Schema A — ORM-created SQLite

- Fresh temporary SQLite file.
- Schema created with `Base.metadata.create_all()`.
- API started on a separate loopback port.
- Two generated test users.
- Full workflow: registration, duplicate handling, login, JWT validation, post CRUD, comment CRUD, ownership, validation, pagination, cascade deletion.
- Result: **81/81 request checks and 44/44 assertions passed**.

### Schema B — Alembic-created SQLite

- Fresh temporary SQLite file.
- `alembic upgrade head` reached `0005_user_avatar`.
- API started on a second loopback port.
- Same full workflow and assertions.
- Result: **81/81 request checks and 44/44 assertions passed**.

This second run is important because it verifies that the migration-created schema, not only the ORM metadata schema, supports the required API behavior. It still does **not** verify PostgreSQL.

## 6. PostgreSQL Test Result — BLOCKED

### What was attempted

- Confirmed the PostgreSQL 18 service is running and port 5432 is listening.
- Attempted a read-only SQLAlchemy connection to the configured application database with a short connect timeout.
- Requested the live PostgreSQL-backed API health endpoint.

### What happened

- The connection failed with an authentication error (`OperationalError`).
- The live PostgreSQL-backed API returned `503` from `/health`.
- `TEST_DATABASE_URL` was not set.
- `pytest -m integration` therefore selected no runnable PostgreSQL tests.
- No credentials, host details, or database contents are reproduced in this report.
- No reset, drop, truncate, migration, or write was attempted against the application database.

### What remains unverified

- Actual PostgreSQL schema creation via Alembic.
- PostgreSQL row persistence and transaction behavior.
- PostgreSQL `timestamptz` handling and timezone-aware timestamps.
- PostgreSQL foreign-key `CASCADE`/`RESTRICT` behavior.
- PostgreSQL unique constraints and check constraints.
- PostgreSQL integration test execution.
- `alembic check` model/migration drift.
- End-to-end API workflow against PostgreSQL.

**Status:** **BLOCKED**. SQLite results must not be presented as PostgreSQL evidence.

---

## 7. Migration Test Result

| Check | Result | Status |
|---|---|---|
| Alembic revision chain present | `0001_initial` → `0002_post_cover_image` → `0003_post_cover_image_path` → `0004_engagement_profiles` → `0005_user_avatar` | **PASS** |
| Clean SQLite upgrade | Exit 0; reached `0005_user_avatar` | **PASS** |
| Additive migration/backfill tests | `tests/test_migrations.py` passed as part of the 173 | **PASS** |
| Downgrade test | Covered by `tests/test_migrations.py` | **PASS** |
| PostgreSQL upgrade/downgrade | Not executed | **BLOCKED** |
| `alembic check` drift | Not executed | **BLOCKED** |

The migration-created SQLite schema passed the full live workflow, which is useful supporting evidence. It does not prove that the same migrations succeed on PostgreSQL.

---

## 8. Supplementary Frontend Test Result

The assignment is backend-focused, so frontend tests were not used as proof of API compliance. They were run only to check the repository's own documentation claim.

| Command | Result | Treatment |
|---|---|---|
| `npm test -- --reporter=dot` in `frontend/` | **47 tests passed in 11 files** in 4.94s | Supplementary; not counted as backend compliance |

The frontend test result does not affect the backend verdict. No frontend-only behavior was accepted as evidence for registration, authentication, post CRUD, comment CRUD, authorization, or persistence.

---

## 9. Requirement-to-Test Mapping

| Assignment area | Test evidence | Result |
|---|---|---|
| User registration | `tests/test_auth.py`; live E2E registration/duplicate cases | **PASS** |
| Login/JWT | `tests/test_auth.py`, `tests/test_security.py`; live login/token cases | **PASS** |
| Password hashing | `tests/test_security.py`; live Argon2id DB check | **PASS** |
| Post CRUD | `tests/test_posts.py`; live E2E post workflow | **PASS** |
| Comment CRUD | `tests/test_comments.py`; live E2E comment workflow | **PASS** |
| Authorization | Auth/post/comment tests; live 401/403 cases | **PASS** |
| Validation/errors | Schema/auth/post/comment tests; live 422/404/409 cases | **PARTIAL**; 500 **NOT VERIFIED** |
| Database schema | Migration tests; SQLite PRAGMA checks; clean SQLite upgrade | **PARTIAL**; PostgreSQL **BLOCKED** |
| PostgreSQL integration | `tests/integration/test_postgres_integration.py` | **BLOCKED** |
| API documentation | `tests/test_health_docs.py`; live OpenAPI/docs checks | **PASS** |

---

## 10. Reproducing the Audit

### Default backend suite

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Expected current result: `173 passed, 1 skipped` with the PostgreSQL skip reason. The skip is not a pass.

### PostgreSQL integration suite

Use a dedicated PostgreSQL database whose name contains `test`; never use the application database:

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://<test_user>:<test_password>@localhost:5432/blog_api_test"
.\.venv\Scripts\python.exe -m pytest -q -m integration
```

Expected after a successful setup: 4 PostgreSQL integration tests pass, and the full suite has no PostgreSQL skip.

### Live isolated workflow

The audit used a temporary SQLite file and a separate Uvicorn process. To reproduce safely:

1. Set `ENVIRONMENT=test`, a test-only `DATABASE_URL` pointing at a temporary SQLite file, a test-only `JWT_SECRET_KEY`, and a temporary `UPLOAD_DIR`.
2. Create the schema with `Base.metadata.create_all()` or run `alembic upgrade head` against the temporary database.
3. Start Uvicorn on an unused loopback port.
4. Run the registration/login/post/comment workflow.
5. Query the temporary database directly to verify rows.
6. Stop the API process and delete only the temporary audit files.

Do not point this workflow at the production database.

### Dependency check

```powershell
.\.venv\Scripts\python.exe -m pip check
```

Current result: `No broken requirements found.` This does not prove that a fresh install is complete; see the dependency finding below.

---

## 11. Test Limitations and Findings

- **PostgreSQL tests did not run.** This is the largest test-evidence gap.
- **SQLite is not PostgreSQL.** SQLite verifies behavior and persistence in a real SQL database, but not PostgreSQL-specific types, constraints, timezone handling, or transaction behavior.
- **The generic 500 path was not induced.** It remains **NOT VERIFIED**.
- **No 400 path was observed.** Validation consistently used 422; this is not treated as a failure.
- **`python-multipart` is installed but not pinned in `requirements.txt`.** The current virtual environment passes upload tests, but a fresh install from the documented requirements may fail on upload endpoints. This does not affect the core assignment endpoints, but it is a setup/submission gap.
- **No production data was touched.** The default suite uses in-memory SQLite; the live workflow used temporary SQLite files; PostgreSQL was not modified.
- **No tests were weakened or deleted** during the audit.
- **No source files were modified** during the audit.

---

## 12. Test Execution Conclusion

| Area | Result |
|---|---|
| Backend unit/integration suite | **173 passed, 1 skipped** |
| Default-suite failures | **0** |
| Live API workflow | **81/81 requests, 44/44 assertions** on two SQLite schemas |
| PostgreSQL integration tests | **BLOCKED** |
| PostgreSQL runtime | **BLOCKED** |
| Frontend tests (supplementary) | **47 passed in 11 files** |
| Generic 500 behavior | **NOT VERIFIED** |

The executed evidence is strong for the core API on SQLite. It is not sufficient to claim full PostgreSQL compliance. The final audit verdict is therefore **MOSTLY COMPLIANT**, with PostgreSQL and GitHub submission as the decisive remaining gaps.

