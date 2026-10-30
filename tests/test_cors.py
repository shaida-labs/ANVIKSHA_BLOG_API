"""CORS behavior for the browser frontend."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_cors_preflight_allows_the_configured_frontend_origin(
    client: TestClient,
) -> None:
    response = client.options(
        "/posts",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "GET" in response.headers["access-control-allow-methods"]
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_cors_preflight_rejects_an_unconfigured_origin(
    client: TestClient,
) -> None:
    response = client.options(
        "/posts",
        headers={
            "Origin": "https://unexpected.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
