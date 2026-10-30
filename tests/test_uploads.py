"""Real image upload, storage, and post-reference tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.models.post import Post
from tests.helpers import create_post, create_user_and_login, upload_image
from tests.image_data import JPEG_2X2, PNG_1X1, WEBP_1X1


@pytest.mark.parametrize(
    ("content", "filename", "media_type", "expected_type"),
    [
        (PNG_1X1, "cover.png", "image/png", "image/png"),
        (JPEG_2X2, "cover.jpg", "image/jpeg", "image/jpeg"),
        (WEBP_1X1, "cover.webp", "image/webp", "image/webp"),
    ],
)
def test_upload_accepts_real_supported_images(
    client: TestClient,
    author_headers: dict[str, str],
    upload_dir: Path,
    content: bytes,
    filename: str,
    media_type: str,
    expected_type: str,
) -> None:
    response = upload_image(
        client,
        author_headers,
        content=content,
        filename=filename,
        media_type=media_type,
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["path"].startswith("covers/")
    assert body["path"].endswith(Path(filename).suffix)
    assert body["url"] == f"/uploads/{body['path']}"
    assert body["content_type"] == expected_type
    assert body["size"] == len(content)
    assert (upload_dir / body["path"]).is_file()

    served = client.get(body["url"])
    assert served.status_code == 200
    assert served.content == content
    assert served.headers["content-type"] == expected_type
    assert "immutable" in served.headers["cache-control"]


def test_upload_requires_authentication(client: TestClient, upload_dir: Path) -> None:
    response = upload_image(client, {}, content=PNG_1X1)

    assert response.status_code == 401


def test_upload_rejects_text_disguised_as_an_image(
    client: TestClient, author_headers: dict[str, str], upload_dir: Path
) -> None:
    response = upload_image(
        client,
        author_headers,
        content=b"<script>alert('not an image')</script>",
        filename="cover.png",
    )

    assert response.status_code == 415
    assert "JPEG" in response.json()["detail"]


def test_upload_rejects_empty_files(
    client: TestClient, author_headers: dict[str, str], upload_dir: Path
) -> None:
    response = upload_image(client, author_headers, content=b"")

    assert response.status_code == 422
    assert "empty" in response.json()["detail"].lower()


def test_upload_rejects_oversized_files(
    client: TestClient,
    author_headers: dict[str, str],
    upload_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "upload_max_size_mb", 1)
    oversized = PNG_1X1 + (b"x" * (1024 * 1024 + 1))

    response = upload_image(client, author_headers, content=oversized)

    assert response.status_code == 413
    assert "1 MB" in response.json()["detail"]


def test_static_upload_route_rejects_path_traversal(
    client: TestClient, upload_dir: Path
) -> None:
    (upload_dir.parent / "secret.txt").write_text("not public", encoding="utf-8")

    for path in (
        "/uploads/..%2Fsecret.txt",
        "/uploads/covers/%2E%2E/%2E%2E/secret.txt",
        "/uploads/../secret.txt",
    ):
        response = client.get(path)
        assert response.status_code == 404, path


def test_create_post_with_uploaded_image_persists_relative_reference(
    client: TestClient,
    author_headers: dict[str, str],
    upload_dir: Path,
    db_session,
) -> None:
    uploaded = upload_image(client, author_headers, content=PNG_1X1).json()

    response = create_post(
        client,
        author_headers,
        title="A story with a real cover",
        cover_image_path=uploaded["path"],
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["cover_image_path"] == uploaded["path"]
    assert body["cover_image_url"] is None
    assert body["comment_count"] == 0

    persisted = db_session.get(Post, body["id"])
    assert persisted is not None
    assert persisted.cover_image_path == uploaded["path"]

    detail = client.get(f"/posts/{body['id']}")
    assert detail.status_code == 200
    assert detail.json()["cover_image_path"] == uploaded["path"]
    assert client.get(uploaded["url"]).content == PNG_1X1


def test_create_post_rejects_unknown_or_remote_image_references(
    client: TestClient, author_headers: dict[str, str], upload_dir: Path
) -> None:
    unknown_path = "covers/2026/10/" + "a" * 32 + ".png"
    unknown = create_post(
        client, author_headers, cover_image_path=unknown_path
    )
    remote = client.post(
        "/posts",
        headers=author_headers,
        json={
            "title": "Remote",
            "content": "Body.",
            "cover_image_url": "https://cdn.example.com/cover.jpg",
        },
    )
    traversal = create_post(
        client,
        author_headers,
        cover_image_path="../outside.png",
    )

    assert unknown.status_code == 422
    assert remote.status_code == 422
    assert traversal.status_code == 422
    assert client.get("/posts").json()["total"] == 0


def test_replacing_and_deleting_a_post_cleans_up_unused_files(
    client: TestClient,
    author_headers: dict[str, str],
    upload_dir: Path,
) -> None:
    first = upload_image(client, author_headers, content=PNG_1X1).json()
    second = upload_image(client, author_headers, content=JPEG_2X2).json()
    created = create_post(
        client, author_headers, cover_image_path=first["path"]
    ).json()
    assert (upload_dir / first["path"]).is_file()

    replaced = client.put(
        f"/posts/{created['id']}",
        headers=author_headers,
        json={
            "title": "Updated",
            "content": "Updated content.",
            "cover_image_path": second["path"],
        },
    )

    assert replaced.status_code == 200, replaced.text
    assert replaced.json()["cover_image_path"] == second["path"]
    assert not (upload_dir / first["path"]).exists()
    assert (upload_dir / second["path"]).is_file()

    deleted = client.delete(f"/posts/{created['id']}", headers=author_headers)

    assert deleted.status_code == 204
    assert not (upload_dir / second["path"]).exists()


def test_my_posts_endpoint_is_authenticated_and_server_side_filtered(
    client: TestClient,
) -> None:
    alice_id, alice_headers = create_user_and_login(client, username="alice")
    bob_id, bob_headers = create_user_and_login(
        client, username="bob", email="bob@example.com"
    )
    alice_post = create_post(client, alice_headers, title="Alice only").json()
    bob_post = create_post(client, bob_headers, title="Bob only").json()

    unauthenticated = client.get("/posts/mine")
    alice_posts = client.get("/posts/mine", headers=alice_headers)
    bob_posts = client.get("/posts/mine", headers=bob_headers)

    assert unauthenticated.status_code == 401
    assert alice_posts.status_code == 200
    assert bob_posts.status_code == 200
    assert [item["id"] for item in alice_posts.json()["items"]] == [alice_post["id"]]
    assert [item["id"] for item in bob_posts.json()["items"]] == [bob_post["id"]]
    assert alice_posts.json()["items"][0]["author_id"] == alice_id
    assert bob_posts.json()["items"][0]["author_id"] == bob_id

    searched = client.get(
        "/posts/mine", headers=alice_headers, params={"search": "Alice only"}
    )
    assert searched.status_code == 200
    assert searched.json()["total"] == 1
    assert searched.json()["items"][0]["id"] == alice_post["id"]


def test_community_feed_includes_real_comment_counts(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    post = create_post(client, author_headers).json()
    comment = client.post(
        "/comments",
        headers=author_headers,
        json={"post_id": post["id"], "content": "A real response."},
    )
    assert comment.status_code == 201, comment.text

    feed = client.get("/posts").json()
    detail = client.get(f"/posts/{post['id']}").json()

    assert feed["items"][0]["comment_count"] == 1
    assert detail["comment_count"] == 1
