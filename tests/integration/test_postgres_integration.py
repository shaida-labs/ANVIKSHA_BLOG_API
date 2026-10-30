"""Opt-in PostgreSQL integration tests.

Set TEST_DATABASE_URL to a dedicated PostgreSQL database whose name contains
"test", then run:

    python -m pytest -m integration -v

The module refuses to run against a database name that does not contain
"test", and drops/recreates only the tables inside that dedicated database.
"""

from __future__ import annotations

import os
from collections.abc import Generator
from datetime import datetime
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.core.security import verify_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from tests.helpers import auth_headers, create_comment, create_post, register_user

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

if not TEST_DATABASE_URL:
    pytest.skip(
        "TEST_DATABASE_URL is not set; PostgreSQL integration tests skipped.",
        allow_module_level=True,
    )

if TEST_DATABASE_URL.startswith("postgres://"):
    TEST_DATABASE_URL = "postgresql+psycopg://" + TEST_DATABASE_URL.removeprefix(
        "postgres://"
    )
elif TEST_DATABASE_URL.startswith("postgresql://"):
    TEST_DATABASE_URL = "postgresql+psycopg://" + TEST_DATABASE_URL.removeprefix(
        "postgresql://"
    )

parsed_url = make_url(TEST_DATABASE_URL)
if parsed_url.get_backend_name() != "postgresql" or not parsed_url.drivername.startswith(
    "postgresql+psycopg"
):
    pytest.skip(
        "TEST_DATABASE_URL must use the postgresql+psycopg dialect.",
        allow_module_level=True,
    )

if not parsed_url.database or "test" not in parsed_url.database.lower():
    pytest.skip(
        "Refusing to run: the PostgreSQL test database name must contain 'test'.",
        allow_module_level=True,
    )

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def pg_engine() -> Generator[Engine, None, None]:
    project_root = Path(__file__).resolve().parents[2]
    alembic_config = Config(str(project_root / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(project_root / "alembic"))
    alembic_config.set_main_option(
        "sqlalchemy.url", TEST_DATABASE_URL.replace("%", "%%")
    )

    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, future=True)
    with engine.begin() as connection:
        Base.metadata.drop_all(bind=connection)
        connection.execute(text("DROP TABLE IF EXISTS alembic_version"))

    # Validate the real migration, not just ORM metadata creation.
    command.upgrade(alembic_config, "head")

    try:
        yield engine
    finally:
        engine.dispose()
        command.downgrade(alembic_config, "base")


@pytest.fixture(autouse=True)
def clean_tables(pg_engine: Engine) -> Generator[None, None, None]:
    with pg_engine.begin() as connection:
        connection.execute(
            text("TRUNCATE TABLE comments, posts, users RESTART IDENTITY CASCADE")
        )
    yield


@pytest.fixture()
def pg_session_factory(pg_engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(
        bind=pg_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )


@pytest.fixture()
def pg_client(
    pg_session_factory: sessionmaker[Session],
) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        db = pg_session_factory()
        try:
            yield db
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_full_workflow_and_utc_timestamps(
    pg_client: TestClient, pg_session_factory: sessionmaker[Session]
) -> None:
    registered = register_user(
        pg_client, username="pg_alice", email="pg_alice@example.com"
    )
    assert registered.status_code == 201, registered.text
    headers = auth_headers(pg_client, email="pg_alice@example.com")
    post = create_post(pg_client, headers, title="PostgreSQL post")
    assert post.status_code == 201, post.text
    comment = create_comment(
        pg_client, headers, post.json()["id"], content="PostgreSQL comment"
    )
    assert comment.status_code == 201, comment.text

    with pg_session_factory() as db:
        user = db.scalar(select(User).where(User.username == "pg_alice"))
        assert user is not None
        assert verify_password("StrongPass123", user.hashed_password)
        assert user.created_at.tzinfo is not None
        assert user.updated_at.tzinfo is not None
        assert db.scalar(select(func.count()).select_from(Post)) == 1
        assert db.scalar(select(func.count()).select_from(Comment)) == 1

    listed = pg_client.get("/posts")
    assert listed.status_code == 200
    assert listed.json()["items"][0]["author"]["username"] == "pg_alice"
    created_at = datetime.fromisoformat(listed.json()["items"][0]["created_at"])
    assert created_at.tzinfo is not None


def test_postgres_cascade_deletes_comments(
    pg_client: TestClient, pg_session_factory: sessionmaker[Session]
) -> None:
    assert register_user(pg_client).status_code == 201
    headers = auth_headers(pg_client)
    post = create_post(pg_client, headers)
    post_id = post.json()["id"]
    assert create_comment(pg_client, headers, post_id).status_code == 201

    response = pg_client.delete(f"/posts/{post_id}", headers=headers)

    assert response.status_code == 204
    with pg_session_factory() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(Comment)
                .where(Comment.post_id == post_id)
            )
            == 0
        )


def test_postgres_restricts_deleting_user_with_content(
    pg_client: TestClient, pg_session_factory: sessionmaker[Session]
) -> None:
    registered = register_user(pg_client)
    assert registered.status_code == 201
    user_id = registered.json()["id"]
    headers = auth_headers(pg_client)
    assert create_post(pg_client, headers).status_code == 201

    with pg_session_factory() as db:
        user = db.get(User, user_id)
        assert user is not None
        db.delete(user)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

    with pg_session_factory() as db:
        assert db.get(User, user_id) is not None


def test_postgres_ownership_and_auth_flow(pg_client: TestClient) -> None:
    assert register_user(pg_client, username="owner").status_code == 201
    assert (
        register_user(
            pg_client, username="intruder", email="intruder@example.com"
        ).status_code
        == 201
    )
    owner_headers = auth_headers(pg_client, email="owner@example.com")
    intruder_headers = auth_headers(
        pg_client, email="intruder@example.com"
    )
    post = create_post(pg_client, owner_headers)
    post_id = post.json()["id"]

    update = pg_client.put(
        f"/posts/{post_id}",
        headers=intruder_headers,
        json={"title": "Hijacked", "content": "Hijacked"},
    )
    delete = pg_client.delete(f"/posts/{post_id}", headers=intruder_headers)

    assert update.status_code == 403
    assert delete.status_code == 403
    assert pg_client.get(f"/posts/{post_id}").json()["title"] == "A test post"
