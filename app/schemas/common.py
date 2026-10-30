"""Shared response models and pagination helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampedRead(ORMModel):
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at", check_fields=False)
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        """Always serialize timestamps as aware UTC values.

        PostgreSQL returns timezone-aware values. SQLite drops timezone info in
        tests, so naive values are interpreted as UTC before serialization.
        """
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)


class HealthResponse(BaseModel):
    status: Literal["healthy"]
    database: Literal["reachable"]
    service: str
    project_id: str = "ANVIKSHA"
