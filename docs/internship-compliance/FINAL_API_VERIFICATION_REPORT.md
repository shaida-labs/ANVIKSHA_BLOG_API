# ANVIKSHA - Final API Verification Report

**Date:** 2026-10-30  
**API version:** 1.0.0  
**OpenAPI snapshot:** 18 paths / 29 operations  
**Verification database:** disposable PostgreSQL 18.6 on `127.0.0.1:55432`  
**Verified API process:** `http://127.0.0.1:8001` during live E2E  
**Verdict for API implementation:** **PASS**  
**Verdict for the existing configured local database:** **BLOCKED**

## 1. What was verified

The API was exercised through four independent paths:

1. FastAPI `TestClient` API tests with an isolated database.
2. Real PostgreSQL integration tests using the actual Alembic migrations.
3. A live HTTP E2E script against Uvicorn backed by PostgreSQL, including
   database queries and two-user authorization.
4. A real Chromium browser via Playwright against the React frontend and the
   live API.

No endpoint was accepted solely because it appeared in the source. Each core
endpoint has at least one automated request or database assertion.

## 2. Endpoint matrix

| # | Method | Path | Auth | Verified behavior | Status |
|---|---|---|---|---|---|
| 1 | GET | `/` | Public | API metadata | **PASS** |
| 2 | GET | `/health` | Public | 200 when DB reachable; 503 sanitized when not | **PASS** |
| 3 | POST | `/register` | Public | 201; validation, duplicates, password policy | **PASS** |
| 4 | POST | `/login` | Public | 200 JWT; invalid credentials 401; inactive 403 | **PASS** |
| 5 | GET | `/users/me` | Bearer | Current user; missing/expired/forged token rejected | **PASS** |
| 6 | PATCH | `/users/me` | Bearer | Owner-only display name/bio update | **PASS** |
| 7 | POST | `/users/me/avatar` | Bearer | Multipart image validation and replacement | **PASS** |
| 8 | DELETE | `/users/me/avatar` | Bearer | Clears avatar and removes unused file | **PASS** |
| 9 | GET | `/users/{username}` | Public | Public profile and real counts; no email | **PASS** |
| 10 | GET | `/posts` | Optional Bearer | Pagination, search, topic/author filter, sort | **PASS** |
| 11 | POST | `/posts` | Bearer | 201; author from JWT; unknown fields rejected | **PASS** |
| 12 | GET | `/posts/mine` | Bearer | Only caller's posts | **PASS** |
| 13 | GET | `/posts/{post_id}` | Optional Bearer | Post with author and engagement state | **PASS** |
| 14 | PUT | `/posts/{post_id}` | Bearer + owner | Owner update; non-owner 403; missing 404 | **PASS** |
| 15 | DELETE | `/posts/{post_id}` | Bearer + owner | 204; cascades comments/likes/bookmarks | **PASS** |
| 16 | POST | `/posts/{post_id}/like` | Bearer | Idempotent like and real count | **PASS** |
| 17 | DELETE | `/posts/{post_id}/like` | Bearer | Removes like and updates count | **PASS** |
| 18 | POST | `/posts/{post_id}/bookmark` | Bearer | Private bookmark; optional collection | **PASS** |
| 19 | DELETE | `/posts/{post_id}/bookmark` | Bearer | Removes bookmark | **PASS** |
| 20 | PATCH | `/posts/{post_id}/bookmark` | Bearer | Moves bookmark to collection | **PASS** |
| 21 | GET | `/comments?post_id=` | Public | Chronological page; missing post 404 | **PASS** |
| 22 | POST | `/comments` | Bearer | 201; author from JWT; invalid post 404 | **PASS** |
| 23 | GET | `/comments/{comment_id}` | Public | 200 or 404 | **PASS** |
| 24 | PUT | `/comments/{comment_id}` | Bearer + owner | Owner update; non-owner 403 | **PASS** |
| 25 | DELETE | `/comments/{comment_id}` | Bearer + owner | 204; non-owner 403 | **PASS** |
| 26 | GET | `/bookmarks` | Bearer | Caller-only library, filters, pagination | **PASS** |
| 27 | GET | `/bookmarks/collections` | Bearer | Caller-only collection counts | **PASS** |
| 28 | GET | `/topics` | Public | Real topics and post counts | **PASS** |
| 29 | POST | `/uploads/images` | Bearer | 201 real image; 413/415/422 failures | **PASS** |
| 30 | GET | `/uploads/{path}` | Public | Serves only files under upload root; traversal 404 | **PASS** |

The OpenAPI schema reports 29 documented operations. The static upload route is
intentionally `include_in_schema=False`, so the table includes one additional
runtime route; it was still tested through real HTTP requests. The table's other
rows map directly to the 29 documented operations.

## 3. Authentication and authorization matrix

| Scenario | Expected | Observed |
|---|---|---|
| Register valid user | 201 | **PASS** |
| Duplicate username/email | 409 | **PASS** |
| Invalid registration payload | 422 | **PASS** |
| Login valid | 200 + Bearer token | **PASS** |
| Login invalid password | 401 | **PASS** |
| Inactive account login/token | 403 | **PASS** |
| Missing token on protected write | 401 | **PASS** |
| Malformed token | 401 | **PASS** |
| Expired token | 401 | **PASS** |
| Token signed with another key | 401 | **PASS** |
| Wrong token type | 401 | **PASS** |
| Token for nonexistent user | 401 | **PASS** |
| User A updates User B's post | 403 | **PASS** |
| User A deletes User B's post | 403 | **PASS** |
| User A updates User B's comment | 403 | **PASS** |
| User A deletes User B's comment | 403 | **PASS** |
| Client supplies `author_id` | 422 | **PASS** |
| Client supplies unknown body field | 422 | **PASS** |
| User A reads public post/comment | 200 | **PASS** |
| User A reads User B's private library | Only A's rows | **PASS** |

## 4. Post and comment CRUD evidence

- Posts are created with the JWT user as author; no client author override is
  accepted.
- `PUT /posts/{id}` is a full replacement with validation and ownership.
- `DELETE /posts/{id}` returns 204 and database cascades remove dependent
  comments, likes, and bookmarks.
- Comments require an existing post; invalid `post_id` returns 404, not an
  orphan row.
- Comment update/delete is owner-only.
- Public reads remain available to anonymous users.
- Live E2E created two users, a post, comments, likes, and bookmarks; queried
  the database directly; verified the second user received 403 on foreign
  mutations; then deleted the content as the owner.

## 5. Upload verification

| Case | Expected | Observed |
|---|---|---|
| Authenticated real PNG | 201 with path/url/dimensions | **PASS** |
| JPEG and WebP supported bytes | 201 | **PASS** |
| Text disguised as image | 415 | **PASS** |
| Empty file | 422 | **PASS** |
| Oversized file | 413 | **PASS** |
| Missing auth | 401 | **PASS** |
| Path traversal on serving route | 404 | **PASS** |
| Unsupported extension | 404 | **PASS** |
| Relative path persisted in post | Path equals upload response | **PASS** |
| Image survives API restart | Served after restart | **PASS** |

The backend checks magic bytes, dimensions, and pixel count. It does not trust
the client filename or declared content type. Storage filenames are generated.

## 6. Error behavior

| Case | Response |
|---|---|
| Validation error | 422 with location/message/type; no submitted values |
| Duplicate database row | 409 generic conflict |
| Missing resource | 404 |
| Unauthorized | 401 |
| Non-owner | 403 |
| Upload too large | 413 |
| Unsupported image type | 415 |
| Unexpected exception | 500 `An unexpected error occurred.` |
| Database exception | 500 `A database error occurred.` |
| Database unavailable on health | 503 `Database is unavailable.` |

Automated tests verify that generic 500 responses do not contain stack traces,
SQL, database URLs, or filesystem paths.

## 7. Live PostgreSQL E2E result

```text
49/49 checks passed
```

The run covered:

- Registration/login for two users.
- JWT-protected profile.
- Post create/read/list/update/delete.
- Cross-user post and comment authorization.
- Comment create/read/update/delete.
- Like/bookmark/collection behavior.
- Private library isolation.
- Real image upload and serving.
- Invalid upload rejection.
- Health and OpenAPI.
- Direct database row checks.

## 8. Persistence result

A post with a real cover image was created, the API process was stopped and
restarted, and the post plus image were verified afterward:

```text
restart_create=PASS
restart_verify=PASS
```

This confirms PostgreSQL persistence and local upload persistence across an API
restart.

## 9. OpenAPI and documentation

- `/docs` and `/redoc` are served by FastAPI.
- `/openapi.json` is generated by the live application.
- `docs/openapi.json` is a committed snapshot.
- `docs/API_DOCUMENTATION.md` documents all public and protected endpoints,
  pagination, errors, uploads, and auth.
- `tests/test_health_docs.py` verifies OpenAPI endpoint coverage and Bearer
  security declarations.

## 10. API verdict

| Item | Status |
|---|---|
| Core REST API functionality | **PASS** |
| Authentication and ownership | **PASS** |
| PostgreSQL behavior | **PASS** on disposable verified cluster |
| Uploads | **PASS** |
| Error handling | **PASS** |
| API documentation | **PASS** |
| Existing configured `5432` database | **BLOCKED** |
| Production deployment/TLS/rate limiting | **NOT APPLICABLE** to the internship API gate; not implemented for production |

The API implementation is functionally complete for the assignment. The
configured local database blocker is an environment credential issue, not an
endpoint implementation failure. It still prevents a claim that the current
local `.env` is fully runnable.
