"""Health, OpenAPI, documentation, and security-header tests."""

from __future__ import annotations

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.db.session import get_db
from app.main import app


def test_root_returns_project_metadata(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Welcome to the ANVIKSHA API",
        "project_id": "ANVIKSHA",
        "status": "running",
        "docs": "/docs",
    }


def test_health_reports_database_reachable(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "database": "reachable",
        "service": "anviksha-api",
        "project_id": "ANVIKSHA",
    }


def test_health_returns_503_without_leaking_database_details(
    client: TestClient,
) -> None:
    class FailingSession:
        def execute(self, *args, **kwargs):
            raise OperationalError(
                "SELECT 1", {}, Exception("secret connection detail")
            )

        def rollback(self) -> None:
            raise OperationalError(
                "ROLLBACK", {}, Exception("connection already lost")
            )

    def failing_db() -> Generator[FailingSession, None, None]:
        yield FailingSession()

    app.dependency_overrides[get_db] = failing_db

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["detail"] == "Database is unavailable."
    assert "secret connection detail" not in response.text


def test_swagger_and_redoc_are_available(client: TestClient) -> None:
    docs = client.get("/docs")
    redoc = client.get("/redoc")

    assert docs.status_code == 200
    assert "swagger" in docs.text.lower()
    assert redoc.status_code == 200
    assert "redoc" in redoc.text.lower()


def test_openapi_documents_all_endpoints_and_bearer_auth(
    client: TestClient,
) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    spec = response.json()
    expected_paths = {
        "/",
        "/health",
        "/register",
        "/login",
        "/users/me",
        "/posts",
        "/posts/mine",
        "/posts/{post_id}",
        "/comments",
        "/comments/{comment_id}",
        "/uploads/images",
    }
    assert expected_paths.issubset(spec["paths"].keys())

    schemes = spec["components"]["securitySchemes"]
    assert any(
        scheme.get("type") == "http" and scheme.get("scheme") == "bearer"
        for scheme in schemes.values()
    )

    assert spec["paths"]["/posts"]["post"]["security"]
    assert spec["paths"]["/posts/{post_id}"]["put"]["security"]
    assert spec["paths"]["/comments"]["post"]["security"]

    update_responses = spec["paths"]["/posts/{post_id}"]["put"]["responses"]
    assert "401" in update_responses
    assert "403" in update_responses
    assert "404" in update_responses
    assert "422" in update_responses


def test_security_headers_are_present(client: TestClient) -> None:
    response = client.get("/")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
