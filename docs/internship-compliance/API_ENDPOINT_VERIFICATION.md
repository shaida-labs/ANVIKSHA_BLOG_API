> **Historical document - superseded by final verification.**
> This file records an earlier audit pass and may contain stale counts or findings.
> The authoritative current status is in
> docs/internship-compliance/FINAL_INTERNSHIP_COMPLIANCE_REPORT.md,
> FINAL_API_VERIFICATION_REPORT.md, FINAL_TEST_EXECUTION_REPORT.md, and
> FINAL_SUBMISSION_CHECKLIST.md. Current code/API tests pass on both the
> disposable PostgreSQL environment and the configured local `5432` database;
> only the authorized GitHub remote/push remains pending.
# API Endpoint Verification — ANVIKSHA

**Audit date:** 2026-10-30  
**Scope:** Required registration, login, post CRUD, comment CRUD, authentication, authorization, validation, persistence, and documentation behavior.  
**Method:** Live HTTP requests against a separate isolated API process. No frontend restrictions were used as proof. No production data was touched.

---

## 1. Test Environment and Result

| Item | Value |
|---|---|
| API process | Isolated Uvicorn instance on `127.0.0.1:8011`, then a second instance on `127.0.0.1:8012` |
| Database | Fresh temporary SQLite file, isolated from the project database |
| Schema A | `Base.metadata.create_all()` from the ORM models |
| Schema B | Real Alembic chain: `0001_initial` → `0005_user_avatar` |
| Accounts | Two generated test accounts only; no real users |
| Authentication | Real Bearer JWT issued by `POST /login` |
| Request checks | **81/81 passed** on Schema A and **81/81 passed** on Schema B |
| Assertions | **44/44 passed** on Schema A and **44/44 passed** on Schema B |
| Failures | **0** |
| Production data | Not read, modified, or deleted |
| PostgreSQL | **BLOCKED**; configured PostgreSQL connection failed authentication; `/health` on the PostgreSQL-backed API returned 503 |

The SQLite run proves API behavior and persistence in a real SQL database, but it is **not** a substitute for the required PostgreSQL verification. PostgreSQL-specific evidence is marked **BLOCKED** throughout.

---

## 2. Phase 3 — Complete Two-User Workflow

The workflow below was executed in order. The owner-delete and non-owner-delete checks were arranged so that the non-owner 403 test happened before the owner deleted the comment; an additional owner-created comment was then used for a clean owner-delete check.

| Step | Action | Actual result | Evidence | Status |
|---:|---|---|---|---|
| 1 | Register test user A | `201 Created`; user id returned; no password/hash fields | Live response; direct DB user row | **PASS** |
| 2 | Register test user B | `201 Created`; second user id returned | Live response | **PASS** |
| 3 | Attempt duplicate registration | `409 Conflict` for duplicate username and duplicate email | Live responses; `app/services/auth.py` | **PASS** |
| 4 | Log in as user A | `200 OK`; Bearer JWT; claims `sub`, `type=access`, `iat`, `exp` | Decoded token; claims matched user A | **PASS** |
| 5 | Log in with invalid credentials | `401 Unauthorized`; same generic detail for wrong password and unknown email | Live responses | **PASS** |
| 6 | Create a post as user A | `201 Created`; `author_id` matched user A; title/content persisted | Live response; direct DB row | **PASS** |
| 7 | Retrieve the post list | `200 OK`; total 2; both posts returned | Live response | **PASS** |
| 8 | Retrieve the created post | `200 OK`; correct id/title/author | Live response | **PASS** |
| 9 | Update the post as owner | `200 OK`; title/content changed; `created_at` unchanged; `updated_at` advanced | Live response; DB title check | **PASS** |
| 10 | Attempt update as user B | `403 Forbidden`; DB value unchanged | Live response; DB title check | **PASS** |
| 11 | Create a comment as user A | `201 Created`; `author_id` and `post_id` correct | Live response; DB row | **PASS** |
| 12 | Retrieve comments for the post | `200 OK`; total 2; all items had the requested `post_id` | Live response | **PASS** |
| 13 | Retrieve the individual comment | `200 OK`; correct id/content/author | Live response | **PASS** |
| 14 | Update the comment as owner | `200 OK`; content changed; `created_at` unchanged | Live response; DB content check | **PASS** |
| 15 | Attempt update as user B | `403 Forbidden`; DB content unchanged | Live response; DB content check | **PASS** |
| 16 | Delete the comment as owner | `204 No Content`; row removed | Live response; DB row count 0 | **PASS** |
| 17 | Attempt delete of another user's comment | `403 Forbidden`; comment remained retrievable | Live response; subsequent GET 200 | **PASS** |
| 18 | Delete the post as owner | `204 No Content`; post removed | Live response; DB row count 0 | **PASS** |
| 19 | Attempt to retrieve the deleted post | `404 Not Found` | Live response | **PASS** |
| 20 | Verify persistence and relationships | Users persisted with Argon2id hashes; posts/comments persisted; post delete cascaded comments; FKs/unique indexes/constraints present | Direct SQLite checks on both schemas | **PARTIAL** |

Additional checks in the same run:

- Empty feed: `GET /posts` returned `200` with `items: []`, `total: 0`.
- Pagination: `limit=1&offset=0` and `limit=1&offset=1` returned distinct posts and `total: 2`.
- Invalid post/comment IDs: `0` and non-numeric values returned `422`.
- Missing records returned `404`.
- Missing post for comment listing/creation returned `404`.
- Blank/missing fields and malformed JSON returned `422`.
- Extra `author_id` in post/comment bodies returned `422`.
- Missing/malformed/expired/forged tokens returned `401`.
- Non-owner updates/deletes returned `403`.

---

## 3. Required Endpoint Matrix

| Method | Endpoint | Auth | Verified behavior | Status |
|---|---|---|---|---|
| POST | `/register` | Public | `201` success; `409` duplicate username/email; `422` invalid email/username/password/extra field; no password echo; Argon2id hash in DB | **PASS** |
| POST | `/login` | Public | `200` valid credentials + JWT; `401` wrong password/unknown email with identical generic detail; claims verified | **PASS** |
| GET | `/users/me` | Bearer | `200` valid token; `401` missing/malformed/expired/forged/nonexistent-user/wrong-type token | **PASS** |
| GET | `/posts` | Public | `200` empty and populated feed; pagination; author summary; invalid query `422` | **PASS** |
| POST | `/posts` | Bearer | `201`; author derived from token; validation `422`; missing/invalid token `401`; DB row persisted | **PARTIAL** |
| GET | `/posts/{post_id}` | Public | `200` existing; `404` missing; `422` invalid path id; no sensitive fields | **PASS** |
| PUT | `/posts/{post_id}` | Bearer + owner | `200` owner; `403` non-owner; `401` missing token; `404` missing; `422` invalid body; `updated_at` advanced; DB persisted | **PARTIAL** |
| DELETE | `/posts/{post_id}` | Bearer + owner | `204` owner; `403` non-owner; `401` missing token; `404` missing; DB row removed; comments cascaded | **PARTIAL** |
| GET | `/comments?post_id={post_id}` | Public | `200` filtered comments; chronological order; pagination; `404` missing post; `422` missing/invalid `post_id` | **PASS** |
| POST | `/comments` | Bearer | `201`; author from token; `404` missing post; `422` missing/invalid `post_id`/empty content/extra field; missing token `401`; DB row persisted | **PARTIAL** |
| GET | `/comments/{comment_id}` | Public | `200` existing; `404` missing; `422` invalid path id; correct structure | **PASS** |
| PUT | `/comments/{comment_id}` | Bearer + owner | `200` owner; `403` non-owner; `401` missing token; `404` missing; `422` invalid content; `created_at` unchanged; DB persisted | **PARTIAL** |
| DELETE | `/comments/{comment_id}` | Bearer + owner | `204` owner; `403` non-owner; `401` missing token; `404` missing; DB row removed | **PARTIAL** |
| GET | `/health` | Public | `200` with reachable database; test covers `503` when the DB query fails; PostgreSQL-backed live API returned `503` | **PARTIAL** |
| GET | `/openapi.json` | Public | `200`; required paths, Bearer scheme, security, examples, responses | **PASS** |
| GET | `/docs` | Public | `200`; Swagger UI available | **PASS** |
| GET | `/redoc` | Public | `200`; ReDoc available | **PASS** |

**Status interpretation:** For post/comment write endpoints, **PARTIAL** means the endpoint behavior, validation, authorization, and SQLite persistence were verified, but PostgreSQL persistence remains **BLOCKED**. Registration endpoint behavior is **PASS**; user-row persistence is separately marked **PARTIAL** in the database category. Read endpoints and validation-only behavior are **PASS**.

### Endpoint-level notes

- **`POST /posts` and `POST /comments`:** the author is never accepted from the client. Sending `author_id` produced `422` with `extra_forbidden`; the persisted author always matched the JWT subject.
- **`PUT` semantics:** post update is a full replacement; `title` and `content` are required. Omitting `cover_image_path` clears it, as documented. The core assignment only requires title/content persistence, which was verified.
- **`DELETE` semantics:** `204 No Content` with an empty body. Deleting a post cascaded comments in the isolated SQLite schema; the migration declares `ON DELETE CASCADE` for comments and `ON DELETE RESTRICT` for comment authors.
- **No administrator role:** the API enforces owner-only writes. The assignment permits the owner or an explicitly authorized administrator; no admin system is implemented or claimed, so the admin sub-requirement is **NOT APPLICABLE**.

## 4. Authentication and JWT Matrix

| Case | Request | Actual result | Evidence | Status |
|---|---|---|---|---|
| Missing token | `GET /users/me` | `401`; `WWW-Authenticate: Bearer`; generic detail | Live response | **PASS** |
| Malformed token | `GET /users/me` with `Bearer not-a-jwt` | `401`; invalid token detail | Live response | **PASS** |
| Expired token | Signed token with `exp` in the past | `401`; “Token has expired.” | Live response | **PASS** |
| Forged token | Token signed with a different key | `401`; invalid authentication token | Live response | **PASS** |
| Nonexistent user subject | Valid signature, `sub=999999` | `401`; user no longer exists | Live response | **PASS** |
| Wrong token type | Valid signature, `type=refresh` | `401`; invalid token type | Live response | **PASS** |
| Valid token | `GET /users/me` | `200`; id matched the registered user | Live response | **PASS** |
| Forged identity on write | `POST /posts` with forged token | `401`; no post created | Live response | **PASS** |
| Missing token on write | `POST /posts` without token | `401`; no post created | Live response | **PASS** |
| Token claims | Login response token decoded with the test key | `sub` matched user id; `type=access`; `iat` and `exp` present | Live decoded claims | **PASS** |
| Password safety | Registration/login/current-user responses | No `password` or `hashed_password` fields | Live response inspection | **PASS** |

**JWT conclusion:** missing, malformed, expired, forged, wrong-type, and nonexistent-user tokens were all rejected. Valid tokens resolved to the correct user. Identity was derived from verified claims, not from client-supplied author fields.

---

## 5. Validation and Error Handling Matrix

| Case | Endpoint | Actual result | Status |
|---|---|---|---|
| Missing title | `POST /posts` | `422` | **PASS** |
| Blank title | `POST /posts` | `422` | **PASS** |
| Missing content | `POST /posts` | `422` | **PASS** |
| Blank comment | `POST /comments` | `422` | **PASS** |
| Missing `post_id` | `POST /comments` | `422` | **PASS** |
| Invalid `post_id=0` | `POST /comments` | `422` | **PASS** |
| Nonexistent post | `POST /comments` | `404` | **PASS** |
| Invalid email | `POST /register` | `422`; submitted password not echoed | **PASS** |
| Short username | `POST /register` | `422` | **PASS** |
| Weak password | `POST /register` | `422` | **PASS** |
| Extra privileged field | `POST /register`, `/posts`, `/comments` | `422`; extra inputs forbidden | **PASS** |
| Duplicate username/email | `POST /register` | `409` with a specific safe detail | **PASS** |
| Wrong password/unknown email | `POST /login` | `401`; identical generic detail for both | **PASS** |
| Malformed JSON | `POST /posts` | `422`; JSON decode error; no stack trace | **PASS** |
| Invalid body type | `POST /posts` with a JSON list | `422` | **PASS** |
| Invalid path id `0` | `GET /posts/0`, `/comments/0` | `422` | **PASS** |
| Non-numeric path id | `GET /posts/not-an-int` | `422` | **PASS** |
| Missing post | `GET /posts/999999` | `404` | **PASS** |
| Missing comment | `GET /comments/999999` | `404` | **PASS** |
| Missing post for comments | `GET /comments?post_id=999999` | `404` | **PASS** |
| Missing `post_id` query | `GET /comments` | `422` | **PASS** |
| Non-owner post update/delete | `PUT/DELETE /posts/{id}` | `403`; data unchanged | **PASS** |
| Non-owner comment update/delete | `PUT/DELETE /comments/{id}` | `403`; data unchanged | **PASS** |
| Generic 500 | Any endpoint | Handler exists in `app/main.py`; not induced | **NOT VERIFIED** |
| 400 Bad Request | Any endpoint | Not used; validation consistently uses `422` | **NOT APPLICABLE** |

**Observed status codes:** `200`, `201`, `204`, `401`, `403`, `404`, `409`, `422`. The required `400` was not necessary because FastAPI/Pydantic maps request validation to `422`. The generic `500` handler is present but was not exercised; it is not claimed as passed.

---

## 6. OpenAPI and Documentation Verification

| Check | Actual evidence | Status |
|---|---|---|
| OpenAPI JSON available | `GET /openapi.json` returned `200` | **PASS** |
| Required paths documented | `/register`, `/login`, `/users/me`, `/posts`, `/posts/{post_id}`, `/comments`, `/comments/{comment_id}` present | **PASS** |
| Bearer security scheme | `BearerAuth` is declared as HTTP Bearer | **PASS** |
| Protected routes require security | `POST /posts` and `PUT /posts/{post_id}` declare security | **PASS** |
| Error responses documented | Post update documents `200`, `401`, `403`, `404`, `422` | **PASS** |
| Request example | `PostCreate` includes a title/content/topic/cover example | **PASS** |
| Authorization explanation | API description explains Bearer JWT and ownership policy | **PASS** |
| Swagger UI | `GET /docs` returned `200` and includes Swagger content | **PASS** |
| ReDoc | `GET /redoc` returned `200` and includes ReDoc content | **PASS** |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` | **PASS** |

---

## 7. Representative Sanitized Responses

These are representative shapes from the live run. Test account names are shown as placeholders; tokens, passwords, and hashes are omitted.

### Registration success — `201`

```json
{
  "id": 1,
  "username": "<audit_user_a>",
  "email": "<audit_user_a>@example.com",
  "display_name": null,
  "bio": null,
  "avatar_path": null,
  "is_active": true,
  "created_at": "<timestamp>",
  "updated_at": "<timestamp>"
}
```

No password or password hash is returned.

### Login success — `200`

```json
{
  "access_token": "<redacted>",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Missing authentication — `401`

```json
{"detail": "Authentication credentials were not provided."}
```

Response header: `WWW-Authenticate: Bearer`.

### Non-owner post update — `403`

```json
{"detail": "You do not have permission to modify this post."}
```

### Duplicate registration — `409`

```json
{"detail": "Username is already registered."}
```

### Client-supplied author — `422`

```json
{
  "detail": [
    {
      "loc": ["body", "author_id"],
      "msg": "Extra inputs are not permitted",
      "type": "extra_forbidden"
    }
  ]
}
```

### Missing post — `404`

```json
{"detail": "Post not found."}
```

### Successful delete — `204`

Empty response body.

### Health — `200`

```json
{
  "status": "healthy",
  "database": "reachable",
  "service": "anviksha-api",
  "project_id": "ANVIKSHA"
}
```

## 8. Database Schema and Persistence Evidence

### 8.1 Isolated schema creation

**Scope note:** All **PASS** statuses in sections 8.1 and 8.2 refer to the isolated SQLite schemas only. They are not PostgreSQL evidence. PostgreSQL-specific rows are explicitly marked **BLOCKED**.

| Schema source | Result | Evidence | Status |
|---|---|---|---|
| ORM `Base.metadata.create_all()` | Created `users`, `posts`, `comments`, `post_likes`, `bookmarks` | Isolated SQLite table inspection; full E2E passed | **PASS** |
| Alembic `0001_initial` → `0005_user_avatar` | Clean upgrade reached `0005_user_avatar` | `alembic upgrade head` on isolated SQLite; full E2E passed | **PASS** |
| PostgreSQL schema creation | Not executed; configured connection failed authentication | `/health` 503; no safe PostgreSQL access | **BLOCKED** |

### 8.2 Direct database checks after the workflow

| Check | Actual result | Status |
|---|---|---|
| User rows persisted | Two test users existed before deletion checks; registration responses matched database rows | **PASS** |
| Password storage | Stored value started with `$argon2`; it was not the submitted password | **PASS** |
| Post row persisted | Row contained the updated title/content and correct `author_id` | **PASS** |
| Comment row persisted | Row contained the updated content, correct `post_id`, and correct `author_id` | **PASS** |
| Post deletion | Post row count became 0 | **PASS** |
| Comment deletion | Deleted comment row count became 0 | **PASS** |
| Cascade deletion | Comments belonging to the deleted post were removed | **PASS** |
| Foreign keys | `posts.author_id → users.id`; `comments.post_id → posts.id`; `comments.author_id → users.id` | **PASS** |
| Cascade/restrict rules | Comments: `post_id` `ON DELETE CASCADE`, `author_id` `ON DELETE RESTRICT` | **PASS** |
| Unique indexes | Unique indexes existed on `users.username` and `users.email` | **PASS** |
| Check constraints | Non-blank post title/content and comment content constraints present | **PASS** |
| PostgreSQL row persistence | Not executed | **BLOCKED** |
| PostgreSQL migration/constraint behavior | Not executed | **BLOCKED** |

**Important limitation:** SQLite accepted the schema and all API writes, but it does not prove PostgreSQL-specific behavior such as `timestamptz`, PostgreSQL `now()` defaults, PostgreSQL constraint enforcement, or Psycopg transaction behavior. Those remain **BLOCKED**.

---

## 9. Optional Endpoints and Features (Not Counted as Core Compliance)

The repository contains additional functionality beyond the assignment's minimum. These features were inspected and are partly covered by the backend tests, but they were **not** counted as substitutes for the required core API.

| Feature area | Examples | Treatment in this audit |
|---|---|---|
| Topics | `GET /topics` | Optional enhancement; not counted |
| Likes | `POST/DELETE /posts/{id}/like` | Optional enhancement; not counted |
| Bookmarks | `GET/POST/DELETE` bookmark routes | Optional enhancement; not counted |
| Profiles and avatars | `PATCH /users/me`, avatar upload/delete, public profile | Optional enhancement; upload dependency gap noted |
| Cover image uploads | `POST /uploads/images` | Optional enhancement; `python-multipart` manifest gap noted |
| Frontend | React/Vite application | Supplementary only; frontend restrictions were not used as backend proof |

The presence of these features does not change the core endpoint statuses above.

---

## 10. Endpoint Verification Limitations

- The live workflow used isolated **SQLite** databases, not PostgreSQL.
- PostgreSQL 18 was running, but the configured credentials failed authentication; the PostgreSQL-backed API returned `503`.
- `TEST_DATABASE_URL` was unset, so PostgreSQL integration tests were skipped.
- The generic `500` path was not induced; it remains **NOT VERIFIED**.
- No `400 Bad Request` path was observed; FastAPI/Pydantic returned `422` for validation errors. This is treated as **NOT APPLICABLE**, not a failure.
- No administrator role exists; owner-only authorization is implemented, so the admin sub-requirement is **NOT APPLICABLE**.
- No production database or production user data was touched.

---

## 11. Endpoint Verification Summary

| Result | Count |
|---|---:|
| Live HTTP request checks passed | **81/81** |
| Live assertions passed | **44/44** |
| Required endpoint groups behaviorally verified | **All core groups** |
| SQLite schemas tested | **2** (`create_all` and Alembic-migrated) |
| PostgreSQL runtime checks | **BLOCKED** |
| Core endpoint failures | **0 observed** |
| Unexecuted error path | Generic `500` — **NOT VERIFIED** |

**Conclusion:** The required registration, login, post CRUD, comment CRUD, JWT, ownership, validation, pagination, and cascade behaviors work in the isolated API. The endpoint implementation is credible and behaviorally verified on SQLite. The mandatory PostgreSQL evidence is still missing, and the GitHub submission is not ready.
