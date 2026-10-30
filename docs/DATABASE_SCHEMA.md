# ANVIKSHA - Database Schema

## Target database

- **Production/development target:** PostgreSQL 14 or newer.
- **Driver:** Psycopg 3 (`postgresql+psycopg://`).
- **ORM:** SQLAlchemy 2.1.
- **Migrations:** Alembic 1.20.1, revisions `0001` through `0005`.
- **Test substitute:** isolated in-memory SQLite is used only when
  `ENVIRONMENT=test`; the opt-in integration suite uses real PostgreSQL.

The schema is additive. No migration deletes or recreates existing user data.

## Entity relationship overview

```text
users 1 --- * posts
users 1 --- * comments
posts 1 --- * comments
users 1 --- * post_likes
posts 1 --- * post_likes
users 1 --- * bookmarks
posts 1 --- * bookmarks
```

## Tables

### `users`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer | no | Primary key, autoincrement |
| `username` | varchar(50) | no | Unique, indexed, lowercase-normalized by the API |
| `email` | varchar(254) | no | Unique, indexed, lowercase-normalized by the API |
| `hashed_password` | varchar(255) | no | Argon2id hash; never returned by the API |
| `display_name` | varchar(80) | yes | Added in `0004`; public profile display name |
| `bio` | varchar(500) | yes | Added in `0004`; public profile biography |
| `avatar_path` | varchar(512) | yes | Added in `0005`; relative uploaded avatar key |
| `is_active` | boolean | no | Default `true`; inactive users are denied |
| `created_at` | timestamptz | no | UTC, server default `now()` |
| `updated_at` | timestamptz | no | UTC, server default `now()`, updated on change |

Constraints and indexes:

- Primary key `pk_users`.
- Unique indexes `ix_users_username`, `ix_users_email`.
- Check constraints for username/email minimum and maximum lengths.
- `display_name`, `bio`, and `avatar_path` are nullable for backward
  compatibility.

### `posts`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer | no | Primary key, autoincrement |
| `title` | varchar(200) | no | Trimmed; must not be blank |
| `excerpt` | varchar(300) | yes | Added in `0004`; optional card summary |
| `content` | text | no | Markdown source; must not be blank |
| `topic` | varchar(60) | yes | Added in `0004`; indexed topic label |
| `cover_image_path` | varchar(512) | yes | Added in `0003`; relative storage key |
| `cover_image_url` | varchar(2048) | yes | Legacy URL column added in `0002`; retained for old posts |
| `author_id` | integer | no | FK to `users.id`, `ON DELETE RESTRICT` |
| `created_at` | timestamptz | no | UTC |
| `updated_at` | timestamptz | no | UTC |

Constraints and indexes:

- Primary key `pk_posts`.
- FK `fk_posts_author_id_users` with `ON DELETE RESTRICT`.
- Check constraints for non-blank title/content.
- Indexes `ix_posts_author_id`, `ix_posts_created_at`, `ix_posts_topic`.

### `comments`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer | no | Primary key, autoincrement |
| `content` | varchar(2000) | no | Must not be blank |
| `post_id` | integer | no | FK to `posts.id`, `ON DELETE CASCADE` |
| `author_id` | integer | no | FK to `users.id`, `ON DELETE RESTRICT` |
| `created_at` | timestamptz | no | UTC |
| `updated_at` | timestamptz | no | UTC |

Constraints and indexes:

- Primary key `pk_comments`.
- FKs with cascade on post deletion and restrict on user deletion.
- Check constraints for non-blank content and maximum length.
- Indexes `ix_comments_post_id`, `ix_comments_author_id`,
  `ix_comments_created_at`.

### `post_likes`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer | no | Primary key |
| `post_id` | integer | no | FK to `posts.id`, `ON DELETE CASCADE` |
| `user_id` | integer | no | FK to `users.id`, `ON DELETE CASCADE` |
| `created_at` | timestamptz | no | UTC |
| `updated_at` | timestamptz | no | UTC |

Constraints and indexes:

- Unique constraint `uq_post_likes_post_id_user_id` prevents duplicate likes.
- FKs cascade on post/user deletion.
- Indexes on `post_id`, `user_id`, and `created_at`.

### `bookmarks`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer | no | Primary key |
| `user_id` | integer | no | FK to `users.id`, `ON DELETE CASCADE` |
| `post_id` | integer | no | FK to `posts.id`, `ON DELETE CASCADE` |
| `collection` | varchar(80) | yes | Optional user-defined shelf label |
| `created_at` | timestamptz | no | UTC |
| `updated_at` | timestamptz | no | UTC |

Constraints and indexes:

- Unique constraint `uq_bookmarks_user_id_post_id` prevents duplicate saves.
- FKs cascade on post/user deletion.
- Indexes on `user_id`, `post_id`, and `created_at`.

## Cascade and integrity behavior

| Operation | Result |
|---|---|
| Delete a post | Its comments, likes, and bookmarks are deleted by the database |
| Delete a user with posts/comments | Restricted by `ON DELETE RESTRICT`; application has no user-delete endpoint |
| Delete a user with only likes/bookmarks | Cascades those engagement rows |
| Duplicate username/email | Unique constraint; API returns 409 |
| Duplicate like/bookmark | Unique constraint; service returns the existing state |
| Invalid `post_id` on comment create | 404; no orphan row |
| Invalid author ID supplied by client | Rejected by schema (`extra="forbid"`); server uses the JWT user |

## Migration history

| Revision | Purpose |
|---|---|
| `0001_initial` | Users, posts, comments, core constraints/indexes |
| `0002_post_cover_image` | Legacy nullable `posts.cover_image_url` |
| `0003_post_cover_image_path` | Relative `posts.cover_image_path`; copies legacy local URLs |
| `0004_engagement_profiles` | User display name/bio, post excerpt/topic, likes, bookmarks |
| `0005_user_avatar` | Nullable `users.avatar_path` |

All revisions have a downgrade path for intentional rollback. Do not use
`Base.metadata.create_all()` as a production substitute for migrations, and do
not reset or drop an existing database to apply changes.

## PostgreSQL verification evidence

The opt-in integration suite ran against a disposable PostgreSQL 18 cluster on
`127.0.0.1:55432`; it applies the real migrations, verifies timestamp awareness,
cascade/restrict behavior, constraints, and ownership, then downgrades its
dedicated test schema. It refuses to run against a database whose name does not
contain `test`.

The configured application database on `127.0.0.1:5432` was verified separately:

```text
alembic current
  0005_user_avatar (head)

alembic check
  No new upgrade operations detected.
```

The configured `blog_user` credential authenticates, `/health` returns `200`
with `"database": "reachable"`, and the live PostgreSQL API E2E passed `49/49`
checks against that database. No database was reset, dropped, or modified.
