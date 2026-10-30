"""Small helpers shared by endpoint tests."""

from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

DEFAULT_PASSWORD = "StrongPass123"


def register_user(
    client: TestClient,
    *,
    username: str = "alice",
    email: str | None = None,
    password: str = DEFAULT_PASSWORD,
) -> Any:
    return client.post(
        "/register",
        json={
            "username": username,
            "email": email or f"{username}@example.com",
            "password": password,
        },
    )


def login_user(
    client: TestClient,
    *,
    email: str = "alice@example.com",
    password: str = DEFAULT_PASSWORD,
) -> Any:
    return client.post("/login", json={"email": email, "password": password})


def auth_headers(
    client: TestClient,
    *,
    email: str = "alice@example.com",
    password: str = DEFAULT_PASSWORD,
) -> dict[str, str]:
    response = login_user(client, email=email, password=password)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_user_and_login(
    client: TestClient,
    *,
    username: str = "alice",
    email: str | None = None,
    password: str = DEFAULT_PASSWORD,
) -> tuple[int, dict[str, str]]:
    response = register_user(
        client, username=username, email=email, password=password
    )
    assert response.status_code == 201, response.text
    headers = auth_headers(
        client, email=email or f"{username}@example.com", password=password
    )
    return response.json()["id"], headers


def create_post(
    client: TestClient,
    headers: dict[str, str],
    *,
    title: str = "A test post",
    content: str = "A test post content.",
    excerpt: str | None = None,
    topic: str | None = None,
    cover_image_path: str | None = None,
) -> Any:
    payload: dict[str, object] = {"title": title, "content": content}
    if excerpt is not None:
        payload["excerpt"] = excerpt
    if topic is not None:
        payload["topic"] = topic
    if cover_image_path is not None:
        payload["cover_image_path"] = cover_image_path
    return client.post("/posts", headers=headers, json=payload)


def upload_image(
    client: TestClient,
    headers: dict[str, str],
    *,
    content: bytes,
    filename: str = "cover.png",
    media_type: str = "image/png",
) -> Any:
    return client.post(
        "/uploads/images",
        headers=headers,
        files={"file": (filename, content, media_type)},
    )


def upload_avatar(
    client: TestClient,
    headers: dict[str, str],
    *,
    content: bytes,
    filename: str = "avatar.png",
    media_type: str = "image/png",
) -> Any:
    return client.post(
        "/users/me/avatar",
        headers=headers,
        files={"file": (filename, content, media_type)},
    )


def create_comment(
    client: TestClient,
    headers: dict[str, str],
    post_id: int,
    *,
    content: str = "A test comment.",
) -> Any:
    return client.post(
        "/comments",
        headers=headers,
        json={"post_id": post_id, "content": content},
    )
