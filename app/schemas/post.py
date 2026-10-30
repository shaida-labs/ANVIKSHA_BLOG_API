"""Blog post request and response schemas."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import TimestampedRead
from app.schemas.user import UserSummary

COVER_IMAGE_PATH_MAX_LENGTH = 512
COVER_IMAGE_PATH_PATTERN = re.compile(
    r"^covers/\d{4}/\d{2}/[0-9a-f]{32}\.(?:jpg|jpeg|png|webp)$"
)


class PostWriteBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    excerpt: str | None = Field(default=None, max_length=300)
    content: str = Field(min_length=1, max_length=50_000)
    topic: str | None = Field(default=None, max_length=60)
    cover_image_path: str | None = Field(
        default=None,
        max_length=COVER_IMAGE_PATH_MAX_LENGTH,
        description=(
            "Relative key returned by POST /uploads/images. Omit or send null "
            "for no cover image. Arbitrary remote URLs are not accepted."
        ),
    )

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Title must not be blank.")
        return value

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Content must not be blank.")
        return value

    @field_validator("excerpt", "topic", mode="before")
    @classmethod
    def normalize_optional_fields(cls, value: object) -> object:
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed or None
        return value

    @field_validator("excerpt", "topic")
    @classmethod
    def validate_optional_fields(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if any(ord(character) < 32 and character not in "\n\t" for character in value):
            raise ValueError("Text fields must not contain control characters.")
        return value

    @field_validator("topic")
    @classmethod
    def normalize_general_topic(cls, value: str | None) -> str | None:
        if value is not None and value.casefold() == "general":
            return None
        return value

    @field_validator("cover_image_path", mode="before")
    @classmethod
    def normalize_cover_image_path(cls, value: object) -> object:
        """Treat blank input as "no cover image" and trim surrounding spaces."""
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed or None
        return value

    @field_validator("cover_image_path")
    @classmethod
    def validate_cover_image_path(cls, value: str | None) -> str | None:
        if value is None:
            return None

        if any(character.isspace() or ord(character) < 32 for character in value):
            raise ValueError(
                "Cover image path must not contain spaces or control characters."
            )
        if not COVER_IMAGE_PATH_PATTERN.fullmatch(value):
            raise ValueError(
                "Cover image path must reference an uploaded ANVIKSHA image."
            )
        return value


class PostCreate(PostWriteBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "title": "Question deeper",
                "excerpt": "A short introduction to the story.",
                "content": "This is the content of my first ANVIKSHA story.",
                "topic": "Technology",
                "cover_image_path": "covers/2026/10/7a5d9e4f3c2b1a0f9e8d7c6b5a4f3e2d.jpg",
            }
        },
    )


class PostUpdate(PostWriteBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "title": "Question deeper",
                "excerpt": "An updated introduction.",
                "content": "The article has been fully replaced.",
                "topic": "Technology",
                "cover_image_path": "covers/2026/10/7a5d9e4f3c2b1a0f9e8d7c6b5a4f3e2d.jpg",
            }
        },
    )


class PostRead(TimestampedRead):
    id: int
    title: str
    excerpt: str | None
    content: str
    topic: str | None
    cover_image_path: str | None
    # Legacy field retained for posts created before the upload workflow.
    cover_image_url: str | None
    comment_count: int = 0
    like_count: int = 0
    liked_by_me: bool = False
    bookmarked_by_me: bool = False
    author_id: int
    author: UserSummary


class BookmarkedPost(PostRead):
    bookmarked_at: datetime
    collection: str | None = None


class LikeState(BaseModel):
    liked: bool
    like_count: int


class BookmarkState(BaseModel):
    bookmarked: bool
    collection: str | None = None


class BookmarkUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    collection: str | None = Field(default=None, max_length=80)

    @field_validator("collection", mode="before")
    @classmethod
    def normalize_collection(cls, value: object) -> object:
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed or None
        return value


class TopicRead(BaseModel):
    name: str
    count: int


class BookmarkCollectionRead(BaseModel):
    name: str
    count: int
