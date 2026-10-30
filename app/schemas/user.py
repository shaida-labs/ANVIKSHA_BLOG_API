"""User request and response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.common import TimestampedRead

USERNAME_PATTERN = r"^[a-z0-9_.-]+$"


class UserCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "username": "jane_doe",
                "email": "jane@example.com",
                "password": "StrongPass123",
            }
        },
    )

    username: str = Field(
        min_length=3,
        max_length=50,
        pattern=USERNAME_PATTERN,
        description="3-50 characters: letters, numbers, dots, underscores, hyphens.",
    )
    email: EmailStr = Field(description="A valid email address; stored lowercase.")
    password: str = Field(
        min_length=8,
        max_length=128,
        description="8-128 characters with at least one letter and one digit.",
    )

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, value: str) -> str:
        if not any(character.isalpha() for character in value):
            raise ValueError("Password must contain at least one letter.")
        if not any(character.isdigit() for character in value):
            raise ValueError("Password must contain at least one digit.")
        if value.strip() == "":
            raise ValueError("Password must not be blank.")
        return value


class UserRead(TimestampedRead):
    id: int
    username: str
    email: EmailStr
    display_name: str | None
    bio: str | None
    avatar_path: str | None = None
    is_active: bool


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str | None = None
    avatar_path: str | None = None


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=500)

    @field_validator("display_name", "bio", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed or None
        return value


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str | None
    bio: str | None
    avatar_path: str | None = None
    created_at: datetime
    post_count: int = 0
    comment_count: int = 0
    likes_received: int = 0
