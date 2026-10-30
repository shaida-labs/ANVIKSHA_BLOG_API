# ANVIKSHA - Authentication and Security

This document describes the implemented security controls, the verification
evidence, and the controls that are deliberately **not** implemented. It is a
security review, not a claim that the application is ready for an
internet-facing production deployment.

## Authentication flow

1. `POST /register` validates the username, email, and password policy.
2. The password is hashed with Argon2id through `pwdlib.PasswordHash`.
3. `POST /login` verifies the Argon2id hash and issues a signed JWT.
4. The frontend stores the token and attaches it as
   `Authorization: Bearer <token>`.
5. Protected endpoints resolve the token through `get_current_user`, load the
   user, and reject missing, malformed, expired, forged, wrong-type, or inactive
   accounts.
6. The API checks ownership in the service layer before updates and deletes.

### JWT details

- Algorithm: `HS256` by default; `HS384` and `HS512` are supported by settings.
- Required claims: `exp`, `iat`, `sub`.
- Additional claim: `type` must equal `access`.
- Subject must be a positive integer user ID.
- Default lifetime: 30 minutes, configurable from 1 to 1,440 minutes.
- Secret must be at least 32 characters.
- Production rejects obvious placeholder secrets.
- Decoding uses an explicit algorithm list, so algorithm-confusion attacks are
  rejected.
- There is no refresh token, rotation, or server-side revocation list. A token
  remains valid until expiry. This is a known scope limitation.

### Password handling

- Argon2id hashes, never plaintext or reversible encryption.
- Password is 8-128 characters with at least one letter and one digit.
- Validation errors never echo the submitted password value.
- Login uses a generic invalid-credentials response.
- Inactive accounts are rejected at login and on existing tokens.
- There is no password-reset or email-verification flow in this repository.

### Token storage in the browser

The SPA stores the access token in `sessionStorage`. Closing the tab ends the
session. This is simple and works with the existing Bearer-token API, but the
token is readable by JavaScript in the same tab. The frontend mitigates XSS
exposure by sanitizing Markdown with `rehype-sanitize` and by rendering user
content through React, not raw HTML. A production deployment should add a strict
Content-Security-Policy and consider an HttpOnly cookie session with CSRF
protection. The current API does not set a CSP header.

## Authorization model

| Operation | Rule |
|---|---|
| Register/login | Public |
| List/read posts and comments | Public; optional token adds personal like/bookmark state |
| Create post/comment | Authenticated |
| Update/delete post | Authenticated and post author |
| Update/delete comment | Authenticated and comment author |
| Like/bookmark | Authenticated; one row per user/post |
| Library | Authenticated; only the caller's bookmarks |
| Profile update/avatar | Authenticated; only the caller's profile |
| Public author profile | Public; email is not exposed |
| Admin operations | None in this repository |

Ownership is enforced from the authenticated JWT user, never from a
client-supplied `author_id`, `user_id`, or `post_id` override. Request schemas
use `extra="forbid"`, so mass-assignment attempts are rejected with 422.

Verified authorization tests include:

- `test_create_post_uses_authenticated_author`
- `test_create_post_rejects_client_supplied_author_id`
- `test_user_cannot_update_another_users_post`
- `test_user_cannot_delete_another_users_post`
- `test_cover_image_path_does_not_bypass_post_ownership`
- `test_create_comment_uses_authenticated_author`
- `test_create_comment_rejects_client_supplied_author_id`
- `test_user_cannot_update_another_users_comment`
- `test_user_cannot_delete_another_users_comment`
- `test_profile_update_is_authenticated_and_owner_only`

## Token and session tests

- `test_access_token_roundtrip`
- `test_expired_access_token_raises_specific_error`
- `test_token_signed_with_another_key_is_rejected`
- `test_malformed_token_is_rejected`
- `test_expired_token_is_rejected`
- `test_token_with_wrong_signature_is_rejected`
- `test_token_for_nonexistent_user_is_rejected`
- `test_token_with_wrong_token_type_is_rejected`
- `test_inactive_user_cannot_log_in_or_use_existing_token`

The two-user live PostgreSQL E2E also verifies that a second user receives 403
for another user's post and comment mutations, while public reads remain
available.

## Input validation

- Pydantic schemas enforce lengths, patterns, numeric ranges, email format,
  enum values, and unknown-field rejection.
- Titles, excerpts, topics, comments, and profile text are trimmed and checked
  for blanks/control characters.
- Post content is limited to 50,000 characters; comments to 2,000.
- Pagination is bounded: `limit` 1-100, `offset` >= 0.
- Search/filter strings have explicit maximum lengths.
- `cover_image_path` must match a server-generated relative upload key; arbitrary
  URLs and path-like values are rejected.
- Invalid values produce 422 without echoing secrets.

## Upload security

Cover and avatar uploads are validated on the backend, not only in the browser:

1. Authentication is required.
2. The upload is read with a hard size limit (default 5 MB).
3. Magic bytes are checked for JPEG, PNG, or WebP; the filename and client
   `Content-Type` are not trusted.
4. Image dimensions and pixel count are checked (default 40,000,000 pixels).
5. Storage names are generated from UUIDs and fixed extensions.
6. The database stores a relative key, not an absolute path or remote URL.
7. Serving resolves the key under `UPLOAD_DIR`, rejects traversal, drive-letter,
   absolute, and unsupported-extension input, and verifies the final resolved
   path is inside the upload root.
8. Responses include `X-Content-Type-Options: nosniff`, and images are served
   inline with a long immutable cache lifetime.

Verified upload tests include:

- `test_upload_accepts_real_supported_images`
- `test_upload_requires_authentication`
- `test_upload_rejects_text_disguised_as_an_image`
- `test_upload_rejects_empty_files`
- `test_upload_rejects_oversized_files`
- `test_static_upload_route_rejects_path_traversal`
- `test_create_post_with_uploaded_image_persists_relative_reference`
- `test_avatar_upload_requires_authentication`
- `test_avatar_upload_rejects_non_image_bytes`

## Error handling and information disclosure

`app/main.py` installs handlers for:

- `RequestValidationError` -> 422 with location/message/type, no submitted values.
- `IntegrityError` -> 409 generic conflict.
- `SQLAlchemyError` -> 500 `A database error occurred.`
- Unexpected `Exception` -> 500 `An unexpected error occurred.`

The health endpoint catches database errors and returns 503 without exposing the
driver exception. Automated tests:

- `test_unexpected_exception_returns_generic_500`
- `test_database_error_returns_generic_500_without_details`
- `test_health_returns_503_without_leaking_database_details`

No stack trace, SQL statement, password, JWT, upload path, or database URL is
returned to clients.

## Transport, CORS, and headers

- CORS is an explicit allowlist from `CORS_ORIGINS`.
- `allow_credentials=False`; allowed methods are GET/POST/PUT/PATCH/DELETE;
  allowed headers are `Authorization` and `Content-Type`.
- Responses set:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
- The repository does not terminate TLS. Production must place the API behind
  HTTPS (reverse proxy or managed platform).
- There is no Content-Security-Policy, HSTS, or rate-limiting middleware.

## Configuration and secret handling

- `.env` is gitignored; `.env.example` contains placeholders only.
- `DATABASE_URL` and `JWT_SECRET_KEY` use `repr=False`.
- The production validator rejects SQLite, weak placeholder secrets, and
  non-PostgreSQL URLs.
- `DEBUG` defaults to `false`.
- The frontend has no backend secret. Only `VITE_API_BASE_URL` and
  `VITE_MAX_UPLOAD_MB` are public build-time values.
- Generated JWTs, database passwords, and uploaded user files must never be
  committed. The repository `.gitignore` excludes `.env*`, databases, uploads,
  caches, and build artifacts.

## Dependency and supply-chain checks

- `python -m pip check`: **No broken requirements found.**
- Fresh virtual environment installation from `requirements.txt`: **PASS**.
- `npm audit` after adding Playwright: **0 vulnerabilities** reported at install
  time.
- `python-multipart==0.0.32` is pinned; without it the multipart upload routes
  would fail at runtime.
- No automated `pip-audit`/OSV scan is committed. Run a current advisory scan
  before production deployment.

## Known limitations and production follow-ups

These are not implemented and must not be described as complete:

| Control | Status |
|---|---|
| Rate limiting / brute-force throttling | Not implemented |
| Refresh-token rotation | Not implemented |
| Token revocation/denylist | Not implemented |
| Email verification | Not implemented |
| Password reset | Not implemented |
| TLS termination | Not implemented in repository |
| Content-Security-Policy / HSTS | Not implemented |
| Centralized audit logging | Not implemented |
| Malware scanning of uploads | Not implemented; image type/dimension validation only |
| Multi-instance upload storage | Local disk only; needs shared/object storage |
| Automated dependency advisory scan in CI | Not implemented |

These gaps are documented in the final compliance report and do not block the
core internship API requirements, but they do block a claim of full production
security readiness.

## Security verification summary

| Area | Status | Evidence |
|---|---|---|
| Password hashing | **PASS** | Argon2id helper and auth tests |
| JWT validation | **PASS** | Round-trip, expired, forged, malformed, wrong-type tests |
| Ownership | **PASS** | Two-user API and live PostgreSQL tests |
| Mass assignment | **PASS** | Unknown-field rejection tests |
| Upload validation | **PASS** | Real-image, disguised-text, size, traversal tests |
| Error disclosure | **PASS** | Generic 500 and 503 tests |
| CORS allowlist | **PASS** | CORS tests and explicit settings |
| Secrets in repository | **PASS** | `.gitignore` review and staged-file audit; see final checklist |
| Rate limiting/TLS/revocation | **NOT IMPLEMENTED** | Explicit production follow-ups |
