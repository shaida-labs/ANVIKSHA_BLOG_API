"""Alembic migration tests that do not require a live PostgreSQL server.

The initial migration uses PostgreSQL's ``now()`` as a server default, which
SQLite rejects. These tests therefore create a minimal pre-migration ``posts``
table, stamp the baseline revision, and run only the cover-image migration.
"""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _alembic_config(database_url: str) -> Config:
    config = Config(str(PROJECT_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(PROJECT_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


def test_cover_image_migration_is_safe_for_existing_posts(tmp_path: Path) -> None:
    database_path = tmp_path / "migration.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    engine = create_engine(database_url)

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    username VARCHAR(50) NOT NULL,
                    email VARCHAR(254) NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE posts (
                    id INTEGER PRIMARY KEY,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    author_id INTEGER NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO posts
                    (id, title, content, author_id, created_at, updated_at)
                VALUES
                    (1, 'Legacy post', 'Still readable.', 1,
                     '2026-01-01 00:00:00', '2026-01-01 00:00:00')
                """
            )
        )

    config = _alembic_config(database_url)
    command.stamp(config, "0001_initial")
    command.upgrade(config, "head")

    columns = {
        column["name"]: column for column in inspect(engine).get_columns("posts")
    }
    assert "cover_image_url" in columns
    assert columns["cover_image_url"]["nullable"] is True
    assert "cover_image_path" in columns
    assert columns["cover_image_path"]["nullable"] is True
    assert "excerpt" in columns
    assert columns["excerpt"]["nullable"] is True
    assert "topic" in columns
    assert columns["topic"]["nullable"] is True

    user_columns = {
        column["name"]: column for column in inspect(engine).get_columns("users")
    }
    assert user_columns["display_name"]["nullable"] is True
    assert user_columns["bio"]["nullable"] is True
    assert user_columns["avatar_path"]["nullable"] is True
    assert {"post_likes", "bookmarks"} <= set(inspect(engine).get_table_names())

    with engine.begin() as connection:
        legacy = connection.execute(
            text(
                "SELECT title, cover_image_url, cover_image_path "
                "FROM posts WHERE id = 1"
            )
        ).one()
        assert legacy.title == "Legacy post"
        assert legacy.cover_image_url is None
        assert legacy.cover_image_path is None

        connection.execute(
            text(
                "UPDATE posts SET cover_image_url = "
                "'https://cdn.example.com/covers/legacy.jpg' WHERE id = 1"
            )
        )
        updated = connection.execute(
            text("SELECT cover_image_url FROM posts WHERE id = 1")
        ).scalar_one()
        assert updated == "https://cdn.example.com/covers/legacy.jpg"

        # New rows may still omit the nullable image column.
        connection.execute(
            text(
                """
                INSERT INTO posts
                    (id, title, content, author_id, created_at, updated_at)
                VALUES
                    (2, 'New post', 'Body.', 1,
                     '2026-01-02 00:00:00', '2026-01-02 00:00:00')
                """
            )
        )
        assert (
            connection.execute(
                text("SELECT cover_image_url FROM posts WHERE id = 2")
            ).scalar_one()
            is None
        )

    command.downgrade(config, "0001_initial")

    downgraded_columns = {
        column["name"] for column in inspect(engine).get_columns("posts")
    }
    assert "cover_image_url" not in downgraded_columns
    assert "cover_image_path" not in downgraded_columns
    assert "excerpt" not in downgraded_columns
    assert "topic" not in downgraded_columns
    downgraded_user_columns = {
        column["name"] for column in inspect(engine).get_columns("users")
    }
    assert "avatar_path" not in downgraded_user_columns
    assert "post_likes" not in inspect(engine).get_table_names()
    assert "bookmarks" not in inspect(engine).get_table_names()
    with engine.begin() as connection:
        assert (
            connection.execute(text("SELECT count(*) FROM posts")).scalar_one() == 2
        )

    engine.dispose()


def test_local_upload_url_is_backfilled_into_cover_image_path(
    tmp_path: Path,
) -> None:
    database_path = tmp_path / "backfill.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    engine = create_engine(database_url)
    legacy_path = "covers/2026/10/" + "b" * 32 + ".jpg"

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE posts (
                    id INTEGER PRIMARY KEY,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    cover_image_url VARCHAR(2048),
                    author_id INTEGER NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO posts
                    (id, title, content, cover_image_url, author_id,
                     created_at, updated_at)
                VALUES
                    (1, 'Local image', 'Body.', :cover_url, 1,
                     '2026-01-01 00:00:00', '2026-01-01 00:00:00')
                """
            ),
            {"cover_url": f"/uploads/{legacy_path}"},
        )

    config = _alembic_config(database_url)
    command.stamp(config, "0002_post_cover_image")
    command.upgrade(config, "0003_post_cover_image_path")

    with engine.begin() as connection:
        row = connection.execute(
            text("SELECT cover_image_url, cover_image_path FROM posts WHERE id = 1")
        ).one()
        assert row.cover_image_url == f"/uploads/{legacy_path}"
        assert row.cover_image_path == legacy_path

    engine.dispose()
