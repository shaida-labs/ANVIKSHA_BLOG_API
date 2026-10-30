"""FastAPI application entry point for the ANVIKSHA publishing API."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.api.routes import (
    auth,
    bookmarks,
    comments,
    posts,
    profiles,
    topics,
    uploads,
)
from app.core.config import settings
from app.dependencies import DbSession
from app.schemas.common import HealthResponse

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("blog_api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "Starting %s (environment=%s)", settings.app_name, settings.environment
    )
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "ANVIKSHA is a database-backed knowledge publishing platform built "
        "with FastAPI, PostgreSQL, SQLAlchemy 2.x, and JWT authentication.\n\n"
        "**Question Deeper. Understand Better.**\n\n"
        "### Authorization policy\n"
        "- All create, update, and delete endpoints require a Bearer JWT.\n"
        "- Only a post's or comment's author may modify or delete it.\n"
        "- Existing resources owned by another user return `403 Forbidden`.\n"
        "- Missing resources return `404 Not Found`.\n"
        "- A deleted post deletes its comments through `ON DELETE CASCADE`.\n"
        "- Users with existing content cannot be deleted (`ON DELETE RESTRICT`); "
        "no user-deletion endpoint is exposed.\n\n"
        "Use `POST /login` to obtain a token, then click **Authorize** and paste it."
    ),
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "General",
            "description": "Service metadata and database-aware health check.",
        },
        {
            "name": "Authentication",
            "description": "Registration, login, and current-user lookup.",
        },
        {"name": "Posts", "description": "Create and manage ANVIKSHA stories."},
        {"name": "Comments", "description": "Create and manage post comments."},
        {"name": "Topics", "description": "Real topic discovery and post counts."},
        {
            "name": "Library",
            "description": "Persistent, private saved stories and collections.",
        },
        {
            "name": "Authors",
            "description": "Public author profiles and safe profile updates.",
        },
        {"name": "Uploads", "description": "Validated cover image uploads and serving."},
    ],
    contact={
        "name": "ANVIKSHA — Knowledge Platform for Curious Minds",
    },
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.cors_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return 422 details without echoing submitted values (e.g. passwords)."""
    details = [
        {
            "loc": list(error.get("loc", ())),
            "msg": error.get("msg", "Invalid value."),
            "type": error.get("type", "value_error"),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": details},
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning("Unhandled database integrity error: %s", exc.__class__.__name__)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "The request conflicts with existing data."},
    )


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.error("Database error: %s", exc.__class__.__name__)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "Unhandled exception while processing %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred."},
    )


app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(uploads.router)
app.include_router(bookmarks.router)
app.include_router(profiles.router)
app.include_router(topics.router)


@app.get("/", tags=["General"], summary="API information")
def root() -> dict[str, str]:
    return {
        "message": "Welcome to the ANVIKSHA API",
        "project_id": "ANVIKSHA",
        "status": "running",
        "docs": "/docs",
    }


@app.get(
    "/health",
    tags=["General"],
    response_model=HealthResponse,
    summary="Application and database health",
    description=(
        "Verifies that the API process is running and that a database query "
        "succeeds. Returns 503 when the database is unreachable."
    ),
    responses={503: {"description": "The database is unavailable."}},
)
def health_check(db: DbSession) -> HealthResponse:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.warning("Health check failed: %s", exc.__class__.__name__)
        try:
            db.rollback()
        except SQLAlchemyError:
            # A broken connection can also make rollback fail; the health
            # response should still be a clear 503.
            pass
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable.",
        ) from exc

    return HealthResponse(
        status="healthy",
        database="reachable",
        service="anviksha-api",
    )
