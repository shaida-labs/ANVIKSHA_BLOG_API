"""Image upload and safe local file-serving endpoints."""

from __future__ import annotations

import mimetypes
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.dependencies import CurrentUser
from app.schemas.upload import UploadedImageRead
from app.services.images import (
    resolve_uploaded_file,
    store_uploaded_image,
)

router = APIRouter(prefix="/uploads", tags=["Uploads"])

_AUTH_RESPONSE = {401: {"description": "Missing or invalid authentication token."}}


@router.post(
    "/images",
    response_model=UploadedImageRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a cover image",
    description=(
        "Requires authentication. Accepts a multipart/form-data image field. "
        "The backend validates the actual bytes, dimensions, and size, then "
        "returns a relative path to use as cover_image_path on a post."
    ),
    responses={
        **_AUTH_RESPONSE,
        413: {"description": "The image exceeds the configured size limit."},
        415: {"description": "The file is not a supported JPEG, PNG, or WebP image."},
        422: {"description": "The image is empty or has invalid dimensions."},
        500: {"description": "The image could not be stored."},
    },
)
async def upload_image(
    file: Annotated[UploadFile, File(description="JPEG, PNG, or WebP image.")],
    _: CurrentUser,
) -> UploadedImageRead:
    stored = await store_uploaded_image(file)
    return UploadedImageRead(
        path=stored.path,
        url=stored.url,
        content_type=stored.content_type,
        size=stored.size,
        width=stored.width,
        height=stored.height,
    )


@router.get(
    "/{file_path:path}",
    response_class=FileResponse,
    include_in_schema=False,
    summary="Serve an uploaded image",
    description="Serves only files inside the configured upload directory.",
    responses={404: {"description": "Image not found."}},
)
def read_uploaded_image(file_path: str) -> FileResponse:
    try:
        stored_path = resolve_uploaded_file(file_path)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found.",
        ) from exc

    media_type = mimetypes.guess_type(stored_path.name)[0] or "application/octet-stream"
    return FileResponse(
        stored_path,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Disposition": "inline",
        },
    )
