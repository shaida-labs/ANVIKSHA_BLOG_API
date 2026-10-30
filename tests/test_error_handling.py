"""Safe error handling tests for unexpected and database failures."""

from __future__ import annotations

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.db.session import get_db
from app.main import app


def test_unexpected_exception_returns_generic_500() -> None:
    def failing_db() -> Generator[None, None, None]:
        raise RuntimeError("secret internal detail")
        yield

    app.dependency_overrides[get_db] = failing_db
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/health")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 500
    assert response.json() == {"detail": "An unexpected error occurred."}
    assert "secret internal detail" not in response.text
    assert "RuntimeError" not in response.text
    assert "Traceback" not in response.text


def test_database_error_returns_generic_500_without_details() -> None:
    class FailingSession:
        def scalar(self, *args, **kwargs):
            raise OperationalError(
                "SELECT count(*)", {}, Exception("secret database detail")
            )

        def scalars(self, *args, **kwargs):
            raise OperationalError(
                "SELECT posts", {}, Exception("secret database detail")
            )

        def execute(self, *args, **kwargs):
            raise OperationalError(
                "SELECT posts", {}, Exception("secret database detail")
            )

        def get(self, *args, **kwargs):
            raise OperationalError(
                "SELECT post", {}, Exception("secret database detail")
            )

    def failing_db() -> Generator[FailingSession, None, None]:
        yield FailingSession()

    app.dependency_overrides[get_db] = failing_db
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/posts")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 500
    assert response.json() == {"detail": "A database error occurred."}
    assert "secret database detail" not in response.text
    assert "SELECT" not in response.text
    assert "Traceback" not in response.text
