"""Authentication and authorization endpoint tests."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    verify_password,
)
from app.models.user import User
from tests.helpers import (
    DEFAULT_PASSWORD,
    auth_headers,
    login_user,
    register_user,
)


def test_register_success_persists_hashed_password(
    client: TestClient, db_session: Session
) -> None:
    response = register_user(
        client, username="Alice", email="ALICE@Example.com"
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert body["is_active"] is True
    assert "password" not in body
    assert "hashed_password" not in body
    assert datetime.fromisoformat(body["created_at"]).tzinfo is not None

    user = db_session.scalar(select(User).where(User.username == "alice"))
    assert user is not None
    assert user.hashed_password != DEFAULT_PASSWORD
    assert user.hashed_password.startswith("$argon2")
    assert verify_password(DEFAULT_PASSWORD, user.hashed_password) is True


def test_register_duplicate_username_is_case_insensitive(client: TestClient) -> None:
    assert register_user(client).status_code == 201

    response = register_user(
        client, username="ALICE", email="another@example.com"
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Username is already registered."


def test_register_duplicate_email_is_case_insensitive(client: TestClient) -> None:
    assert register_user(client).status_code == 201

    response = register_user(
        client, username="bob", email="ALICE@EXAMPLE.COM"
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered."


@pytest.mark.parametrize(
    "email",
    ["not-an-email", "missing@", "@example.com", ""],
)
def test_register_rejects_invalid_email(client: TestClient, email: str) -> None:
    response = client.post(
        "/register",
        json={
            "username": "alice",
            "email": email,
            "password": DEFAULT_PASSWORD,
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "password",
    ["short1", "onlyletters", "12345678", "       1"],
)
def test_register_rejects_weak_password(
    client: TestClient, password: str
) -> None:
    response = register_user(client, password=password)

    assert response.status_code == 422
    assert password not in response.text


def test_validation_errors_do_not_echo_password(client: TestClient) -> None:
    secret_value = "SecretWithoutDigits"

    response = register_user(client, password=secret_value)

    assert response.status_code == 422
    assert secret_value not in response.text
    assert "password" in response.text


def test_register_rejects_client_supplied_privileged_fields(
    client: TestClient,
) -> None:
    response = client.post(
        "/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": DEFAULT_PASSWORD,
            "is_active": False,
            "hashed_password": "attacker-controlled",
        },
    )

    assert response.status_code == 422


def test_login_success_returns_valid_bearer_token(client: TestClient) -> None:
    registered = register_user(client)
    assert registered.status_code == 201

    response = login_user(client)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == settings.access_token_expire_minutes * 60
    assert len(body["access_token"].split(".")) == 3
    assert decode_access_token(body["access_token"]) == registered.json()["id"]


@pytest.mark.parametrize(
    ("email", "password"),
    [
        ("alice@example.com", "WrongPass123"),
        ("unknown@example.com", DEFAULT_PASSWORD),
    ],
)
def test_login_rejects_invalid_credentials_without_enumeration(
    client: TestClient, email: str, password: str
) -> None:
    assert register_user(client).status_code == 201

    response = login_user(client, email=email, password=password)

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."
    assert response.headers["www-authenticate"] == "Bearer"


def test_current_user_requires_authentication(client: TestClient) -> None:
    response = client.get("/users/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_current_user_returns_authenticated_profile(client: TestClient) -> None:
    assert register_user(client).status_code == 201
    headers = auth_headers(client)

    response = client.get("/users/me", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert "hashed_password" not in body


def test_malformed_token_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/users/me", headers={"Authorization": "Bearer not-a-real-jwt"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication token."


def test_expired_token_is_rejected(client: TestClient) -> None:
    registered = register_user(client)
    assert registered.status_code == 201
    token = create_access_token(
        registered.json()["id"], expires_delta=timedelta(seconds=-1)
    )

    response = client.get(
        "/users/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Token has expired."


def test_token_with_wrong_signature_is_rejected(client: TestClient) -> None:
    registered = register_user(client)
    assert registered.status_code == 201
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": str(registered.json()["id"]),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=5),
        },
        "a-different-secret-that-is-at-least-32-characters",
        algorithm="HS256",
    )

    response = client.get(
        "/users/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401


def test_token_for_nonexistent_user_is_rejected(client: TestClient) -> None:
    token = create_access_token(999_999)

    response = client.get(
        "/users/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401
    assert "no longer exists" in response.json()["detail"]


def test_token_with_wrong_token_type_is_rejected(client: TestClient) -> None:
    registered = register_user(client)
    assert registered.status_code == 201
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": str(registered.json()["id"]),
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(minutes=5),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get(
        "/users/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token type."


def test_inactive_user_cannot_log_in_or_use_existing_token(
    client: TestClient, db_session: Session
) -> None:
    assert register_user(client).status_code == 201
    headers = auth_headers(client)
    user = db_session.scalar(select(User).where(User.email == "alice@example.com"))
    assert user is not None
    user.is_active = False
    db_session.commit()

    login_response = login_user(client)
    me_response = client.get("/users/me", headers=headers)

    assert login_response.status_code == 403
    assert login_response.json()["detail"] == "User account is inactive."
    assert me_response.status_code == 403
    assert me_response.json()["detail"] == "User account is inactive."
