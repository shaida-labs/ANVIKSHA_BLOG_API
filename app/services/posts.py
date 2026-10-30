"""Blog post, engagement, and saved-library business logic."""

from __future__ import annotations

from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.time import utc_now
from app.models.bookmark import Bookmark
from app.models.comment import Comment
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.user import User
from app.schemas.post import (
    BookmarkCollectionRead,
    BookmarkedPost,
    BookmarkState,
    BookmarkUpdate,
    LikeState,
    PostCreate,
    PostUpdate,
    TopicRead,
)
from app.services.images import (
    delete_uploaded_file,
    validate_upload_reference,
)

PostSort = Literal["newest", "oldest", "title", "popular"]
BookmarkSort = Literal["saved_newest", "saved_oldest", "title"]


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _with_author() -> Select[tuple[Post]]:
    return select(Post).options(joinedload(Post.author))


def _require_post(db: Session, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        )
    return post


def _attach_engagement(
    db: Session,
    posts: list[Post],
    viewer_id: int | None = None,
) -> None:
    """Attach real comment/like counts and viewer state to ORM post objects."""
    if not posts:
        return

    post_ids = [post.id for post in posts]
    comment_counts = dict(
        db.execute(
            select(Comment.post_id, func.count(Comment.id))
            .where(Comment.post_id.in_(post_ids))
            .group_by(Comment.post_id)
        ).all()
    )
    like_counts = dict(
        db.execute(
            select(PostLike.post_id, func.count(PostLike.id))
            .where(PostLike.post_id.in_(post_ids))
            .group_by(PostLike.post_id)
        ).all()
    )

    liked_ids: set[int] = set()
    bookmarked_ids: set[int] = set()
    if viewer_id is not None:
        liked_ids = set(
            db.scalars(
                select(PostLike.post_id).where(
                    PostLike.user_id == viewer_id,
                    PostLike.post_id.in_(post_ids),
                )
            ).all()
        )
        bookmarked_ids = set(
            db.scalars(
                select(Bookmark.post_id).where(
                    Bookmark.user_id == viewer_id,
                    Bookmark.post_id.in_(post_ids),
                )
            ).all()
        )

    for post in posts:
        post.comment_count = int(comment_counts.get(post.id, 0))
        post.like_count = int(like_counts.get(post.id, 0))
        post.liked_by_me = post.id in liked_ids
        post.bookmarked_by_me = post.id in bookmarked_ids


def get_post_or_404(
    db: Session, post_id: int, viewer_id: int | None = None
) -> Post:
    post = db.scalar(_with_author().where(Post.id == post_id))
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        )
    _attach_engagement(db, [post], viewer_id)
    return post


def list_posts(
    db: Session,
    *,
    limit: int,
    offset: int,
    search: str | None = None,
    sort: PostSort = "newest",
    author_id: int | None = None,
    author_username: str | None = None,
    topic: str | None = None,
    viewer_id: int | None = None,
) -> tuple[list[Post], int]:
    filters = []
    if author_id is not None:
        filters.append(Post.author_id == author_id)
    if author_username and author_username.strip():
        filters.append(
            Post.author_id.in_(
                select(User.id).where(
                    func.lower(User.username) == author_username.strip().lower()
                )
            )
        )
    if topic and topic.strip():
        normalized_topic = topic.strip()
        if normalized_topic.casefold() == "general":
            filters.append(
                or_(
                    Post.topic.is_(None),
                    func.lower(func.trim(Post.topic)) == "general",
                )
            )
        else:
            filters.append(
                func.lower(func.trim(Post.topic)) == normalized_topic.casefold()
            )
    if search and search.strip():
        pattern = f"%{_escape_like(search.strip())}%"
        filters.append(
            or_(
                Post.title.ilike(pattern, escape="\\"),
                Post.excerpt.ilike(pattern, escape="\\"),
                Post.content.ilike(pattern, escape="\\"),
            )
        )

    count_statement = select(func.count()).select_from(Post)
    statement = _with_author()

    for condition in filters:
        count_statement = count_statement.where(condition)
        statement = statement.where(condition)

    like_count = (
        select(func.count(PostLike.id))
        .where(PostLike.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )
    comment_count = (
        select(func.count(Comment.id))
        .where(Comment.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    order_by = {
        "newest": (Post.created_at.desc(), Post.id.desc()),
        "oldest": (Post.created_at.asc(), Post.id.asc()),
        "title": (func.lower(Post.title).asc(), Post.id.asc()),
        "popular": (
            (like_count + comment_count).desc(),
            Post.created_at.desc(),
            Post.id.desc(),
        ),
    }[sort]
    statement = statement.order_by(*order_by).limit(limit).offset(offset)

    total = db.scalar(count_statement) or 0
    posts = list(db.scalars(statement).all())
    _attach_engagement(db, posts, viewer_id)
    return posts, total


def create_post(db: Session, payload: PostCreate, author: User) -> Post:
    if payload.cover_image_path is not None:
        validate_upload_reference(payload.cover_image_path)

    post = Post(
        title=payload.title,
        excerpt=payload.excerpt,
        content=payload.content,
        topic=payload.topic,
        cover_image_path=payload.cover_image_path,
        cover_image_url=None,
        author=author,
    )
    db.add(post)
    db.commit()
    _attach_engagement(db, [post], author.id)
    return post


def update_post(db: Session, post_id: int, payload: PostUpdate, user: User) -> Post:
    post = get_post_or_404(db, post_id, user.id)
    if post.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this post.",
        )

    if payload.cover_image_path is not None:
        validate_upload_reference(payload.cover_image_path)

    previous_path = post.cover_image_path
    post.title = payload.title
    post.excerpt = payload.excerpt
    post.content = payload.content
    post.topic = payload.topic
    # PUT replaces the whole post: omitting cover_image_path clears any image.
    post.cover_image_path = payload.cover_image_path
    # Legacy remote URLs are not accepted for new writes.
    post.cover_image_url = None
    post.updated_at = utc_now()
    db.commit()

    if previous_path and previous_path != post.cover_image_path:
        _remove_image_if_unused(db, previous_path)

    _attach_engagement(db, [post], user.id)
    return post


def delete_post(db: Session, post_id: int, user: User) -> None:
    post = get_post_or_404(db, post_id, user.id)
    if post.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this post.",
        )

    image_path = post.cover_image_path
    # ON DELETE CASCADE removes comments, likes, and bookmarks.
    db.delete(post)
    db.commit()
    if image_path:
        _remove_image_if_unused(db, image_path)


def like_post(db: Session, post_id: int, user: User) -> LikeState:
    _require_post(db, post_id)
    existing = db.scalar(
        select(PostLike).where(
            PostLike.post_id == post_id,
            PostLike.user_id == user.id,
        )
    )
    if existing is None:
        db.add(PostLike(post_id=post_id, user_id=user.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

    return LikeState(liked=True, like_count=_like_count(db, post_id))


def unlike_post(db: Session, post_id: int, user: User) -> LikeState:
    _require_post(db, post_id)
    existing = db.scalar(
        select(PostLike).where(
            PostLike.post_id == post_id,
            PostLike.user_id == user.id,
        )
    )
    if existing is not None:
        db.delete(existing)
        db.commit()

    return LikeState(liked=False, like_count=_like_count(db, post_id))


def bookmark_post(
    db: Session,
    post_id: int,
    user: User,
    collection: str | None = None,
) -> BookmarkState:
    _require_post(db, post_id)
    bookmark = db.scalar(
        select(Bookmark).where(
            Bookmark.post_id == post_id,
            Bookmark.user_id == user.id,
        )
    )
    if bookmark is None:
        bookmark = Bookmark(
            post_id=post_id,
            user_id=user.id,
            collection=collection,
        )
        db.add(bookmark)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            bookmark = db.scalar(
                select(Bookmark).where(
                    Bookmark.post_id == post_id,
                    Bookmark.user_id == user.id,
                )
            )
    elif collection is not None and bookmark.collection != collection:
        bookmark.collection = collection
        bookmark.updated_at = utc_now()
        db.commit()

    return BookmarkState(
        bookmarked=True,
        collection=bookmark.collection if bookmark is not None else collection,
    )


def remove_bookmark(db: Session, post_id: int, user: User) -> BookmarkState:
    _require_post(db, post_id)
    bookmark = db.scalar(
        select(Bookmark).where(
            Bookmark.post_id == post_id,
            Bookmark.user_id == user.id,
        )
    )
    if bookmark is not None:
        db.delete(bookmark)
        db.commit()

    return BookmarkState(bookmarked=False, collection=None)


def update_bookmark(
    db: Session,
    post_id: int,
    user: User,
    payload: BookmarkUpdate,
) -> BookmarkState:
    _require_post(db, post_id)
    bookmark = db.scalar(
        select(Bookmark).where(
            Bookmark.post_id == post_id,
            Bookmark.user_id == user.id,
        )
    )
    if bookmark is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found.",
        )

    bookmark.collection = payload.collection
    bookmark.updated_at = utc_now()
    db.commit()
    return BookmarkState(bookmarked=True, collection=bookmark.collection)


def list_bookmarks(
    db: Session,
    *,
    user: User,
    limit: int,
    offset: int,
    search: str | None = None,
    topic: str | None = None,
    collection: str | None = None,
    sort: BookmarkSort = "saved_newest",
) -> tuple[list[BookmarkedPost], int]:
    filters = [Bookmark.user_id == user.id]
    if search and search.strip():
        pattern = f"%{_escape_like(search.strip())}%"
        filters.append(
            or_(
                Post.title.ilike(pattern, escape="\\"),
                Post.excerpt.ilike(pattern, escape="\\"),
                Post.content.ilike(pattern, escape="\\"),
            )
        )
    if topic and topic.strip():
        normalized_topic = topic.strip()
        if normalized_topic.casefold() == "general":
            filters.append(
                or_(
                    Post.topic.is_(None),
                    func.lower(func.trim(Post.topic)) == "general",
                )
            )
        else:
            filters.append(
                func.lower(func.trim(Post.topic)) == normalized_topic.casefold()
            )
    if collection and collection.strip():
        filters.append(Bookmark.collection == collection.strip())

    base = (
        select(Bookmark, Post)
        .join(Post, Bookmark.post_id == Post.id)
        .options(joinedload(Post.author))
        .where(*filters)
    )
    count_statement = (
        select(func.count())
        .select_from(Bookmark)
        .join(Post, Bookmark.post_id == Post.id)
        .where(*filters)
    )

    order_by = {
        "saved_newest": (Bookmark.created_at.desc(), Bookmark.id.desc()),
        "saved_oldest": (Bookmark.created_at.asc(), Bookmark.id.asc()),
        "title": (func.lower(Post.title).asc(), Bookmark.id.asc()),
    }[sort]
    rows = list(
        db.execute(base.order_by(*order_by).limit(limit).offset(offset)).all()
    )
    total = int(db.scalar(count_statement) or 0)

    _attach_engagement(
        db,
        [post for _, post in rows],
        viewer_id=user.id,
    )
    posts: list[BookmarkedPost] = []
    for bookmark, post in rows:
        post.bookmarked_at = bookmark.created_at
        post.collection = bookmark.collection
        posts.append(BookmarkedPost.model_validate(post))

    return posts, total


def list_bookmark_collections(
    db: Session, user: User
) -> list[BookmarkCollectionRead]:
    rows = db.execute(
        select(Bookmark.collection, func.count(Bookmark.id))
        .where(
            Bookmark.user_id == user.id,
            Bookmark.collection.is_not(None),
        )
        .group_by(Bookmark.collection)
        .order_by(func.lower(Bookmark.collection))
    ).all()
    return [
        BookmarkCollectionRead(name=collection, count=int(count))
        for collection, count in rows
        if collection
    ]


def list_topics(db: Session) -> list[TopicRead]:
    rows = db.execute(
        select(Post.topic, func.count(Post.id))
        .group_by(Post.topic)
        .order_by(Post.topic.is_(None), func.lower(Post.topic))
    ).all()

    counts: dict[str, int] = {}
    for topic, count in rows:
        cleaned = topic.strip() if topic else ""
        name = (
            "General"
            if not cleaned or cleaned.casefold() == "general"
            else cleaned
        )
        counts[name] = counts.get(name, 0) + int(count)

    return [TopicRead(name=name, count=count) for name, count in counts.items()]


def _like_count(db: Session, post_id: int) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(PostLike)
            .where(PostLike.post_id == post_id)
        )
        or 0
    )


def _remove_image_if_unused(db: Session, relative_path: str) -> None:
    references = int(
        db.scalar(
            select(func.count())
            .select_from(Post)
            .where(Post.cover_image_path == relative_path)
        )
        or 0
    )
    if references == 0:
        delete_uploaded_file(relative_path)
