"""Blog post endpoint tests."""

from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.post import Post
from tests.helpers import (
    create_post,
    create_user_and_login,
    upload_image,
)
from tests.image_data import JPEG_2X2, PNG_1X1


def test_create_post_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/posts", json={"title": "Title", "content": "Content"}
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_create_post_uses_authenticated_author(
    client: TestClient, db_session: Session
) -> None:
    user_id, headers = create_user_and_login(client)

    response = create_post(
        client, headers, title="  First post  ", content="Post body."
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["title"] == "First post"
    assert body["author_id"] == user_id
    assert body["author"] == {
        "id": user_id,
        "username": "alice",
        "display_name": None,
        "avatar_path": None,
    }
    assert datetime.fromisoformat(body["created_at"]) == datetime.fromisoformat(
        body["updated_at"]
    )

    persisted = db_session.scalar(select(Post).where(Post.id == body["id"]))
    assert persisted is not None
    assert persisted.title == "First post"
    assert persisted.author_id == user_id


def test_create_post_with_uploaded_cover_image(
    client: TestClient,
    author_headers: dict[str, str],
    db_session: Session,
    upload_dir,
) -> None:
    uploaded = upload_image(
        client, author_headers, content=PNG_1X1, filename="cover.png"
    )
    assert uploaded.status_code == 201, uploaded.text
    cover_path = uploaded.json()["path"]

    response = create_post(
        client,
        author_headers,
        title="Getting started with Python",
        cover_image_path=cover_path,
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["cover_image_path"] == cover_path
    assert body["cover_image_url"] is None

    persisted = db_session.get(Post, body["id"])
    assert persisted is not None
    assert persisted.cover_image_path == cover_path


def test_create_post_without_cover_image_returns_null(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    response = create_post(client, author_headers, title="No cover")

    assert response.status_code == 201, response.text
    assert response.json()["cover_image_path"] is None
    assert response.json()["cover_image_url"] is None


def test_general_topic_is_normalized_and_legacy_rows_are_grouped(
    client: TestClient, db_session: Session
) -> None:
    _, headers = create_user_and_login(client)

    normalized = create_post(
        client,
        headers,
        title="General thoughts",
        content="A story without a named thread.",
        topic="  General  ",
    )
    assert normalized.status_code == 201, normalized.text
    normalized_body = normalized.json()
    assert normalized_body["topic"] is None

    persisted = db_session.get(Post, normalized_body["id"])
    assert persisted is not None
    assert persisted.topic is None

    # Older rows may still contain the literal label. Reads should treat it
    # as the same General bucket instead of creating a duplicate topic entry.
    legacy = create_post(
        client,
        headers,
        title="Legacy general thoughts",
        content="A story written before topic normalization.",
        topic="Science",
    )
    assert legacy.status_code == 201, legacy.text
    legacy_post = db_session.get(Post, legacy.json()["id"])
    assert legacy_post is not None
    legacy_post.topic = "General"
    db_session.commit()

    general_posts = client.get("/posts", params={"topic": "General"})
    assert general_posts.status_code == 200
    assert {item["id"] for item in general_posts.json()["items"]} == {
        normalized_body["id"],
        legacy.json()["id"],
    }

    topics = client.get("/topics")
    assert topics.status_code == 200
    assert [item for item in topics.json() if item["name"] == "General"] == [
        {"name": "General", "count": 2}
    ]


def test_create_post_rejects_client_supplied_author_id(
    client: TestClient,
) -> None:
    _, headers = create_user_and_login(client)

    response = client.post(
        "/posts",
        headers=headers,
        json={
            "title": "Hijacked",
            "content": "Should not be created.",
            "author_id": 999,
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("title", "content"),
    [
        ("", "Content"),
        ("   ", "Content"),
        ("Title", ""),
        ("Title", "   \n\t "),
    ],
)
def test_create_post_rejects_empty_fields(
    client: TestClient, author_headers: dict[str, str], title: str, content: str
) -> None:
    response = client.post(
        "/posts",
        headers=author_headers,
        json={"title": title, "content": content},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "cover_image_path",
    [
        "not-an-image",
        "../outside.png",
        "/uploads/covers/2026/10/" + "a" * 32 + ".png",
        "covers/2026/10/" + "a" * 31 + ".png",
        "covers/2026/10/" + "a" * 32 + ".gif",
    ],
)
def test_create_post_rejects_invalid_cover_image_paths(
    client: TestClient, author_headers: dict[str, str], cover_image_path: str
) -> None:
    response = create_post(
        client, author_headers, cover_image_path=cover_image_path
    )

    assert response.status_code == 422
    assert client.get("/posts").json()["total"] == 0


def test_list_posts_is_public_and_newest_first(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    created_ids = []
    for title in ["Alpha", "Beta", "Gamma"]:
        response = create_post(client, author_headers, title=title)
        assert response.status_code == 201
        created_ids.append(response.json()["id"])

    response = client.get("/posts")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["limit"] == 20
    assert body["offset"] == 0
    assert [item["id"] for item in body["items"]] == list(reversed(created_ids))
    assert all(item["author"]["username"] == "alice" for item in body["items"])


def test_pagination_returns_metadata_and_slices(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    ids = []
    for index in range(3):
        response = create_post(client, author_headers, title=f"Post {index}")
        assert response.status_code == 201
        ids.append(response.json()["id"])

    response = client.get("/posts", params={"limit": 2, "offset": 1})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["limit"] == 2
    assert body["offset"] == 1
    assert [item["id"] for item in body["items"]] == [ids[1], ids[0]]


@pytest.mark.parametrize(
    "params",
    [
        {"limit": 0},
        {"limit": 101},
        {"limit": "not-an-int"},
        {"offset": -1},
        {"sort": "bogus"},
        {"search": "x" * 201},
    ],
)
def test_list_posts_rejects_invalid_query_parameters(
    client: TestClient, params: dict[str, object]
) -> None:
    response = client.get("/posts", params=params)

    assert response.status_code == 422


def test_post_search_is_case_insensitive_and_escapes_wildcards(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    assert create_post(client, author_headers, title="Python Tips").status_code == 201
    assert create_post(client, author_headers, title="Cooking Tips").status_code == 201
    assert create_post(client, author_headers, title="100% Python").status_code == 201
    assert create_post(client, author_headers, title="1000 Python").status_code == 201

    search_response = client.get("/posts", params={"search": "PYTHON"})
    wildcard_response = client.get("/posts", params={"search": "100%"})

    assert search_response.status_code == 200
    assert search_response.json()["total"] == 3
    assert wildcard_response.status_code == 200
    wildcard_titles = [item["title"] for item in wildcard_response.json()["items"]]
    assert wildcard_titles == ["100% Python"]


def test_post_sort_by_title(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    for title in ["Zebra", "apple", "Mango"]:
        assert create_post(client, author_headers, title=title).status_code == 201

    response = client.get("/posts", params={"sort": "title"})

    assert response.status_code == 200
    assert [item["title"] for item in response.json()["items"]] == [
        "apple",
        "Mango",
        "Zebra",
    ]


def test_get_single_post_and_missing_post(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    created = create_post(client, author_headers)
    assert created.status_code == 201
    post_id = created.json()["id"]

    response = client.get(f"/posts/{post_id}")
    missing = client.get("/posts/999999")

    assert response.status_code == 200
    assert response.json()["id"] == post_id
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Post not found."


def test_list_and_get_post_include_uploaded_cover_image(
    client: TestClient, author_headers: dict[str, str], upload_dir
) -> None:
    uploaded = upload_image(
        client, author_headers, content=PNG_1X1, filename="cover.png"
    ).json()
    cover_path = uploaded["path"]
    with_cover = create_post(
        client, author_headers, title="AI cover", cover_image_path=cover_path
    )
    without_cover = create_post(client, author_headers, title="Plain post")

    assert with_cover.status_code == 201
    assert without_cover.status_code == 201
    post_id = with_cover.json()["id"]

    list_body = client.get("/posts").json()
    listed_by_id = {item["id"]: item for item in list_body["items"]}
    assert listed_by_id[post_id]["cover_image_path"] == cover_path
    assert listed_by_id[without_cover.json()["id"]]["cover_image_path"] is None

    detail = client.get(f"/posts/{post_id}")
    assert detail.status_code == 200
    assert detail.json()["cover_image_path"] == cover_path


@pytest.mark.parametrize("post_id", [0, -1, "not-an-int"])
def test_get_post_rejects_invalid_path_id(
    client: TestClient, post_id: object
) -> None:
    response = client.get(f"/posts/{post_id}")

    assert response.status_code == 422


def test_update_owned_post_preserves_created_at(
    client: TestClient, author_headers: dict[str, str], db_session: Session
) -> None:
    created = create_post(client, author_headers)
    assert created.status_code == 201
    original = created.json()

    response = client.put(
        f"/posts/{original['id']}",
        headers=author_headers,
        json={"title": "Updated title", "content": "Updated content."},
    )

    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["title"] == "Updated title"
    assert updated["content"] == "Updated content."
    assert updated["created_at"] == original["created_at"]
    assert datetime.fromisoformat(updated["updated_at"]) > datetime.fromisoformat(
        original["updated_at"]
    )

    db_session.expire_all()
    persisted = db_session.get(Post, original["id"])
    assert persisted is not None
    assert persisted.title == "Updated title"
    assert persisted.content == "Updated content."


def test_update_post_can_change_cover_image(
    client: TestClient,
    author_headers: dict[str, str],
    db_session: Session,
    upload_dir,
) -> None:
    first = upload_image(
        client, author_headers, content=PNG_1X1, filename="old.png"
    ).json()
    second = upload_image(
        client, author_headers, content=JPEG_2X2, filename="new.jpg"
    ).json()
    created = create_post(
        client, author_headers, cover_image_path=first["path"]
    )
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=author_headers,
        json={
            "title": "Updated",
            "content": "Updated content.",
            "cover_image_path": second["path"],
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["cover_image_path"] == second["path"]

    db_session.expire_all()
    persisted = db_session.get(Post, post_id)
    assert persisted is not None
    assert persisted.cover_image_path == second["path"]


def test_update_post_preserves_cover_image_when_resubmitted(
    client: TestClient, author_headers: dict[str, str], upload_dir
) -> None:
    cover_path = upload_image(
        client, author_headers, content=PNG_1X1, filename="keep.png"
    ).json()["path"]
    created = create_post(client, author_headers, cover_image_path=cover_path)
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=author_headers,
        json={
            "title": "New title",
            "content": "New content.",
            "cover_image_path": cover_path,
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["cover_image_path"] == cover_path


def test_update_post_can_clear_cover_image(
    client: TestClient,
    author_headers: dict[str, str],
    db_session: Session,
    upload_dir,
) -> None:
    cover_path = upload_image(
        client, author_headers, content=PNG_1X1, filename="remove.png"
    ).json()["path"]
    created = create_post(client, author_headers, cover_image_path=cover_path)
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=author_headers,
        json={
            "title": "No image now",
            "content": "Updated content.",
            "cover_image_path": None,
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["cover_image_path"] is None

    db_session.expire_all()
    persisted = db_session.get(Post, post_id)
    assert persisted is not None
    assert persisted.cover_image_path is None


def test_update_post_omitting_cover_image_clears_it(
    client: TestClient, author_headers: dict[str, str], upload_dir
) -> None:
    """PUT is a full replacement, so an omitted image field removes the image."""
    cover_path = upload_image(
        client, author_headers, content=PNG_1X1, filename="legacy.png"
    ).json()["path"]
    created = create_post(client, author_headers, cover_image_path=cover_path)
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=author_headers,
        json={"title": "Replaced", "content": "Replaced content."},
    )

    assert response.status_code == 200, response.text
    assert response.json()["cover_image_path"] is None


def test_update_post_rejects_invalid_cover_image_without_changing_it(
    client: TestClient,
    author_headers: dict[str, str],
    db_session: Session,
    upload_dir,
) -> None:
    cover_path = upload_image(
        client, author_headers, content=PNG_1X1, filename="unchanged.png"
    ).json()["path"]
    created = create_post(client, author_headers, cover_image_path=cover_path)
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=author_headers,
        json={
            "title": "Changed",
            "content": "Changed content.",
            "cover_image_path": "../outside.png",
        },
    )

    assert response.status_code == 422

    db_session.expire_all()
    persisted = db_session.get(Post, post_id)
    assert persisted is not None
    assert persisted.title == created.json()["title"]
    assert persisted.cover_image_path == cover_path


def test_update_post_requires_both_fields(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    created = create_post(client, author_headers)
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=author_headers,
        json={"title": "Only a title"},
    )

    assert response.status_code == 422


def test_update_post_rejects_empty_fields(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    created = create_post(client, author_headers)
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=author_headers,
        json={"title": " ", "content": "Valid content"},
    )

    assert response.status_code == 422


def test_update_post_requires_authentication(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    created = create_post(client, author_headers)
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        json={"title": "Changed", "content": "Changed"},
    )

    assert response.status_code == 401


def test_user_cannot_update_another_users_post(
    client: TestClient, db_session: Session
) -> None:
    _, alice_headers = create_user_and_login(client, username="alice")
    _, bob_headers = create_user_and_login(
        client, username="bob", email="bob@example.com"
    )
    created = create_post(client, alice_headers, title="Alice's post")
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=bob_headers,
        json={"title": "Hijacked", "content": "Hijacked content"},
    )

    assert response.status_code == 403
    db_session.expire_all()
    persisted = db_session.get(Post, post_id)
    assert persisted is not None
    assert persisted.title == "Alice's post"


def test_cover_image_path_does_not_bypass_post_ownership(
    client: TestClient, db_session: Session, upload_dir
) -> None:
    _, alice_headers = create_user_and_login(client, username="alice")
    _, bob_headers = create_user_and_login(
        client, username="bob", email="bob@example.com"
    )
    alice_image = upload_image(
        client, alice_headers, content=PNG_1X1, filename="alice.png"
    ).json()["path"]
    bob_image = upload_image(
        client, bob_headers, content=JPEG_2X2, filename="bob.jpg"
    ).json()["path"]
    created = create_post(
        client, alice_headers, title="Alice's post", cover_image_path=alice_image
    )
    post_id = created.json()["id"]

    response = client.put(
        f"/posts/{post_id}",
        headers=bob_headers,
        json={
            "title": "Hijacked",
            "content": "Hijacked content",
            "cover_image_path": bob_image,
        },
    )

    assert response.status_code == 403
    db_session.expire_all()
    persisted = db_session.get(Post, post_id)
    assert persisted is not None
    assert persisted.cover_image_path == alice_image


def test_update_missing_post_returns_404(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    response = client.put(
        "/posts/999999",
        headers=author_headers,
        json={"title": "Missing", "content": "Missing"},
    )

    assert response.status_code == 404


def test_delete_owned_post_returns_204_and_removes_it(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    created = create_post(client, author_headers)
    post_id = created.json()["id"]

    response = client.delete(f"/posts/{post_id}", headers=author_headers)
    get_response = client.get(f"/posts/{post_id}")
    list_response = client.get("/posts")

    assert response.status_code == 204
    assert response.content == b""
    assert get_response.status_code == 404
    assert list_response.json()["total"] == 0


def test_delete_post_requires_authentication(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    created = create_post(client, author_headers)

    response = client.delete(f"/posts/{created.json()['id']}")

    assert response.status_code == 401


def test_user_cannot_delete_another_users_post(
    client: TestClient, db_session: Session
) -> None:
    _, alice_headers = create_user_and_login(client, username="alice")
    _, bob_headers = create_user_and_login(
        client, username="bob", email="bob@example.com"
    )
    created = create_post(client, alice_headers)
    post_id = created.json()["id"]

    response = client.delete(f"/posts/{post_id}", headers=bob_headers)

    assert response.status_code == 403
    db_session.expire_all()
    assert db_session.scalar(select(func.count()).select_from(Post)) == 1


def test_delete_missing_post_returns_404(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    response = client.delete("/posts/999999", headers=author_headers)

    assert response.status_code == 404
