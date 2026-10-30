"""Safe image upload validation and local storage helpers."""

from __future__ import annotations

import logging
import os
import re
import struct
from dataclasses import dataclass
from datetime import timezone
from pathlib import Path, PurePosixPath
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.time import utc_now
from app.schemas.post import COVER_IMAGE_PATH_PATTERN

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_FOLDERS = {"covers", "avatars"}
MAX_FILENAME_LENGTH = 120
_UPLOAD_REFERENCE_PATTERN = re.compile(COVER_IMAGE_PATH_PATTERN.pattern)


@dataclass(frozen=True)
class StoredImage:
    path: str
    url: str
    content_type: str
    size: int
    width: int
    height: int


def public_upload_url(relative_path: str) -> str:
    return f"/uploads/{relative_path.lstrip('/')}"


def _jpeg_dimensions(data: bytes) -> tuple[int, int] | None:
    if not data.startswith(b"\xff\xd8\xff"):
        return None

    index = 2
    sof_markers = {
        0xC0,
        0xC1,
        0xC2,
        0xC3,
        0xC5,
        0xC6,
        0xC7,
        0xC9,
        0xCA,
        0xCB,
        0xCD,
        0xCE,
        0xCF,
    }
    while index + 1 < len(data):
        if data[index] != 0xFF:
            return None
        while index < len(data) and data[index] == 0xFF:
            index += 1
        if index >= len(data):
            return None

        marker = data[index]
        index += 1
        if marker in {0xD8, 0xD9}:
            continue
        if 0xD0 <= marker <= 0xD7:
            continue
        if index + 2 > len(data):
            return None

        segment_length = int.from_bytes(data[index : index + 2], "big")
        if segment_length < 2 or index + segment_length > len(data):
            return None

        if marker in sof_markers:
            if segment_length < 7:
                return None
            height = int.from_bytes(data[index + 3 : index + 5], "big")
            width = int.from_bytes(data[index + 5 : index + 7], "big")
            return width, height

        index += segment_length

    return None


def _webp_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None

    riff_size = int.from_bytes(data[4:8], "little")
    if riff_size + 8 > len(data):
        return None

    chunk_type = data[12:16]
    if chunk_type == b"VP8X":
        width = int.from_bytes(data[24:27], "little") + 1
        height = int.from_bytes(data[27:30], "little") + 1
        return width, height
    if chunk_type == b"VP8L":
        if data[20] != 0x2F:
            return None
        bits = int.from_bytes(data[21:25], "little")
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        return width, height
    if chunk_type == b"VP8 ":
        if data[23:26] != b"\x9d\x01\x2a":
            return None
        width = int.from_bytes(data[26:28], "little") & 0x3FFF
        height = int.from_bytes(data[28:30], "little") & 0x3FFF
        return width, height
    return None


def _detect_image(data: bytes) -> tuple[str, str, int, int]:
    """Return content type, extension, width, and height from file bytes."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        if len(data) < 33 or data[12:16] != b"IHDR":
            raise ValueError("The PNG file is truncated or malformed.")
        width, height = struct.unpack(">II", data[16:24])
        if b"IEND" not in data[-16:]:
            raise ValueError("The PNG file is incomplete.")
        return "image/png", ".png", width, height

    jpeg_dimensions = _jpeg_dimensions(data)
    if jpeg_dimensions is not None:
        if b"\xff\xd9" not in data[-32:]:
            raise ValueError("The JPEG file is incomplete.")
        return "image/jpeg", ".jpg", jpeg_dimensions[0], jpeg_dimensions[1]

    webp_dimensions = _webp_dimensions(data)
    if webp_dimensions is not None:
        return "image/webp", ".webp", webp_dimensions[0], webp_dimensions[1]

    raise ValueError("Only JPEG, PNG, and WebP images are supported.")


def _validate_dimensions(width: int, height: int) -> None:
    if width <= 0 or height <= 0:
        raise ValueError("The image has invalid dimensions.")
    if width * height > settings.upload_max_image_pixels:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="The image dimensions are too large.",
        )


def _safe_original_filename(filename: str | None) -> str:
    """Keep a display name only; it is never used as a storage path."""
    if not filename:
        return "image"
    name = Path(filename.replace("\\", "/")).name
    return name[:MAX_FILENAME_LENGTH] or "image"


async def store_uploaded_image(
    upload: UploadFile, *, folder: str = "covers"
) -> StoredImage:
    """Read, validate, and atomically store an uploaded image."""
    if folder not in IMAGE_FOLDERS:
        raise ValueError("Unsupported image storage folder.")
    chunks: list[bytes] = []
    total = 0
    try:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > settings.upload_max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=(
                        f"Image is too large. The maximum size is "
                        f"{settings.upload_max_size_mb} MB."
                    ),
                )
            chunks.append(chunk)
    finally:
        await upload.close()

    data = b"".join(chunks)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="The uploaded file is empty.",
        )

    try:
        content_type, extension, width, height = _detect_image(data)
        _validate_dimensions(width, height)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(exc),
        ) from exc

    # The server, not the client filename, controls the stored path and name.
    relative_path = (
        f"{folder}/{utc_now().astimezone(timezone.utc).strftime('%Y/%m')}/"
        f"{uuid4().hex}{extension}"
    )
    destination = settings.upload_dir / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.{uuid4().hex}.part")

    try:
        with temporary.open("xb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, destination)
    except OSError as exc:
        temporary.unlink(missing_ok=True)
        logger.exception(
            "Could not store uploaded image %s", _safe_original_filename(upload.filename)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The image could not be stored. Please try again.",
        ) from exc

    return StoredImage(
        path=relative_path,
        url=public_upload_url(relative_path),
        content_type=content_type,
        size=len(data),
        width=width,
        height=height,
    )


def resolve_uploaded_file(relative_path: str) -> Path:
    """Resolve a stored upload path, rejecting traversal and missing files."""
    normalized = relative_path.replace("\\", "/").lstrip("/")
    pure_path = PurePosixPath(normalized)
    if (
        not normalized
        or ".." in pure_path.parts
        or ":" in normalized
        or pure_path.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS
    ):
        raise ValueError("Invalid upload path.")

    root = settings.upload_dir.expanduser().resolve()
    candidate = (root / normalized).resolve()
    if not candidate.is_relative_to(root) or not candidate.is_file():
        raise ValueError("Uploaded file not found.")
    return candidate


def validate_upload_reference(relative_path: str) -> str:
    """Validate a path supplied when creating or replacing a post."""
    if not _UPLOAD_REFERENCE_PATTERN.fullmatch(relative_path):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Cover image must reference a valid uploaded image.",
        )

    try:
        resolve_uploaded_file(relative_path)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Cover image could not be found. Upload it again.",
        ) from exc
    return relative_path


def delete_uploaded_file(relative_path: str | None) -> None:
    """Best-effort removal of an upload after a post is changed or deleted."""
    if not relative_path:
        return
    try:
        path = resolve_uploaded_file(relative_path)
    except ValueError:
        return
    try:
        path.unlink(missing_ok=True)
    except OSError:
        logger.warning("Could not remove uploaded image %s", relative_path)
