"""Profile picture upload, persistence, and cleanup tests."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from tests.helpers import (
    create_comment,
    create_post,
    create_user_and_login,
    upload_avatar,
)
from tests.image_data import JPEG_2X2, PNG_1X1


def test_avatar_upload_persists_and_is_exposed_on_public_content(
    client: TestClient,
    upload_dir: Path,
) -> None:
    _, headers = create_user_and_login(client, username="alice")

    response = upload_avatar(client, headers, content=PNG_1X1)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["avatar_path"].startswith("avatars/")
    assert (upload_dir / body["avatar_path"]).is_file()
    assert client.get(f"/uploads/{body['avatar_path']}").content == PNG_1X1

    current_user = client.get("/users/me", headers=headers)
    public_profile = client.get("/users/alice")

    assert current_user.status_code == 200
    assert current_user.json()["avatar_path"] == body["avatar_path"]
    assert public_profile.status_code == 200
    assert public_profile.json()["avatar_path"] == body["avatar_path"]

    post = create_post(client, headers, title="A story with a face")
    assert post.status_code == 201, post.text
    assert post.json()["author"]["avatar_path"] == body["avatar_path"]

    comment = create_comment(client, headers, post.json()["id"])
    assert comment.status_code == 201, comment.text
    assert comment.json()["author"]["avatar_path"] == body["avatar_path"]


def test_replacing_an_avatar_removes_the_previous_file(
    client: TestClient,
    upload_dir: Path,
) -> None:
    _, headers = create_user_and_login(client, username="alice")

    first = upload_avatar(client, headers, content=PNG_1X1).json()
    second = upload_avatar(client, headers, content=JPEG_2X2).json()

    assert first["avatar_path"] != second["avatar_path"]
    assert not (upload_dir / first["avatar_path"]).exists()
    assert (upload_dir / second["avatar_path"]).is_file()


def test_removing_an_avatar_clears_the_profile_and_deletes_the_file(
    client: TestClient,
    upload_dir: Path,
) -> None:
    _, headers = create_user_and_login(client, username="alice")
    uploaded = upload_avatar(client, headers, content=PNG_1X1).json()

    removed = client.delete("/users/me/avatar", headers=headers)

    assert removed.status_code == 200, removed.text
    assert removed.json()["avatar_path"] is None
    assert not (upload_dir / uploaded["avatar_path"]).exists()
    assert client.get("/users/alice").json()["avatar_path"] is None


def test_avatar_upload_requires_authentication(client: TestClient) -> None:
    response = upload_avatar(client, {}, content=PNG_1X1)

    assert response.status_code == 401


def test_avatar_upload_rejects_non_image_bytes(
    client: TestClient,
    upload_dir: Path,
) -> None:
    _, headers = create_user_and_login(client, username="alice")

    response = upload_avatar(
        client,
        headers,
        content=b"<script>alert('not an image')</script>",
    )

    assert response.status_code == 415
    assert "JPEG" in response.json()["detail"]


def test_profile_edit_preserves_the_avatar(
    client: TestClient,
) -> None:
    _, headers = create_user_and_login(client, username="alice")
    uploaded = upload_avatar(client, headers, content=PNG_1X1).json()

    updated = client.patch(
        "/users/me",
        headers=headers,
        json={"display_name": "Alice", "bio": "Reader and writer."},
    )

    assert updated.status_code == 200, updated.text
    assert updated.json()["avatar_path"] == uploaded["avatar_path"]
