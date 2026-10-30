"""Author profile and topic discovery tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from tests.helpers import (
    create_comment,
    create_post,
    create_user_and_login,
)


def test_public_profile_hides_private_fields_and_reports_real_counts(
    client: TestClient,
) -> None:
    alice_id, alice_headers = create_user_and_login(client, username="alice")
    bob_id, bob_headers = create_user_and_login(client, username="bob")

    alice_post = create_post(
        client,
        alice_headers,
        title="Alice article",
        content="Alice body.",
        topic="Technology",
    )
    assert alice_post.status_code == 201, alice_post.text
    bob_post = create_post(
        client,
        bob_headers,
        title="Bob article",
        content="Bob body.",
    )
    assert bob_post.status_code == 201, bob_post.text

    # Bob engages with Alice's article, and Alice comments on Bob's article.
    assert client.post(
        f"/posts/{alice_post.json()['id']}/like", headers=bob_headers
    ).status_code == 200
    assert create_comment(
        client,
        alice_headers,
        bob_post.json()["id"],
        content="A thoughtful response.",
    ).status_code == 201

    profile = client.get("/users/alice")
    assert profile.status_code == 200, profile.text
    body = profile.json()
    assert body["id"] == alice_id
    assert body["username"] == "alice"
    assert body["display_name"] is None
    assert body["bio"] is None
    assert body["post_count"] == 1
    assert body["comment_count"] == 1
    assert body["likes_received"] == 1
    assert "email" not in body
    assert bob_id != alice_id

    missing = client.get("/users/does-not-exist")
    assert missing.status_code == 404


def test_profile_update_is_authenticated_and_owner_only(
    client: TestClient,
) -> None:
    _, alice_headers = create_user_and_login(client, username="alice")
    _, bob_headers = create_user_and_login(client, username="bob")

    anonymous = client.patch(
        "/users/me",
        json={"display_name": "Anonymous", "bio": "No token."},
    )
    assert anonymous.status_code == 401

    updated = client.patch(
        "/users/me",
        headers=alice_headers,
        json={
            "display_name": "  Alice Doe  ",
            "bio": "  Writing about systems and design.  ",
        },
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["display_name"] == "Alice Doe"
    assert body["bio"] == "Writing about systems and design."
    assert body["email"] == "alice@example.com"

    alice_profile = client.get("/users/alice")
    assert alice_profile.json()["display_name"] == "Alice Doe"

    # Bob's own profile update must not mutate Alice's profile.
    bob_update = client.patch(
        "/users/me",
        headers=bob_headers,
        json={"display_name": "Bob", "bio": None},
    )
    assert bob_update.status_code == 200
    assert client.get("/users/alice").json()["display_name"] == "Alice Doe"
    assert client.get("/users/bob").json()["display_name"] == "Bob"


def test_profile_update_validation(client: TestClient) -> None:
    _, headers = create_user_and_login(client)

    too_long_name = client.patch(
        "/users/me",
        headers=headers,
        json={"display_name": "x" * 81},
    )
    assert too_long_name.status_code == 422

    too_long_bio = client.patch(
        "/users/me",
        headers=headers,
        json={"bio": "x" * 501},
    )
    assert too_long_bio.status_code == 422

    blank_values = client.patch(
        "/users/me",
        headers=headers,
        json={"display_name": "   ", "bio": "\n\t "},
    )
    assert blank_values.status_code == 200
    assert blank_values.json()["display_name"] is None
    assert blank_values.json()["bio"] is None

    unknown_field = client.patch(
        "/users/me",
        headers=headers,
        json={"email": "attacker@example.com"},
    )
    assert unknown_field.status_code == 422


def test_topics_endpoint_handles_empty_and_populated_database(
    client: TestClient,
) -> None:
    assert client.get("/topics").json() == []

    _, headers = create_user_and_login(client)
    assert create_post(
        client, headers, title="One", content="Body.", topic="Science"
    ).status_code == 201
    assert create_post(
        client, headers, title="Two", content="Body.", topic="Science"
    ).status_code == 201
    assert create_post(
        client, headers, title="Three", content="Body.", topic="Design"
    ).status_code == 201
    assert create_post(client, headers, title="Four", content="Body.").status_code == 201

    topics = client.get("/topics")
    assert topics.status_code == 200
    counts = {item["name"]: item["count"] for item in topics.json()}
    assert counts == {"Design": 1, "General": 1, "Science": 2}
