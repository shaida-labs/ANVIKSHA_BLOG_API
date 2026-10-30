"""Upload response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class UploadedImageRead(BaseModel):
    path: str = Field(
        description="Relative storage key to send back as cover_image_path."
    )
    url: str = Field(description="Relative URL served by this API.")
    content_type: str
    size: int = Field(ge=1)
    width: int = Field(ge=1)
    height: int = Field(ge=1)
