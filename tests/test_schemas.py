"""Unit tests for schema validation rules."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.comment import CommentCreate, CommentUpdate
from app.schemas.post import PostCreate
from app.schemas.user import UserCreate


def test_user_create_normalizes_username_and_email() -> None:
    user = UserCreate(
        username="  Alice_01  ",
        email="ALICE@Example.COM",
        password="StrongPass123",
    )

    assert user.username == "alice_01"
    assert str(user.email) == "alice@example.com"


@pytest.mark.parametrize(
    ("username", "password"),
    [
        ("ab", "StrongPass123"),
        ("has space", "StrongPass123"),
        ("user!", "StrongPass123"),
        ("valid_user", "password"),
        ("valid_user", "12345678"),
    ],
)
def test_user_create_rejects_invalid_values(
    username: str, password: str
) -> None:
    with pytest.raises(ValidationError):
        UserCreate(
            username=username,
            email="user@example.com",
            password=password,
        )


def test_user_create_forbids_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        UserCreate(
            username="valid_user",
            email="user@example.com",
            password="StrongPass123",
            is_active=False,
        )


def test_post_create_strips_title_and_allows_multiline_content() -> None:
    post = PostCreate(title="  Hello  ", content="Line one\nLine two")

    assert post.title == "Hello"
    assert post.content == "Line one\nLine two"


@pytest.mark.parametrize(
    ("title", "content"),
    [("", "Body"), (" ", "Body"), ("Title", ""), ("Title", " \n ")],
)
def test_post_create_rejects_blank_fields(title: str, content: str) -> None:
    with pytest.raises(ValidationError):
        PostCreate(title=title, content=content)


def test_post_create_accepts_a_generated_cover_image_path() -> None:
    post = PostCreate(
        title="Title",
        content="Body",
        cover_image_path="covers/2026/10/" + "a" * 32 + ".webp",
    )

    assert post.cover_image_path == "covers/2026/10/" + "a" * 32 + ".webp"


def test_post_create_normalizes_blank_cover_path_to_none() -> None:
    post = PostCreate(title="Title", content="Body", cover_image_path="   ")

    assert post.cover_image_path is None


@pytest.mark.parametrize(
    "cover_image_path",
    [
        "https://cdn.example.com/cover.jpg",
        "/uploads/covers/2026/10/" + "a" * 32 + ".jpg",
        "covers/2026/10/" + "a" * 32 + ".gif",
        "covers/2026/10/" + "a" * 32 + ".jpg\x00",
        "../covers/2026/10/" + "a" * 32 + ".jpg",
    ],
)
def test_post_create_rejects_non_upload_cover_paths(cover_image_path: str) -> None:
    with pytest.raises(ValidationError):
        PostCreate(
            title="Title",
            content="Body",
            cover_image_path=cover_image_path,
        )


def test_post_create_forbids_author_id() -> None:
    with pytest.raises(ValidationError):
        PostCreate(title="Title", content="Body", author_id=1)


def test_post_create_forbids_legacy_cover_url_writes() -> None:
    with pytest.raises(ValidationError):
        PostCreate(
            title="Title",
            content="Body",
            cover_image_url="https://cdn.example.com/cover.jpg",
        )


def test_comment_create_validates_post_id_and_content() -> None:
    with pytest.raises(ValidationError):
        CommentCreate(post_id=0, content="Comment")
    with pytest.raises(ValidationError):
        CommentCreate(post_id=1, content=" ")
    with pytest.raises(ValidationError):
        CommentCreate(post_id=1, content="x" * 2001)


def test_comment_update_forbids_post_and_author_changes() -> None:
    with pytest.raises(ValidationError):
        CommentUpdate(content="Changed", post_id=2, author_id=3)
