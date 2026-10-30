# ANVIKSHA - API Documentation

## Base URLs

| Environment | URL |
|---|---|
| Local backend | `http://127.0.0.1:8000` |
| Local frontend | `http://127.0.0.1:5173` |
| Interactive Swagger UI | `/docs` |
| ReDoc | `/redoc` |
| OpenAPI JSON | `/openapi.json` |

A generated snapshot is committed at [`docs/openapi.json`](openapi.json). It was
produced from the live FastAPI application and contains **18 paths and 29
operations**.

## Conventions

- JSON request and response bodies use `application/json`.
- Uploads use `multipart/form-data`.
- Protected operations require `Authorization: Bearer <access_token>`.
- Timestamps are ISO 8601 UTC values.
- List responses use the pagination envelope:

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

- `limit` is 1-100, default 20. `offset` is 0 or greater.
- Errors use `{"detail": "..."}`. Validation errors use
  `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` and never echo
  submitted passwords or file contents.
- Unknown request-body fields are rejected with 422. Clients cannot set
  `author_id` or another user's ownership fields.

## Authentication

### Register

`POST /register` - public.

```json
{
  "username": "jane_doe",
  "email": "jane@example.com",
  "password": "StrongPass123"
}
```

Rules:

- Username: 3-50 characters, lowercase letters, numbers, `.`, `_`, `-`.
- Email: valid address, stored lowercase.
- Password: 8-128 characters, at least one letter and one digit.

Response: **201** with the public user record. `hashed_password` is never
returned. Duplicate username/email returns **409**.

### Log in

`POST /login` - public.

```json
{
  "email": "jane@example.com",
  "password": "StrongPass123"
}
```

Response: **200**.

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "expires_in": 1800
}
```

Invalid credentials return **401**. Inactive accounts return **403**. The token
contains `sub` (user ID), `type` (`access`), `iat`, and `exp`. The default
lifetime is 30 minutes. Send it as:

```http
Authorization: Bearer <access_token>
```

### Current user

`GET /users/me` - protected.

Returns the authenticated user's `id`, `username`, `email`, `display_name`,
`bio`, `avatar_path`, `is_active`, `created_at`, and `updated_at`.

## Endpoint summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | Public | API information |
| GET | `/health` | Public | Process and database health; 503 if DB unavailable |
| POST | `/register` | Public | Create an account |
| POST | `/login` | Public | Obtain a JWT |
| GET | `/users/me` | Bearer | Current user |
| PATCH | `/users/me` | Bearer | Update display name and bio |
| POST | `/users/me/avatar` | Bearer | Upload/replace avatar |
| DELETE | `/users/me/avatar` | Bearer | Remove avatar |
| GET | `/users/{username}` | Public | Public author profile and counts |
| GET | `/posts` | Optional | List/search/filter/sort posts |
| POST | `/posts` | Bearer | Create a post |
| GET | `/posts/mine` | Bearer | Current user's posts |
| GET | `/posts/{post_id}` | Optional | Read one post |
| PUT | `/posts/{post_id}` | Bearer + owner | Replace an owned post |
| DELETE | `/posts/{post_id}` | Bearer + owner | Delete an owned post |
| POST | `/posts/{post_id}/like` | Bearer | Like a post |
| DELETE | `/posts/{post_id}/like` | Bearer | Remove a like |
| POST | `/posts/{post_id}/bookmark` | Bearer | Save a post |
| DELETE | `/posts/{post_id}/bookmark` | Bearer | Remove a saved post |
| PATCH | `/posts/{post_id}/bookmark` | Bearer | Move a saved post to a collection |
| GET | `/comments?post_id=` | Public | List comments for a post |
| POST | `/comments` | Bearer | Create a comment |
| GET | `/comments/{comment_id}` | Public | Read one comment |
| PUT | `/comments/{comment_id}` | Bearer + owner | Update an owned comment |
| DELETE | `/comments/{comment_id}` | Bearer + owner | Delete an owned comment |
| GET | `/bookmarks` | Bearer | List the private library |
| GET | `/bookmarks/collections` | Bearer | List collection labels and counts |
| GET | `/topics` | Public | Real topics and post counts |
| POST | `/uploads/images` | Bearer | Upload a cover image |

`GET /uploads/{path}` serves stored images. It is intentionally hidden from the
OpenAPI schema but is part of the public image-serving contract.

## Posts

### List posts

`GET /posts` - optional Bearer token. If a valid token is supplied, each item
includes `liked_by_me` and `bookmarked_by_me`; without a token those fields are
`false`.

Query parameters:

| Name | Type | Default | Notes |
|---|---|---|---|
| `limit` | integer 1-100 | 20 | Page size |
| `offset` | integer >= 0 | 0 | Rows to skip |
| `search` | string <= 200 | none | Case-insensitive title/content search |
| `topic` | string <= 60 | none | Exact topic filter |
| `author` | string <= 50 | none | Author username filter |
| `sort` | enum | `newest` | `newest`, `oldest`, `title`, `popular` |

Example:

```http
GET /posts?limit=10&offset=0&search=postgres&topic=Technology&sort=popular
```

Each item contains the post fields, author summary, `comment_count`,
`like_count`, `liked_by_me`, and `bookmarked_by_me`. The response is a
`Page[PostRead]` envelope.

### Create a post

`POST /posts` - Bearer required.

```json
{
  "title": "Question deeper",
  "excerpt": "A short introduction.",
  "content": "Markdown content for the story.",
  "topic": "Technology",
  "cover_image_path": "covers/2026/10/7a5d9e4f3c2b1a0f9e8d7c6b5a4f3e2d.jpg"
}
```

- `title`: 1-200 characters, trimmed, not blank.
- `content`: 1-50,000 characters, not blank.
- `excerpt`: optional, up to 300 characters.
- `topic`: optional, up to 60 characters; `General` is normalized to `null`.
- `cover_image_path`: optional relative key returned by `POST /uploads/images`.
  Arbitrary URLs are rejected.

Response: **201** with `PostRead`. The author is always the authenticated user;
there is no client-supplied `author_id`.

### Read, update, delete

- `GET /posts/{post_id}` returns **200** or **404**.
- `PUT /posts/{post_id}` replaces the post. Bearer required; the caller must be
  the author. Non-owner returns **403**; missing post returns **404**.
- `DELETE /posts/{post_id}` deletes the post. Bearer and ownership required.
  Response: **204**. Related comments, likes, and bookmarks are removed by the
  database cascade.

### My posts

`GET /posts/mine` - Bearer required. Supports `limit` and `offset`. Returns only
the current user's posts, including engagement counts.

## Comments

### List comments for a post

`GET /comments?post_id=<id>` - public. `post_id` is required. Returns a
`Page[CommentRead]` envelope in chronological order. Missing post returns
**404**; missing/invalid `post_id` returns **422**.

### Create a comment

`POST /comments` - Bearer required.

```json
{
  "post_id": 1,
  "content": "This is a thoughtful comment."
}
```

- `post_id` must be positive and refer to an existing post.
- `content` is 1-2,000 characters and must not be blank.

Response: **201** with `CommentRead`. Missing post returns **404**.

### Read, update, delete

- `GET /comments/{comment_id}` - public; **200** or **404**.
- `PUT /comments/{comment_id}` - Bearer and ownership required; **200**.
- `DELETE /comments/{comment_id}` - Bearer and ownership required; **204**.
- A non-owner receives **403**; a missing comment receives **404**.

## Likes and bookmarks

### Likes

`POST /posts/{post_id}/like` - Bearer required. Creates at most one like per
user/post. Response:

```json
{"liked": true, "like_count": 1}
```

`DELETE /posts/{post_id}/like` removes the caller's like and returns the updated
state. Repeating the operation is safe.

### Bookmarks

`POST /posts/{post_id}/bookmark` - Bearer required. Saves the post to the
caller's private library. Optional body:

```json
{"collection": "Read later"}
```

`DELETE /posts/{post_id}/bookmark` removes it. `PATCH
/posts/{post_id}/bookmark` updates the collection label. Duplicate saves do not
create duplicate rows.

`GET /bookmarks` returns only the caller's saved posts, with `bookmarked_at`
and `collection`. Supports `search`, `collection`, `limit`, and `offset`.
`GET /bookmarks/collections` returns collection labels and real counts.

## Author profiles

`GET /users/{username}` - public. Returns public profile fields, `post_count`,
`comment_count`, and `likes_received`. Email is never exposed.

`PATCH /users/me` - Bearer required.

```json
{
  "display_name": "Jane Doe",
  "bio": "Writing about systems and ideas."
}
```

`POST /users/me/avatar` - Bearer required, multipart field `file`.
`DELETE /users/me/avatar` - Bearer required; removes the file and clears the
column.

## Image uploads

### Cover image

`POST /uploads/images` - Bearer required, `multipart/form-data`, field `file`.

Supported bytes: JPEG, PNG, WebP. The backend validates the actual file
signature, dimensions, and configured limits. Defaults: 5 MB and 40,000,000
pixels. Files are stored under server-generated names; the client never chooses
a path.

Response: **201**.

```json
{
  "path": "covers/2026/10/7a5d9e4f3c2b1a0f9e8d7c6b5a4f3e2d.jpg",
  "url": "/uploads/covers/2026/10/7a5d9e4f3c2b1a0f9e8d7c6b5a4f3e2d.jpg",
  "content_type": "image/jpeg",
  "size": 24567,
  "width": 1200,
  "height": 675
}
```

Errors:

| Status | Meaning |
|---|---|
| 401 | Missing/invalid token |
| 413 | File exceeds size limit |
| 415 | Not a supported JPEG/PNG/WebP image |
| 422 | Empty file or invalid dimensions/pixel count |
| 500 | Storage failure |

`GET /uploads/{path}` serves only files inside `UPLOAD_DIR`. Path traversal,
drive letters, unsupported extensions, and resolved paths outside the upload
root return **404**.

### Avatar

`POST /users/me/avatar` uses the same validation and storage rules for the
`avatars/` subtree. Replacing an avatar removes the previous unused file when
possible.

## Topics

`GET /topics` - public. Returns topics that currently have posts, plus a
`General` entry for posts without a topic:

```json
[
  {"name": "Technology", "count": 4},
  {"name": "General", "count": 2}
]
```

Counts are derived from stored posts; there are no fabricated trending metrics.

## Health and errors

`GET /health` returns **200** only when `SELECT 1` succeeds:

```json
{
  "status": "healthy",
  "database": "reachable",
  "service": "anviksha-api",
  "project_id": "ANVIKSHA"
}
```

If the database is unreachable it returns **503** with
`{"detail": "Database is unavailable."}`.

| Status | Typical cause |
|---|---|
| 400 | Domain validation not covered by Pydantic |
| 401 | Missing, malformed, expired, forged, or wrong-type token |
| 403 | Authenticated but not the owner, or inactive account |
| 404 | Missing post/comment/author/image |
| 409 | Duplicate username/email or database conflict |
| 413 | Upload too large |
| 415 | Unsupported upload type |
| 422 | Schema/query/path validation failure |
| 500 | Sanitized database or unexpected server error |

Generic 500 responses are covered by automated tests and do not expose stack
traces, SQL, credentials, or filesystem paths.

## Quick request examples

### PowerShell

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/login `
  -ContentType 'application/json' `
  -Body '{"email":"jane@example.com","password":"StrongPass123"}'

$headers = @{ Authorization = "Bearer $($login.access_token)" }
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8000/posts?limit=5' -Headers $headers
```

### curl

```bash
curl -X POST http://127.0.0.1:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"StrongPass123"}'
```

Never place real credentials or tokens in committed files. The examples above
use fictional local test values only.
