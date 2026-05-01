"""Shared DB-record-to-response mappers."""

from __future__ import annotations

import json

from fastapi import Request

from app.config import settings
from app.models import Analysis
from app.schemas import (
    AnalysisResponse,
    BoundingBox,
    ClassProbabilities,
    DamageMetrics,
)


def _public_base(request: Request) -> str:
    """Build the public base URL, respecting reverse-proxy headers.

    Azure App Service terminates TLS at the load-balancer and forwards
    requests to Uvicorn over plain HTTP, so ``request.base_url`` will
    always have an ``http://`` scheme. We honour ``X-Forwarded-Proto``
    (set by the Azure front-end) to return the correct ``https://`` URL
    to callers.
    """
    raw = str(request.base_url).rstrip("/")
    proto = request.headers.get("x-forwarded-proto")
    if proto:
        raw = raw.replace("http://", f"{proto}://", 1)
    return raw


def analysis_to_response(record: Analysis, request: Request) -> AnalysisResponse:
    """Convert an Analysis ORM record to an API response with file URLs."""
    base = _public_base(request) + settings.api_v1_prefix

    detection = None
    if record.det_bbox_x1 is not None:
        detection = BoundingBox(
            x1=record.det_bbox_x1,
            y1=record.det_bbox_y1,
            x2=record.det_bbox_x2,
            y2=record.det_bbox_y2,
            confidence=record.det_confidence or 0.0,
        )

    probs = None
    if record.class_probabilities:
        try:
            probs = ClassProbabilities(**json.loads(record.class_probabilities))
        except Exception:
            pass

    damage = None
    if record.damage_total_pct is not None:
        damage = DamageMetrics(
            total_pct=record.damage_total_pct,
            stress_pct=record.damage_stress_pct,
            mold_pct=record.damage_mold_pct,
            dry_pct=record.damage_dry_pct,
        )

    return AnalysisResponse(
        id=record.id,
        created_at=record.created_at,
        original_filename=record.original_filename,
        image_width=record.image_width,
        image_height=record.image_height,
        detection=detection,
        health_class=record.health_class,
        health_confidence=record.health_confidence,
        class_probabilities=probs,
        segmentation_available=record.segmentation_available,
        segmentation_mask_url=f"{base}/analyses/{record.id}/mask" if record.segmentation_available else None,
        damage=damage,
        visualization_url=f"{base}/analyses/{record.id}/visualization" if record.visualization_path else None,
        original_image_url=f"{base}/analyses/{record.id}/image",
        processing_time_ms=record.processing_time_ms,
        pipeline_version=record.pipeline_version,
        error_message=record.error_message,
    )
