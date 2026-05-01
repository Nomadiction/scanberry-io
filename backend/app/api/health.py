"""Health check endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas import HealthResponse
from app.services.pipeline import PIPELINE_VERSION, pipeline

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    """Check API, database, and model status."""
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        version=PIPELINE_VERSION,
        models_loaded=pipeline.models_status,
        database=db_status,
    )
