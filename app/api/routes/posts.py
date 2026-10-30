"""Blog post endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Path, Query, Response, status

from app.dependencies import CurrentUser, DbSession, OptionalCurrentUser
from app.models.post import Post
from app.schemas.common import Page
from app.schemas.post import (
    BookmarkState,
    BookmarkUpdate,
    LikeState,
    PostCreate,
    PostRead,
    PostUpdate,
)
from app.services.posts import (
    PostSort,
    bookmark_post,
    create_post,
    delete_post,
    get_post_or_404,
    like_post,
    list_posts,
    remove_bookmark,
    unlike_post,
    update_bookmark,
    update_post,
)

router = APIRouter(prefix="/posts", tags=["Posts"])

_AUTH_RESPONSE = {401: {"description": "Missing or invalid authentication token."}}
_OWNERSHIP_RESPONSE = {
    403: {"description": "The authenticated user does not own this post."}
}


@router.get(
    "",
    response_model=Page[PostRead],
    summary="List posts",
    description=(
        "Public endpoint. Returns community-wide posts ordered by creation date "
        "(newest first by default) with pagination metadata. Optional search "
        "matches title or content case-insensitively. Each post includes its "
        "cover image reference and real comment count."
    ),
    responses={422: {"description": "Invalid pagination, search, or sort parameter."}},
)
def read_posts(
    db: DbSession,
    viewer: OptionalCurrentUser,
    limit: Annotated[int, Query(ge=1, le=100, description="Page size.")] = 20,
    offset: Annotated[int, Query(ge=0, description="Number of posts to skip.")] = 0,
    search: Annotated[
        str | None,
        Query(max_length=200, description="Optional title or content search."),
    ] = None,
    topic: Annotated[
        str | None,
        Query(max_length=60, description="Optional exact topic filter."),
    ] = None,
    author: Annotated[
        str | None,
        Query(max_length=50, description="Optional author username filter."),
    ] = None,
    sort: Annotated[
        PostSort,
        Query(description="Sort order: newest, oldest, title, or popular."),
    ] = "newest",
) -> Page[PostRead]:
    posts, total = list_posts(
        db,
        limit=limit,
        offset=offset,
        search=search,
        topic=topic,
        author_username=author,
        sort=sort,
        viewer_id=viewer.id if viewer else None,
    )
    return Page[PostRead](
        items=posts,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/mine",
    response_model=Page[PostRead],
    summary="List the authenticated user's posts",
    description=(
        "Requires authentication. Returns only posts authored by the "
        "authenticated user. Search and sorting are applied on the server."
    ),
    responses={
        **_AUTH_RESPONSE,
        422: {"description": "Invalid pagination, search, or sort parameter."},
    },
)
def read_my_posts(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100, description="Page size.")] = 20,
    offset: Annotated[int, Query(ge=0, description="Number of posts to skip.")] = 0,
    search: Annotated[
        str | None, Query(max_length=200, description="Optional search.")
    ] = None,
    topic: Annotated[
        str | None,
        Query(max_length=60, description="Optional exact topic filter."),
    ] = None,
    sort: Annotated[
        PostSort,
        Query(description="Sort order: newest, oldest, title, or popular."),
    ] = "newest",
) -> Page[PostRead]:
    posts, total = list_posts(
        db,
        limit=limit,
        offset=offset,
        search=search,
        topic=topic,
        sort=sort,
        author_id=current_user.id,
        viewer_id=current_user.id,
    )
    return Page[PostRead](
        items=posts,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=PostRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a post",
    description=(
        "Requires authentication. The author is always the authenticated user. "
        "cover_image_path is optional and must reference an image returned by "
        "POST /uploads/images. Remote image URLs are rejected."
    ),
    responses={
        **_AUTH_RESPONSE,
        422: {"description": "Validation error, including author_id in the body."},
    },
)
def create_new_post(
    payload: PostCreate, db: DbSession, current_user: CurrentUser
) -> Post:
    return create_post(db, payload, current_user)


@router.get(
    "/{post_id}",
    response_model=PostRead,
    summary="Get a post",
    description="Public endpoint. Returns 404 when the post does not exist.",
    responses={404: {"description": "Post not found."}},
)
def read_post(
    post_id: Annotated[int, Path(gt=0)],
    db: DbSession,
    viewer: OptionalCurrentUser,
) -> Post:
    return get_post_or_404(db, post_id, viewer.id if viewer else None)


@router.put(
    "/{post_id}",
    response_model=PostRead,
    summary="Replace an owned post",
    description=(
        "Requires authentication and ownership. This is a full replacement: "
        "title and content are required. Send cover_image_path to keep or change "
        "the uploaded image, or send null (or omit it) to remove it. created_at "
        "is never changed."
    ),
    responses={
        **_AUTH_RESPONSE,
        **_OWNERSHIP_RESPONSE,
        404: {"description": "Post not found."},
        422: {"description": "Validation error."},
    },
)
def replace_post(
    post_id: Annotated[int, Path(gt=0)],
    payload: PostUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> Post:
    return update_post(db, post_id, payload, current_user)


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete an owned post",
    description=(
        "Requires authentication and ownership. Related comments are deleted "
        "by the database via ON DELETE CASCADE."
    ),
    responses={
        **_AUTH_RESPONSE,
        **_OWNERSHIP_RESPONSE,
        404: {"description": "Post not found."},
        204: {"description": "Post deleted; no response body."},
    },
)
def remove_post(
    post_id: Annotated[int, Path(gt=0)],
    db: DbSession,
    current_user: CurrentUser,
) -> Response:
    delete_post(db, post_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{post_id}/like",
    response_model=LikeState,
    summary="Like a post",
    description=(
        "Requires authentication. Likes are unique per user and post; repeating "
        "the request is idempotent and returns the current real like count."
    ),
    responses={
        **_AUTH_RESPONSE,
        404: {"description": "Post not found."},
    },
)
def add_like(
    post_id: Annotated[int, Path(gt=0)],
    db: DbSession,
    current_user: CurrentUser,
) -> LikeState:
    return like_post(db, post_id, current_user)


@router.delete(
    "/{post_id}/like",
    response_model=LikeState,
    summary="Remove a like",
    description=(
        "Requires authentication. Removing a like is idempotent and returns the "
        "current real like count."
    ),
    responses={
        **_AUTH_RESPONSE,
        404: {"description": "Post not found."},
    },
)
def remove_like(
    post_id: Annotated[int, Path(gt=0)],
    db: DbSession,
    current_user: CurrentUser,
) -> LikeState:
    return unlike_post(db, post_id, current_user)


@router.post(
    "/{post_id}/bookmark",
    response_model=BookmarkState,
    summary="Save a post to the library",
    description=(
        "Requires authentication. A bookmark is unique per user and post; "
        "repeating the request is idempotent. An optional collection label can "
        "be supplied in the JSON body."
    ),
    responses={
        **_AUTH_RESPONSE,
        404: {"description": "Post not found."},
        422: {"description": "Invalid collection label."},
    },
)
def add_bookmark(
    post_id: Annotated[int, Path(gt=0)],
    db: DbSession,
    current_user: CurrentUser,
    payload: BookmarkUpdate | None = None,
) -> BookmarkState:
    return bookmark_post(
        db,
        post_id,
        current_user,
        payload.collection if payload else None,
    )


@router.delete(
    "/{post_id}/bookmark",
    response_model=BookmarkState,
    summary="Remove a post from the library",
    description="Requires authentication. Removing a bookmark is idempotent.",
    responses={
        **_AUTH_RESPONSE,
        404: {"description": "Post not found."},
    },
)
def remove_saved_post(
    post_id: Annotated[int, Path(gt=0)],
    db: DbSession,
    current_user: CurrentUser,
) -> BookmarkState:
    return remove_bookmark(db, post_id, current_user)


@router.patch(
    "/{post_id}/bookmark",
    response_model=BookmarkState,
    summary="Move a saved post to a collection",
    description=(
        "Requires authentication and an existing bookmark. Send a collection "
        "label, or null to move the saved post back to Unsorted."
    ),
    responses={
        **_AUTH_RESPONSE,
        404: {"description": "Post or bookmark not found."},
        422: {"description": "Invalid collection label."},
    },
)
def change_bookmark_collection(
    post_id: Annotated[int, Path(gt=0)],
    payload: BookmarkUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> BookmarkState:
    return update_bookmark(db, post_id, current_user, payload)
