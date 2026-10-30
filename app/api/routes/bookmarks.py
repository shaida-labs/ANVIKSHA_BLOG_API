"""Personal library endpoints for saved stories and collections."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.schemas.common import Page
from app.schemas.post import BookmarkCollectionRead, BookmarkedPost
from app.services.posts import (
    BookmarkSort,
    list_bookmark_collections,
    list_bookmarks,
)

router = APIRouter(prefix="/bookmarks", tags=["Library"])

_AUTH_RESPONSE = {401: {"description": "Missing or invalid authentication token."}}


@router.get(
    "/collections",
    response_model=list[BookmarkCollectionRead],
    summary="List the authenticated user's collections",
    description=(
        "Requires authentication. Returns only collection labels that are "
        "currently attached to this user's saved posts, with real counts."
    ),
    responses={**_AUTH_RESPONSE},
)
def read_collections(
    db: DbSession,
    current_user: CurrentUser,
) -> list[BookmarkCollectionRead]:
    return list_bookmark_collections(db, current_user)


@router.get(
    "",
    response_model=Page[BookmarkedPost],
    summary="List the authenticated user's saved posts",
    description=(
        "Requires authentication. Returns only the current user's bookmarks, "
        "with real post engagement counts and optional search, topic, collection, "
        "and sort controls."
    ),
    responses={
        **_AUTH_RESPONSE,
        422: {"description": "Invalid pagination, search, or sort parameter."},
    },
)
def read_bookmarks(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100, description="Page size.")] = 20,
    offset: Annotated[int, Query(ge=0, description="Number of saved posts to skip.")] = 0,
    search: Annotated[
        str | None,
        Query(max_length=200, description="Optional title or content search."),
    ] = None,
    topic: Annotated[
        str | None,
        Query(max_length=60, description="Optional exact topic filter."),
    ] = None,
    collection: Annotated[
        str | None,
        Query(max_length=80, description="Optional collection label."),
    ] = None,
    sort: Annotated[
        BookmarkSort,
        Query(description="Sort order: saved_newest, saved_oldest, or title."),
    ] = "saved_newest",
) -> Page[BookmarkedPost]:
    posts, total = list_bookmarks(
        db,
        user=current_user,
        limit=limit,
        offset=offset,
        search=search,
        topic=topic,
        collection=collection,
        sort=sort,
    )
    return Page[BookmarkedPost](
        items=posts,
        total=total,
        limit=limit,
        offset=offset,
    )
