"""Shared FastAPI dependencies."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with async_session() as session:
        yield session
