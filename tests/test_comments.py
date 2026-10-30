"""Comment endpoint tests, including cascade cleanup."""

from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.comment import Comment
from tests.helpers import create_comment, create_post, create_user_and_login


@pytest.fixture()
def post_id(client: TestClient, author_headers: dict[str, str]) -> int:
    response = create_post(client, author_headers)
    assert response.status_code == 201
    return response.json()["id"]


def test_create_comment_requires_authentication(
    client: TestClient, post_id: int
) -> None:
    response = client.post(
        "/comments", json={"post_id": post_id, "content": "Hello"}
    )

    assert response.status_code == 401


def test_create_comment_uses_authenticated_author(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    response = create_comment(
        client, author_headers, post_id, content="  Nice post!  "
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["post_id"] == post_id
    assert body["content"] == "  Nice post!  "
    assert body["author"]["username"] == "alice"
    assert body["author_id"] == body["author"]["id"]
    assert datetime.fromisoformat(body["created_at"]) == datetime.fromisoformat(
        body["updated_at"]
    )


def test_create_comment_rejects_client_supplied_author_id(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    response = client.post(
        "/comments",
        headers=author_headers,
        json={
            "post_id": post_id,
            "content": "Hijacked",
            "author_id": 999,
        },
    )

    assert response.status_code == 422


def test_create_comment_for_missing_post_returns_404(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    response = create_comment(client, author_headers, 999999)

    assert response.status_code == 404
    assert response.json()["detail"] == "Post not found."


@pytest.mark.parametrize("content", ["", "    ", "\n\t"])
def test_create_comment_rejects_empty_content(
    client: TestClient, author_headers: dict[str, str], post_id: int, content: str
) -> None:
    response = create_comment(client, author_headers, post_id, content=content)

    assert response.status_code == 422


def test_list_comments_requires_post_id(client: TestClient) -> None:
    response = client.get("/comments")

    assert response.status_code == 422


@pytest.mark.parametrize("post_id", [0, -1, "bogus"])
def test_list_comments_rejects_invalid_post_id(
    client: TestClient, post_id: object
) -> None:
    response = client.get("/comments", params={"post_id": post_id})

    assert response.status_code == 422


def test_list_comments_for_missing_post_returns_404(
    client: TestClient,
) -> None:
    response = client.get("/comments", params={"post_id": 999999})

    assert response.status_code == 404


def test_list_comments_is_chronological_with_pagination(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    comment_ids = []
    for content in ["First", "Second", "Third"]:
        created = create_comment(client, author_headers, post_id, content=content)
        assert created.status_code == 201
        comment_ids.append(created.json()["id"])

    response = client.get(
        "/comments", params={"post_id": post_id, "limit": 2, "offset": 1}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["limit"] == 2
    assert body["offset"] == 1
    assert [item["id"] for item in body["items"]] == comment_ids[1:]


def test_get_single_comment_and_missing_comment(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    created = create_comment(client, author_headers, post_id)
    assert created.status_code == 201
    comment_id = created.json()["id"]

    response = client.get(f"/comments/{comment_id}")
    missing = client.get("/comments/999999")

    assert response.status_code == 200
    assert response.json()["content"] == "A test comment."
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Comment not found."


@pytest.mark.parametrize("comment_id", [0, -1, "bogus"])
def test_get_comment_rejects_invalid_path_id(
    client: TestClient, comment_id: object
) -> None:
    response = client.get(f"/comments/{comment_id}")

    assert response.status_code == 422


def test_update_owned_comment_preserves_created_at(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    created = create_comment(client, author_headers, post_id)
    original = created.json()

    response = client.put(
        f"/comments/{original['id']}",
        headers=author_headers,
        json={"content": "Updated comment."},
    )

    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["content"] == "Updated comment."
    assert updated["post_id"] == post_id
    assert updated["created_at"] == original["created_at"]
    assert datetime.fromisoformat(updated["updated_at"]) > datetime.fromisoformat(
        original["updated_at"]
    )


@pytest.mark.parametrize("payload", [{}, {"content": ""}, {"content": "   "}])
def test_update_comment_rejects_invalid_payload(
    client: TestClient,
    author_headers: dict[str, str],
    post_id: int,
    payload: dict[str, str],
) -> None:
    created = create_comment(client, author_headers, post_id)

    response = client.put(
        f"/comments/{created.json()['id']}",
        headers=author_headers,
        json=payload,
    )

    assert response.status_code == 422


def test_update_comment_rejects_changing_post_or_author(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    created = create_comment(client, author_headers, post_id)

    response = client.put(
        f"/comments/{created.json()['id']}",
        headers=author_headers,
        json={
            "content": "Changed",
            "post_id": post_id + 1,
            "author_id": 999,
        },
    )

    assert response.status_code == 422


def test_update_comment_requires_authentication(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    created = create_comment(client, author_headers, post_id)

    response = client.put(
        f"/comments/{created.json()['id']}", json={"content": "Changed"}
    )

    assert response.status_code == 401


def test_user_cannot_update_another_users_comment(
    client: TestClient, db_session: Session
) -> None:
    _, alice_headers = create_user_and_login(client, username="alice")
    _, bob_headers = create_user_and_login(
        client, username="bob", email="bob@example.com"
    )
    post = create_post(client, alice_headers)
    created = create_comment(client, alice_headers, post.json()["id"])
    comment_id = created.json()["id"]

    response = client.put(
        f"/comments/{comment_id}",
        headers=bob_headers,
        json={"content": "Hijacked"},
    )

    assert response.status_code == 403
    db_session.expire_all()
    persisted = db_session.get(Comment, comment_id)
    assert persisted is not None
    assert persisted.content == "A test comment."


def test_update_missing_comment_returns_404(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    response = client.put(
        "/comments/999999",
        headers=author_headers,
        json={"content": "Missing"},
    )

    assert response.status_code == 404


def test_delete_owned_comment_returns_204(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    created = create_comment(client, author_headers, post_id)
    comment_id = created.json()["id"]

    response = client.delete(f"/comments/{comment_id}", headers=author_headers)
    get_response = client.get(f"/comments/{comment_id}")

    assert response.status_code == 204
    assert response.content == b""
    assert get_response.status_code == 404


def test_delete_comment_requires_authentication(
    client: TestClient, author_headers: dict[str, str], post_id: int
) -> None:
    created = create_comment(client, author_headers, post_id)

    response = client.delete(f"/comments/{created.json()['id']}")

    assert response.status_code == 401


def test_user_cannot_delete_another_users_comment(
    client: TestClient, db_session: Session
) -> None:
    _, alice_headers = create_user_and_login(client, username="alice")
    _, bob_headers = create_user_and_login(
        client, username="bob", email="bob@example.com"
    )
    post = create_post(client, alice_headers)
    created = create_comment(client, alice_headers, post.json()["id"])
    comment_id = created.json()["id"]

    response = client.delete(f"/comments/{comment_id}", headers=bob_headers)

    assert response.status_code == 403
    db_session.expire_all()
    assert db_session.get(Comment, comment_id) is not None


def test_delete_missing_comment_returns_404(
    client: TestClient, author_headers: dict[str, str]
) -> None:
    response = client.delete("/comments/999999", headers=author_headers)

    assert response.status_code == 404


def test_deleting_post_cascades_to_comments(
    client: TestClient, author_headers: dict[str, str], db_session: Session
) -> None:
    post = create_post(client, author_headers)
    post_id = post.json()["id"]
    assert create_comment(client, author_headers, post_id).status_code == 201
    assert (
        create_comment(
            client, author_headers, post_id, content="Second comment"
        ).status_code
        == 201
    )
    db_session.expire_all()
    assert (
        db_session.scalar(
            select(func.count())
            .select_from(Comment)
            .where(Comment.post_id == post_id)
        )
        == 2
    )

    delete_response = client.delete(f"/posts/{post_id}", headers=author_headers)
    list_response = client.get("/comments", params={"post_id": post_id})
    create_response = create_comment(client, author_headers, post_id)

    assert delete_response.status_code == 204
    assert list_response.status_code == 404
    assert create_response.status_code == 404
    db_session.expire_all()
    assert (
        db_session.scalar(
            select(func.count())
            .select_from(Comment)
            .where(Comment.post_id == post_id)
        )
        == 0
    )
