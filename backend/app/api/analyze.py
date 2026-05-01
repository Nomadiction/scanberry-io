"""POST /analyze — upload an image and run the full ML pipeline."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.mappers import analysis_to_response
from app.config import settings
from app.models import Analysis
from app.schemas import AnalysisResponse
from app.services.pipeline import PIPELINE_VERSION, pipeline
from app.services.storage import storage
from app.utils.image import load_image_from_bytes

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=201,
    tags=["analysis"],
    summary="Analyze a plant image",
    description="Upload a photo of a blueberry bush. The API runs detection, classification, "
                "and segmentation (when available) and returns a full diagnosis.",
)
async def analyze_image(
    file: UploadFile,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    # --- Validate upload ---
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. "
                                 f"Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}")

    data = await file.read()
    if len(data) > settings.max_upload_size_bytes:
        raise HTTPException(413, f"File too large. Max: {settings.max_upload_size_mb} MB")

    if len(data) == 0:
        raise HTTPException(400, "Empty file uploaded")

    # --- Decode image ---
    try:
        img_bgr = load_image_from_bytes(data)
    except ValueError as e:
        raise HTTPException(400, str(e))

    h, w = img_bgr.shape[:2]

    # --- Create DB record ---
    record = Analysis(
        original_filename=file.filename or "unknown.jpg",
        image_path="",
        image_width=w,
        image_height=h,
        pipeline_version=PIPELINE_VERSION,
    )
    db.add(record)
    await db.flush()  # get the generated id

    # --- Save original image ---
    image_key = await storage.save_upload(data, record.original_filename, record.id)
    record.image_path = image_key

    # --- Run ML pipeline ---
    result = await pipeline.run(img_bgr)

    # --- Populate DB record from results ---
    record.processing_time_ms = result.processing_time_ms
    record.error_message = result.error

    if result.detection:
        record.det_bbox_x1 = result.detection.x1
        record.det_bbox_y1 = result.detection.y1
        record.det_bbox_x2 = result.detection.x2
        record.det_bbox_y2 = result.detection.y2
        record.det_confidence = result.detection.confidence

    if result.classification:
        record.health_class = result.classification.predicted_class
        record.health_confidence = result.classification.confidence
        record.class_probabilities = json.dumps(result.classification.probabilities)

    if result.segmentation:
        record.segmentation_available = result.segmentation.available
        # Save segmentation mask as PNG
        if result.segmentation.available and result.segmentation.mask is not None:
            import cv2
            _, mask_png = cv2.imencode(".png", result.segmentation.mask)
            mask_key = await storage.save_result(mask_png.tobytes(), record.id, "mask.png")
            record.segmentation_mask_path = mask_key

    if result.damage:
        record.damage_total_pct = result.damage.total_pct
        record.damage_stress_pct = result.damage.stress_pct
        record.damage_mold_pct = result.damage.mold_pct
        record.damage_dry_pct = result.damage.dry_pct

    # --- Save visualization ---
    if result.visualization_bytes:
        vis_key = await storage.save_result(result.visualization_bytes, record.id, "visualization.jpg")
        record.visualization_path = vis_key

    await db.commit()
    await db.refresh(record)

    return analysis_to_response(record, request)
