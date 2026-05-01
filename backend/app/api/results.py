"""Analysis results endpoints — list, get, delete, serve files."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.mappers import analysis_to_response, _public_base
from app.config import settings
from app.models import Analysis
from app.schemas import AnalysisListItem, AnalysisListResponse, AnalysisResponse
from app.services.storage import storage

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------- GET /analyses ----------

@router.get(
    "/analyses",
    response_model=AnalysisListResponse,
    tags=["analysis"],
    summary="List analyses",
)
async def list_analyses(
    request: Request,
    page: int = 1,
    page_size: int = 20,
    health_class: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> AnalysisListResponse:
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20
    offset = (page - 1) * page_size

    base_q = select(Analysis)
    count_q = select(func.count(Analysis.id))

    if health_class:
        base_q = base_q.where(Analysis.health_class == health_class)
        count_q = count_q.where(Analysis.health_class == health_class)

    total = (await db.execute(count_q)).scalar() or 0

    rows = (
        await db.execute(
            base_q.order_by(Analysis.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()

    base_url = _public_base(request) + settings.api_v1_prefix

    items = []
    for r in rows:
        items.append(AnalysisListItem(
            id=r.id,
            created_at=r.created_at,
            original_filename=r.original_filename,
            health_class=r.health_class,
            health_confidence=r.health_confidence,
            segmentation_available=r.segmentation_available,
            damage_total_pct=r.damage_total_pct,
            processing_time_ms=r.processing_time_ms,
            visualization_url=f"{base_url}/analyses/{r.id}/visualization" if r.visualization_path else None,
        ))

    return AnalysisListResponse(items=items, total=total, page=page, page_size=page_size)


# ---------- GET /analyses/{id} ----------

@router.get(
    "/analyses/{analysis_id}",
    response_model=AnalysisResponse,
    tags=["analysis"],
    summary="Get analysis details",
)
async def get_analysis(
    analysis_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    record = await db.get(Analysis, analysis_id)
    if not record:
        raise HTTPException(404, "Analysis not found")
    return analysis_to_response(record, request)


# ---------- DELETE /analyses/{id} ----------

@router.delete(
    "/analyses/{analysis_id}",
    tags=["analysis"],
    summary="Delete an analysis",
)
async def delete_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    record = await db.get(Analysis, analysis_id)
    if not record:
        raise HTTPException(404, "Analysis not found")

    await storage.delete_analysis_files(analysis_id)
    await db.delete(record)
    await db.commit()
    return Response(status_code=204)


# ---------- GET /analyses/{id}/image ----------

@router.get(
    "/analyses/{analysis_id}/image",
    tags=["files"],
    summary="Get original uploaded image",
)
async def get_original_image(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    record = await db.get(Analysis, analysis_id)
    if not record:
        raise HTTPException(404, "Analysis not found")

    data = await storage.read_file(record.image_path)
    if data is None:
        raise HTTPException(404, "Image file not found")

    media_type = "image/jpeg"
    if record.image_path.endswith(".png"):
        media_type = "image/png"

    return Response(content=data, media_type=media_type)


# ---------- GET /analyses/{id}/visualization ----------

@router.get(
    "/analyses/{analysis_id}/visualization",
    tags=["files"],
    summary="Get result visualization image",
)
async def get_visualization(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    record = await db.get(Analysis, analysis_id)
    if not record or not record.visualization_path:
        raise HTTPException(404, "Visualization not found")

    data = await storage.read_file(record.visualization_path)
    if data is None:
        raise HTTPException(404, "Visualization file not found")

    return Response(content=data, media_type="image/jpeg")


# ---------- GET /analyses/{id}/mask ----------

@router.get(
    "/analyses/{analysis_id}/mask",
    tags=["files"],
    summary="Get segmentation mask (when available)",
)
async def get_segmentation_mask(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    record = await db.get(Analysis, analysis_id)
    if not record:
        raise HTTPException(404, "Analysis not found")

    if not record.segmentation_available or not record.segmentation_mask_path:
        raise HTTPException(404, "Segmentation mask not available for this analysis")

    data = await storage.read_file(record.segmentation_mask_path)
    if data is None:
        raise HTTPException(404, "Mask file not found")

    return Response(content=data, media_type="image/png")
