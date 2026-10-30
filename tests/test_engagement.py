"""Likes, bookmarks, topics, and discovery endpoint tests."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.bookmark import Bookmark
from app.models.post import Post
from app.models.post_like import PostLike
from tests.helpers import (
    create_comment,
    create_post,
    create_user_and_login,
)


def _post(client: TestClient, headers: dict[str, str], **kwargs) -> dict:
    response = create_post(client, headers, **kwargs)
    assert response.status_code == 201, response.text
    return response.json()


def test_like_requires_authentication_and_is_idempotent(
    client: TestClient, db_session: Session
) -> None:
    user_id, headers = create_user_and_login(client)
    post = _post(client, headers)

    anonymous = client.post(f"/posts/{post['id']}/like")
    assert anonymous.status_code == 401

    first = client.post(f"/posts/{post['id']}/like", headers=headers)
    assert first.status_code == 200, first.text
    assert first.json() == {"liked": True, "like_count": 1}

    duplicate = client.post(f"/posts/{post['id']}/like", headers=headers)
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json() == {"liked": True, "like_count": 1}

    persisted = db_session.scalar(
        select(func.count(PostLike.id)).where(PostLike.user_id == user_id)
    )
    assert persisted == 1

    detail = client.get(f"/posts/{post['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["like_count"] == 1
    assert detail.json()["liked_by_me"] is True

    anonymous_detail = client.get(f"/posts/{post['id']}")
    assert anonymous_detail.json()["like_count"] == 1
    assert anonymous_detail.json()["liked_by_me"] is False

    removed = client.delete(f"/posts/{post['id']}/like", headers=headers)
    assert removed.status_code == 200, removed.text
    assert removed.json() == {"liked": False, "like_count": 0}

    removed_again = client.delete(f"/posts/{post['id']}/like", headers=headers)
    assert removed_again.json() == {"liked": False, "like_count": 0}


def test_likes_are_unique_per_user_and_aggregate_across_users(
    client: TestClient, db_session: Session
) -> None:
    alice_id, alice_headers = create_user_and_login(client, username="alice")
    bob_id, bob_headers = create_user_and_login(client, username="bob")
    post = _post(client, alice_headers)

    assert client.post(
        f"/posts/{post['id']}/like", headers=alice_headers
    ).json()["like_count"] == 1
    assert client.post(
        f"/posts/{post['id']}/like", headers=bob_headers
    ).json()["like_count"] == 2

    assert (
        db_session.scalar(
            select(func.count(PostLike.id)).where(PostLike.post_id == post["id"])
        )
        == 2
    )
    assert (
        db_session.scalar(
            select(func.count(func.distinct(PostLike.user_id))).where(
                PostLike.post_id == post["id"]
            )
        )
        == 2
    )
    assert alice_id != bob_id


def test_bookmark_crud_collections_and_privacy(
    client: TestClient, db_session: Session
) -> None:
    alice_id, alice_headers = create_user_and_login(client, username="alice")
    bob_id, bob_headers = create_user_and_login(client, username="bob")
    post = _post(client, alice_headers, topic="Technology")

    anonymous = client.post(f"/posts/{post['id']}/bookmark")
    assert anonymous.status_code == 401

    saved = client.post(
        f"/posts/{post['id']}/bookmark",
        headers=alice_headers,
        json={"collection": "  Deep reads  "},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json() == {"bookmarked": True, "collection": "Deep reads"}

    duplicate = client.post(
        f"/posts/{post['id']}/bookmark", headers=alice_headers
    )
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json() == {"bookmarked": True, "collection": "Deep reads"}

    assert (
        db_session.scalar(
            select(func.count(Bookmark.id)).where(Bookmark.user_id == alice_id)
        )
        == 1
    )

    collections = client.get("/bookmarks/collections", headers=alice_headers)
    assert collections.status_code == 200, collections.text
    assert collections.json() == [{"name": "Deep reads", "count": 1}]

    anonymous_collections = client.get("/bookmarks/collections")
    assert anonymous_collections.status_code == 401

    bob_collections = client.get("/bookmarks/collections", headers=bob_headers)
    assert bob_collections.status_code == 200
    assert bob_collections.json() == []

    detail = client.get(f"/posts/{post['id']}", headers=alice_headers)
    assert detail.json()["bookmarked_by_me"] is True

    bob_detail = client.get(f"/posts/{post['id']}", headers=bob_headers)
    assert bob_detail.json()["bookmarked_by_me"] is False

    bob_vault = client.get("/bookmarks", headers=bob_headers)
    assert bob_vault.status_code == 200
    assert bob_vault.json()["total"] == 0
    assert bob_vault.json()["items"] == []

    vault = client.get("/bookmarks", headers=alice_headers)
    assert vault.status_code == 200, vault.text
    body = vault.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == post["id"]
    assert body["items"][0]["collection"] == "Deep reads"
    assert body["items"][0]["bookmarked_at"]
    assert body["items"][0]["bookmarked_by_me"] is True

    moved = client.patch(
        f"/posts/{post['id']}/bookmark",
        headers=alice_headers,
        json={"collection": "Unsorted"},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json() == {"bookmarked": True, "collection": "Unsorted"}
    assert client.get(
        "/bookmarks/collections", headers=alice_headers
    ).json() == [{"name": "Unsorted", "count": 1}]

    filtered = client.get(
        "/bookmarks",
        headers=alice_headers,
        params={"collection": "Unsorted"},
    )
    assert filtered.json()["total"] == 1

    filtered_out = client.get(
        "/bookmarks",
        headers=alice_headers,
        params={"collection": "Missing"},
    )
    assert filtered_out.json()["total"] == 0

    cleared = client.patch(
        f"/posts/{post['id']}/bookmark",
        headers=alice_headers,
        json={"collection": None},
    )
    assert cleared.json() == {"bookmarked": True, "collection": None}
    assert client.get("/bookmarks/collections", headers=alice_headers).json() == []

    removed = client.delete(
        f"/posts/{post['id']}/bookmark", headers=alice_headers
    )
    assert removed.status_code == 200, removed.text
    assert removed.json() == {"bookmarked": False, "collection": None}
    assert client.get("/bookmarks", headers=alice_headers).json()["total"] == 0


def test_vault_search_topic_and_sort(
    client: TestClient,
) -> None:
    _, headers = create_user_and_login(client)
    alpha = _post(
        client,
        headers,
        title="Alpha systems",
        content="Caching and queues.",
        topic="Engineering",
    )
    beta = _post(
        client,
        headers,
        title="Beta design",
        content="Typography and layout.",
        topic="Design",
    )
    gamma = _post(
        client,
        headers,
        title="Gamma notes",
        content="General reading notes.",
    )

    for post in (alpha, beta, gamma):
        assert client.post(
            f"/posts/{post['id']}/bookmark", headers=headers
        ).status_code == 200

    by_title = client.get(
        "/bookmarks", headers=headers, params={"sort": "title"}
    )
    assert [item["title"] for item in by_title.json()["items"]] == [
        "Alpha systems",
        "Beta design",
        "Gamma notes",
    ]

    topic_filter = client.get(
        "/bookmarks", headers=headers, params={"topic": "Design"}
    )
    assert topic_filter.json()["total"] == 1
    assert topic_filter.json()["items"][0]["title"] == "Beta design"

    general_filter = client.get(
        "/bookmarks", headers=headers, params={"topic": "General"}
    )
    assert general_filter.json()["total"] == 1
    assert general_filter.json()["items"][0]["title"] == "Gamma notes"

    search = client.get(
        "/bookmarks", headers=headers, params={"search": "caching"}
    )
    assert search.json()["total"] == 1
    assert search.json()["items"][0]["title"] == "Alpha systems"


def test_post_topics_excerpts_and_popular_sorting(
    client: TestClient,
) -> None:
    _, headers = create_user_and_login(client)
    older = _post(
        client,
        headers,
        title="Older technology story",
        content="Technology body.",
        excerpt="A stored excerpt.",
        topic=" Technology ",
    )
    newer = _post(
        client,
        headers,
        title="Newer design story",
        content="Design body.",
        topic="Design",
    )
    general = _post(
        client,
        headers,
        title="General story",
        content="General body.",
    )

    assert older["excerpt"] == "A stored excerpt."
    assert older["topic"] == "Technology"
    assert newer["topic"] == "Design"
    assert general["topic"] is None

    technology = client.get("/posts", params={"topic": "technology"})
    assert technology.status_code == 200
    assert [item["id"] for item in technology.json()["items"]] == [older["id"]]

    general_posts = client.get("/posts", params={"topic": "General"})
    assert [item["id"] for item in general_posts.json()["items"]] == [
        general["id"]
    ]

    topics = client.get("/topics")
    assert topics.status_code == 200
    counts = {item["name"]: item["count"] for item in topics.json()}
    assert counts["Technology"] == 1
    assert counts["Design"] == 1
    assert counts["General"] == 1

    # Popularity is derived from real likes and comments, not fabricated data.
    assert client.post(
        f"/posts/{older['id']}/like", headers=headers
    ).status_code == 200
    assert create_comment(
        client, headers, older["id"], content="A real comment."
    ).status_code == 201

    popular = client.get("/posts", params={"sort": "popular"})
    assert popular.status_code == 200
    assert popular.json()["items"][0]["id"] == older["id"]


def test_deleting_post_cascades_likes_and_bookmarks(
    client: TestClient, db_session: Session
) -> None:
    _, headers = create_user_and_login(client)
    post = _post(client, headers)

    assert client.post(
        f"/posts/{post['id']}/like", headers=headers
    ).status_code == 200
    assert client.post(
        f"/posts/{post['id']}/bookmark", headers=headers
    ).status_code == 200

    deleted = client.delete(f"/posts/{post['id']}", headers=headers)
    assert deleted.status_code == 204, deleted.text

    assert db_session.scalar(
        select(func.count(PostLike.id)).where(PostLike.post_id == post["id"])
    ) == 0
    assert db_session.scalar(
        select(func.count(Bookmark.id)).where(Bookmark.post_id == post["id"])
    ) == 0
    assert db_session.get(Post, post["id"]) is None


def test_author_filter_and_optional_auth_invalid_token(
    client: TestClient,
) -> None:
    _, alice_headers = create_user_and_login(client, username="alice")
    _, bob_headers = create_user_and_login(client, username="bob")
    alice_post = _post(client, alice_headers, title="Alice story")
    _post(client, bob_headers, title="Bob story")

    filtered = client.get("/posts", params={"author": "alice"})
    assert filtered.status_code == 200
    assert [item["id"] for item in filtered.json()["items"]] == [
        alice_post["id"]
    ]

    invalid = client.get(
        "/posts",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert invalid.status_code == 401
