"""Comment request and response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import TimestampedRead
from app.schemas.user import UserSummary


class CommentCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "post_id": 1,
                "content": "This is a thoughtful comment.",
            }
        },
    )

    post_id: int = Field(gt=0, description="ID of an existing post.")
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Content must not be blank.")
        return value


class CommentUpdate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {"content": "An updated comment."}
        },
    )

    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Content must not be blank.")
        return value


class CommentRead(TimestampedRead):
    id: int
    content: str
    post_id: int
    author_id: int
    author: UserSummary
