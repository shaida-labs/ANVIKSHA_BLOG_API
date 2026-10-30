"""Database engine behavior shared by local SQLite and production PostgreSQL."""

from __future__ import annotations

from app.db.session import engine


def test_sqlite_connections_enforce_foreign_keys() -> None:
    with engine.connect() as connection:
        enabled = connection.exec_driver_sql("PRAGMA foreign_keys").scalar()

    assert enabled == 1
