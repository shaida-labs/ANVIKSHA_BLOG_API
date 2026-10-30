> **Historical document - superseded by final verification.**
> This file records an earlier audit pass and may contain stale counts or findings.
> The authoritative current status is in
> docs/internship-compliance/FINAL_INTERNSHIP_COMPLIANCE_REPORT.md,
> FINAL_API_VERIFICATION_REPORT.md, FINAL_TEST_EXECUTION_REPORT.md, and
> FINAL_SUBMISSION_CHECKLIST.md. Current code/API tests pass on the verified
> disposable PostgreSQL environment; the existing local `5432` credentials and
> GitHub remote/push remain blockers.
# Remaining Issues and Action Plan — ANVIKSHA

**Audit date:** 2026-10-30  
**Current verdict:** **MOSTLY COMPLIANT**  
**Purpose:** Prioritized remediation list for the gaps found during the compliance audit.  
**Constraint:** This is a plan only. No application source was modified, no commits or pushes were made, and no database was reset or dropped.

---

## 1. Priority Summary

| Rank | Severity | Issue | Assignment impact |
|---:|---|---|---|
| 1 | Critical | GitHub submission is not prepared | Submission readiness **FAIL** |
| 2 | Critical | PostgreSQL runtime/schema/persistence is unverified | Mandatory database evidence **BLOCKED** |
| 3 | High | PostgreSQL integration tests are skipped | Integration evidence **BLOCKED** |
| 4 | High | `python-multipart` is missing from `requirements.txt` | Fresh-install setup gap for upload extras |
| 5 | Medium | Generic `500` error path is not verified | Error-handling evidence incomplete |
| 6 | Medium | `alembic check` model/migration drift was not run | Schema consistency unverified |
| 7 | Medium | No backend lockfile or dependency hashes | Reproducibility risk |
| 8 | Medium | README lacks a submission/clone verification section | Submission documentation gap |
| 9 | Low | Migration test docstring is inaccurate about SQLite | Maintainer confusion |
| 10 | Low | Mojibake in user-facing metadata | Quality/polish |

Issues 1–4 are the decisive compliance gaps. Issues 5–10 are important follow-up work but do not change the core API verdict.

---

## 2. Top Ten Issues

### Issue 1 — GitHub submission is not prepared

- **Severity:** Critical
- **Exact location:** Repository root; parent `.git`; no project remote
- **Evidence:** `git ls-files -- .` returned **0**; `git remote -v` was empty; `git log -- .` had no project commits; the project directory was entirely untracked (180 entries before these reports were added).
- **Why it fails:** The assignment requires a GitHub repository containing the project, with changes committed and pushed. The source exists on disk but cannot be cloned or reviewed as a submitted repository.
- **Expected behavior:** A project repository with tracked source, tests, documentation, dependency manifests, a `.gitignore`, and a configured GitHub remote; the current changes are committed and pushed.
- **Recommended correction:**
  1. Decide whether `blog-api` should be its own repository or a tracked subdirectory of a dedicated repository.
  2. Ensure `.env`, `.env.*`, `.venv`, `node_modules`, `uploads/*`, local databases, caches, and build output are ignored.
  3. `git add` only intended source, tests, docs, manifests, and safe examples.
  4. Commit with a clear message.
  5. Add the GitHub remote and push.
  6. Do not commit real credentials or local uploads.
- **Verification method:** `git ls-files` contains source files; `git remote -v` is non-empty; `git status --porcelain` is clean; clone the repository into a temporary directory and follow `README.md` setup. Re-run the backend suite from the clone.
- **Audit note:** The audit deliberately did not initialize, commit, or push anything.

---

### Issue 2 — PostgreSQL runtime, schema, and persistence are unverified

- **Severity:** Critical
- **Exact location:** `app/core/config.py`, `app/db/session.py`, `/health`, `alembic/versions/0001_initial_schema.py` through `0005_user_avatar.py`
- **Evidence:** PostgreSQL 18 service was running and port 5432 was listening, but the configured application connection failed authentication (`OperationalError`). The PostgreSQL-backed API at port 8000 returned `503` from `/health`. `TEST_DATABASE_URL` was unset. No reset/drop was attempted.
- **Why it fails:** PostgreSQL is the required database. SQLite behavior and migration-created SQLite schema are useful supporting evidence, but they do not prove PostgreSQL schema creation, row persistence, timezone handling, constraints, or Psycopg behavior.
- **Expected behavior:** The application connects to a dedicated PostgreSQL database; `alembic upgrade head` creates the schema; registration, posts, and comments persist; FKs, unique constraints, `CASCADE`, `RESTRICT`, and timezone-aware timestamps behave correctly.
- **Recommended correction:**
  1. Repair the application/test database role and password through the normal PostgreSQL administration process.
  2. Create or use a dedicated test database whose name contains `test`; do not use the application database for destructive tests.
  3. Set `DATABASE_URL` for the application and `TEST_DATABASE_URL` for tests using placeholders or local environment values.
  4. Run `alembic upgrade head` against the test database.
  5. Run the four PostgreSQL integration tests.
  6. Run the two-user E2E workflow against PostgreSQL.
  7. Do not reset or drop an existing production database.
- **Verification method:** `/health` returns `200` with `database: reachable`; `alembic current` reports `0005_user_avatar`; `pytest -m integration -q` reports 4 passed; direct SQL queries show persisted users/posts/comments; cascade and restrict tests pass.
- **Status:** **BLOCKED**, not failed. The code is PostgreSQL-targeted, but runtime evidence is absent.

---

### Issue 3 — PostgreSQL integration tests are skipped

- **Severity:** High
- **Exact location:** `tests/integration/test_postgres_integration.py:40`
- **Evidence:** `pytest -q` reported `173 passed, 1 skipped`; the skip reason was `TEST_DATABASE_URL is not set; PostgreSQL integration tests skipped.` `pytest -q -m integration` reported `1 skipped, 173 deselected`.
- **Why it fails:** The assignment requires actual integration test evidence. The tests exist and have good safety guards, but they did not execute.
- **Expected behavior:** The four PostgreSQL tests execute against a dedicated test database and pass: full workflow with timezone-aware timestamps, cascade deletion of comments, restriction on deleting a user with content, and ownership/auth flow.
- **Recommended correction:** Configure `TEST_DATABASE_URL` to a dedicated PostgreSQL test database, then run:
  ```powershell
  $env:TEST_DATABASE_URL = "postgresql+psycopg://<test_user>:<test_password>@localhost:5432/blog_api_test"
  .\.venv\Scripts\python.exe -m pytest -q -m integration
  .\.venv\Scripts\python.exe -m pytest -q
  ```
- **Verification method:** `pytest -m integration -q` shows 4 passed; the full suite shows no PostgreSQL skip; the test database is dedicated and test-named.
- **Status:** **BLOCKED**.

---

### Issue 4 — `python-multipart` is missing from `requirements.txt`

- **Severity:** High for upload extras; not a core CRUD blocker
- **Exact location:** `requirements.txt`; `app/api/routes/uploads.py`; endpoints `POST /uploads/images`, `POST /users/me/avatar`; `tests/test_uploads.py`
- **Evidence:** `python-multipart==0.0.32` is installed in the current virtual environment and `pip check` passes, but `requirements.txt` has no `python-multipart` pin. FastAPI declares it only under the `standard` extra; the project installs bare `fastapi`, and `uvicorn` does not require it.
- **Why it fails:** A fresh install from the documented `requirements.txt` may not support multipart uploads, so the optional upload features are not reproducible. Core registration/login/post/comment behavior is unaffected.
- **Expected behavior:** A clean install from the documented requirements supports all documented endpoints, including uploads, or the README clearly states that upload dependencies are optional and how to install them.
- **Recommended correction:** Add an explicit pin such as `python-multipart==0.0.32` to `requirements.txt` (or use a documented extra), then verify a fresh virtual environment.
- **Verification method:** Create a fresh virtual environment, install only `requirements.txt`, run `python -m pytest tests/test_uploads.py -q`, and exercise a valid multipart upload. Confirm `pip check` passes.
- **Status:** **PARTIAL**; setup manifest gap.

### Issue 5 — Generic `500` error path is not verified

- **Severity:** Medium
- **Exact location:** `app/main.py` exception handlers; all endpoints
- **Evidence:** The central handlers exist, but this audit did not induce an unexpected server failure. Only expected `4xx` responses and the health `503` were exercised. The generic `500` behavior is therefore **NOT VERIFIED**.
- **Why it fails:** The assignment requires appropriate error handling, including `500` only for unexpected server failures. Code presence is not executed evidence.
- **Expected behavior:** An unexpected exception returns a generic `500` JSON response without stack traces, SQL, credentials, or internal details; details are logged only on the server.
- **Recommended correction:** Add a test that forces an unexpected exception through a dependency override or a test-only route, plus a database-error test for `SQLAlchemyError`. Assert the status, generic body, and absence of internal details.
- **Verification method:** Run the new tests; confirm `500` with a generic `{"detail": ...}` shape; inspect server logs separately; confirm no secrets or traceback in the response.
- **Status:** **NOT VERIFIED**.

---

### Issue 6 — `alembic check` model/migration drift was not run

- **Severity:** Medium
- **Exact location:** `alembic.ini`, `alembic/env.py`, `README.md`
- **Evidence:** `alembic check` requires a reachable database. PostgreSQL authentication failed, so the command was not run. SQLite is not a valid substitute for the PostgreSQL model/migration drift check.
- **Why it fails:** The audit cannot confirm that the SQLAlchemy models and the migration chain agree on PostgreSQL.
- **Expected behavior:** `alembic check` reports no new upgrade operations, or any drift is reviewed and corrected with a migration.
- **Recommended correction:** After PostgreSQL access is restored, run `python -m alembic check` against the dedicated test database. If drift exists, autogenerate a migration, review it manually, and test upgrade/downgrade.
- **Verification method:** `alembic check` exits successfully with no pending operations; a fresh `alembic upgrade head` plus `alembic check` is clean.
- **Status:** **BLOCKED**.

---

### Issue 7 — No backend lockfile or dependency hashes

- **Severity:** Medium (reproducibility)
- **Exact location:** `requirements.txt`
- **Evidence:** Runtime versions are pinned exactly, but there is no backend lockfile with hashes. `frontend/package-lock.json` exists for the frontend. The missing `python-multipart` pin is a separate concrete gap.
- **Why it fails:** Exact top-level pins improve reproducibility, but transitive resolution and hash verification are not locked. This is not a core assignment failure, but it weakens clean-install confidence.
- **Expected behavior:** A documented, reproducible backend install with a lockfile or hash-verified requirements.
- **Recommended correction:** Generate and commit a backend lockfile with hashes (for example with `pip-tools` or `uv`), keep `requirements.txt` as the human-readable source, and document the install command.
- **Verification method:** In a fresh environment, install from the lockfile with hash verification, run `pip check`, and run the full backend suite.
- **Status:** **PARTIAL**.

---

### Issue 8 — README lacks an explicit submission/clone verification section

- **Severity:** Medium (submission documentation)
- **Exact location:** `README.md`
- **Evidence:** The README has strong setup, PostgreSQL, migration, startup, authentication, endpoint, and testing sections, but no section that states the GitHub repository URL and the clone → install → migrate → run → test verification path.
- **Why it fails:** The assignment's final phase is a GitHub submission. A reviewer should be able to clone the repository and follow a documented verification path without guessing.
- **Expected behavior:** A submission section with the real repository URL, prerequisites, clone command, environment setup, migration command, test command, and expected results.
- **Recommended correction:** After Issue 1 is fixed, add a “Submission and clean-clone verification” section to `README.md`. Use the real remote URL; do not invent one.
- **Verification method:** Clone into a temporary directory, follow the section exactly, run the backend tests and a smoke request, and confirm the documented results.
- **Status:** **FAIL** until the remote exists and the section is added and tested.

---

### Issue 9 — Migration test docstring is inaccurate about SQLite

- **Severity:** Low (maintainer documentation)
- **Exact location:** `tests/test_migrations.py` module docstring
- **Evidence:** The docstring says the initial migration uses PostgreSQL `now()` and that SQLite rejects it. In this audit, a clean `alembic upgrade head` on an isolated SQLite database completed through `0005_user_avatar`. The SQLite DDL contains `DEFAULT (now())`; it is still PostgreSQL-oriented, but the blanket claim is not accurate.
- **Why it fails:** It can mislead maintainers about why the test uses a baseline stamp/workaround and about SQLite portability. It is not a user-facing API failure.
- **Expected behavior:** The docstring accurately explains the PostgreSQL-specific default and the SQLite test strategy without claiming SQLite cannot apply the DDL.
- **Recommended correction:** Update the docstring to state that the migration is PostgreSQL-targeted, that SQLite DDL application is not proof of PostgreSQL behavior, and that the test deliberately exercises only the additive/backfill path.
- **Verification method:** Run the clean SQLite migration and the migration tests; confirm the documented behavior matches the commands.
- **Status:** **PARTIAL**
- **Status note:** Documentation accuracy, not a user-facing API failure.

---

### Issue 10 — Mojibake in user-facing metadata

- **Severity:** Low (quality/polish)
- **Exact location:** `app/main.py` OpenAPI contact metadata; `README.md` first heading
- **Evidence:** The text contains a corrupted dash sequence in the OpenAPI contact metadata and the README heading instead of a clean em dash or ASCII hyphen.
- **Why it fails:** It is not a functional compliance failure, but it looks unpolished in Swagger/OpenAPI and the README.
- **Expected behavior:** Correct UTF-8 punctuation or ASCII punctuation that renders consistently.
- **Recommended correction:** Replace the corrupted sequence with `ANVIKSHA — Knowledge...` (UTF-8) or `ANVIKSHA - Knowledge...` (ASCII). Ensure files are saved as UTF-8.
- **Verification method:** Inspect `/openapi.json` contact metadata and render the README; confirm no replacement characters.
- **Status:** **PARTIAL**
- **Status note:** Cosmetic only.

---

## 3. Remediation Plan

### Phase 0 — Preserve safety

- Do not reset or drop the application database.
- Use a dedicated PostgreSQL test database whose name contains `test`.
- Do not commit `.env`, real credentials, JWTs, uploads, local databases, `.venv`, or `node_modules`.
- Do not replace core requirements with optional features.

### Phase 1 — Restore PostgreSQL evidence (Issues 2, 3, 6)

1. Repair PostgreSQL access through the normal administrative process.
2. Create or confirm a dedicated test database.
3. Set `DATABASE_URL` and `TEST_DATABASE_URL` locally; keep secrets out of Git.
4. Run:
   ```powershell
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m alembic current
   .\.venv\Scripts\python.exe -m alembic check
   .\.venv\Scripts\python.exe -m pytest -q -m integration
   .\.venv\Scripts\python.exe -m pytest -q
   ```
5. Run the two-user E2E workflow against PostgreSQL.
6. Verify `/health` returns `200`, rows persist, cascade/restrict rules work, and timestamps are timezone-aware.

**Exit criteria:** no PostgreSQL skip; 4 integration tests pass; `alembic check` clean; PostgreSQL E2E passes.

### Phase 2 — Fix setup reproducibility (Issues 4, 7)

1. Add the missing `python-multipart` pin.
2. Generate a backend lockfile with hashes.
3. Create a fresh virtual environment and install only documented dependencies.
4. Run `pip check`, the full backend suite, and the upload tests.
5. Update `README.md` if any install step changes.

**Exit criteria:** fresh install succeeds; upload endpoints work; no missing dependency error.

### Phase 3 — Complete error-handling evidence (Issue 5)

1. Add a test for unexpected exceptions and database errors.
2. Assert generic `500`, no stack trace, no SQL, no credentials.
3. Run the test suite.

**Exit criteria:** generic 500 behavior is **PASS**, not **NOT VERIFIED**.

### Phase 4 — Prepare GitHub submission (Issues 1, 8)

1. Initialize or select the correct project repository.
2. Confirm `.gitignore` coverage.
3. Track source, tests, docs, manifests, safe examples, and the README.
4. Commit and push to a real GitHub remote.
5. Add the clone/verification section to `README.md`.
6. Clone into a temporary directory and follow the documented steps.
7. Re-run the full backend suite and a smoke request from the clone.

**Exit criteria:** non-empty remote; tracked source; clean status; cloneable; documented setup works.

### Phase 5 — Polish (Issues 9, 10)

1. Correct the migration test docstring.
2. Fix the mojibake in `app/main.py` and `README.md`.
3. Re-run documentation/OpenAPI checks.

**Exit criteria:** no corrupted user-facing text; migration documentation matches observed behavior.

## 4. Final Verification Checklist

Use this checklist after remediation. Every mandatory item must be evidence-backed.

### PostgreSQL

- [ ] PostgreSQL service reachable with the configured application role.
- [ ] Dedicated test database name contains `test`.
- [ ] `alembic upgrade head` succeeds on the test database.
- [ ] `alembic current` reports `0005_user_avatar`.
- [ ] `alembic check` reports no pending model/migration drift.
- [ ] `pytest -m integration -q` reports 4 passed.
- [ ] Full `pytest -q` reports 177 passed and 0 skipped.
- [ ] PostgreSQL E2E: registration, login, post CRUD, comment CRUD, ownership, cascade, persistence.
- [ ] `/health` returns `200` with a reachable database.
- [ ] No production database was reset or dropped.

### Dependencies and setup

- [ ] `requirements.txt` pins every runtime dependency, including `python-multipart`.
- [ ] A backend lockfile or hash-verified install is documented.
- [ ] Fresh virtual environment install succeeds.
- [ ] `pip check` passes.
- [ ] Upload endpoints work in the fresh environment.
- [ ] README commands match the actual setup.

### Error handling

- [ ] Unexpected exception returns generic `500`.
- [ ] Response contains no stack trace, SQL, credentials, or internal paths.
- [ ] Database error path is tested.
- [ ] Validation remains `422` where appropriate; no secret values are echoed.

### GitHub submission

- [ ] Project is tracked in the intended repository.
- [ ] `.gitignore` excludes `.env`, `.env.*`, `.venv`, `node_modules`, uploads, databases, caches, and build output.
- [ ] `git remote -v` shows the real GitHub remote.
- [ ] `git status --porcelain` is clean after commit.
- [ ] Latest commit is pushed.
- [ ] Repository clone succeeds in a temporary directory.
- [ ] Clone setup follows README and passes tests.
- [ ] No credentials or personal data are present in tracked files or history.

### Documentation quality

- [ ] README has a submission/clone verification section.
- [ ] Migration test docstring matches observed SQLite/PostgreSQL behavior.
- [ ] OpenAPI contact and README headings render without mojibake.
- [ ] Swagger UI, ReDoc, and OpenAPI still return `200`.

---

## 5. Exit Criteria for a FULLY COMPLIANT Re-Audit

A re-audit may change the verdict from **MOSTLY COMPLIANT** to **FULLY COMPLIANT** only when all of the following are true:

1. PostgreSQL schema, migrations, persistence, constraints, and timezone behavior are verified with actual PostgreSQL execution.
2. The PostgreSQL integration suite executes and passes; no PostgreSQL skip remains.
3. `alembic check` is clean.
4. The GitHub repository has a real remote, tracked project files, a clean committed state, and a successful clone/setup verification.
5. A fresh install from the documented dependency manifests supports the documented endpoints.
6. The generic `500` path is exercised and safe.
7. No mandatory requirement is **BLOCKED**, **FAIL**, or **NOT VERIFIED**.

If PostgreSQL remains unavailable, the correct verdict remains **BLOCKED** for that category and the overall verdict cannot be **FULLY COMPLIANT**.

---

## 6. What Not to Do

- Do not reset or drop the application database to make tests pass.
- Do not point destructive tests at a database whose name does not contain `test`.
- Do not commit `.env`, real database credentials, JWT secrets, tokens, uploaded files, or local databases.
- Do not claim SQLite results are PostgreSQL results.
- Do not count likes, bookmarks, topics, profiles, uploads, or frontend behavior as substitutes for core post/comment/auth requirements.
- Do not weaken or delete tests to remove the PostgreSQL skip.
- Do not commit or push on the user's behalf without explicit instruction.

---

## 7. Final Note

The core API is credible and behaviorally verified. The remaining work is primarily environment access, submission packaging, dependency completeness, and a small amount of documentation/error-path hardening. The top two actions are: **restore safe PostgreSQL test access** and **put the project in a committed, pushed GitHub repository**. Those two changes have the largest effect on the final compliance verdict.


