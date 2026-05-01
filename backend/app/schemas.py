"""Pydantic request / response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# --- Bounding Box ---

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float


# --- Class Probabilities ---

class ClassProbabilities(BaseModel):
    healthy: float = 0.0
    stress: float = 0.0
    mold: float = 0.0
    dry: float = 0.0


# --- Damage Metrics ---

class DamageMetrics(BaseModel):
    total_pct: float | None = Field(None, description="Total damaged area %")
    stress_pct: float | None = Field(None, description="Stress lesion area %")
    mold_pct: float | None = Field(None, description="Mold lesion area %")
    dry_pct: float | None = Field(None, description="Dry lesion area %")


# --- Analysis Response ---

class AnalysisResponse(BaseModel):
    id: str
    created_at: datetime
    original_filename: str

    # Image info
    image_width: int
    image_height: int

    # Detection
    detection: BoundingBox | None = None

    # Classification
    health_class: str | None = None
    health_confidence: float | None = None
    class_probabilities: ClassProbabilities | None = None

    # Segmentation
    segmentation_available: bool = False
    segmentation_mask_url: str | None = None

    # Damage
    damage: DamageMetrics | None = None

    # Visualization
    visualization_url: str | None = None
    original_image_url: str | None = None

    # Meta
    processing_time_ms: int | None = None
    pipeline_version: str = "2.6.7"
    error_message: str | None = None

    model_config = {"from_attributes": True}


class AnalysisListItem(BaseModel):
    id: str
    created_at: datetime
    original_filename: str
    health_class: str | None = None
    health_confidence: float | None = None
    segmentation_available: bool = False
    damage_total_pct: float | None = None
    processing_time_ms: int | None = None
    visualization_url: str | None = None

    model_config = {"from_attributes": True}


class AnalysisListResponse(BaseModel):
    items: list[AnalysisListItem]
    total: int
    page: int
    page_size: int


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "2.6.7"
    models_loaded: dict[str, bool] = {}
    database: str = "ok"


class ErrorResponse(BaseModel):
    detail: str
