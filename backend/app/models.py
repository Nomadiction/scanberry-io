"""SQLAlchemy ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return uuid.uuid4().hex


class Analysis(Base):
    """Single image analysis result."""

    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_id)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)

    # Original upload
    original_filename: Mapped[str] = mapped_column(String(255))
    image_path: Mapped[str] = mapped_column(String(512))
    image_width: Mapped[int] = mapped_column(Integer)
    image_height: Mapped[int] = mapped_column(Integer)

    # Detection
    det_bbox_x1: Mapped[float | None] = mapped_column(Float, nullable=True)
    det_bbox_y1: Mapped[float | None] = mapped_column(Float, nullable=True)
    det_bbox_x2: Mapped[float | None] = mapped_column(Float, nullable=True)
    det_bbox_y2: Mapped[float | None] = mapped_column(Float, nullable=True)
    det_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Classification
    health_class: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    health_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    class_probabilities: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON

    # Segmentation (stub — will be populated when model is ready)
    segmentation_mask_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    segmentation_available: Mapped[bool] = mapped_column(nullable=False, server_default="false", default=False)

    # Damage quantification
    damage_total_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    damage_stress_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    damage_mold_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    damage_dry_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Visualization
    visualization_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Processing metadata
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pipeline_version: Mapped[str] = mapped_column(String(32), default="2.6.7")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

