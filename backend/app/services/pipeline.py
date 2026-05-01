"""ML inference pipeline — orchestrates detection, classification, segmentation, damage."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path

import cv2
import numpy as np

from app.config import settings
from app.services.classification import ClassificationResult, ClassificationService
from app.services.damage import DamageResult, compute_damage
from app.services.detection import DetectionResult, DetectionService
from app.services.segmentation import SegmentationResult, SegmentationService
from app.services.visualization import draw_results
from app.utils.image import bgr_to_rgb, crop_bbox, encode_image_jpg

logger = logging.getLogger(__name__)

PIPELINE_VERSION = "2.6.7"


class PipelineResult:
    """Aggregated result from the full analysis pipeline."""

    def __init__(self) -> None:
        self.detection: DetectionResult | None = None
        self.classification: ClassificationResult | None = None
        self.segmentation: SegmentationResult | None = None
        self.damage: DamageResult | None = None
        self.visualization_bytes: bytes | None = None
        self.processing_time_ms: int = 0
        self.error: str | None = None


class InferencePipeline:
    """Loads all models and runs the full analysis pipeline."""

    def __init__(self) -> None:
        self.detection = DetectionService(
            model_path=settings.model_detection_path,
            device=settings.device,
        )
        self.classification = ClassificationService(
            model_path=settings.model_classification_path,
            device=settings.device,
        )
        self.segmentation = SegmentationService(
            bush_model_path=settings.model_segmentation_bush_path,
            lesion_model_path=settings.model_segmentation_lesion_path,
            device=settings.device,
        )
        self._ready = False

    def load_models(self) -> dict[str, bool]:
        """Load all available models. Returns status dict."""
        status: dict[str, bool] = {}

        # Detection
        try:
            if settings.model_detection_path:
                self.detection.load()
                status["detection"] = True
            else:
                logger.warning("Detection model path not set")
                status["detection"] = False
        except Exception as e:
            logger.error("Failed to load detection model: %s", e)
            status["detection"] = False

        # Classification
        try:
            if settings.model_classification_path:
                self.classification.load()
                status["classification"] = True
            else:
                logger.warning("Classification model path not set")
                status["classification"] = False
        except Exception as e:
            logger.error("Failed to load classification model: %s", e)
            status["classification"] = False

        # Segmentation
        try:
            self.segmentation.load()
            status["segmentation"] = self.segmentation.is_loaded
        except Exception as e:
            logger.error("Failed to load segmentation model: %s", e)
            status["segmentation"] = False

        self._ready = True
        logger.info("Pipeline models status: %s", status)
        return status

    @property
    def models_status(self) -> dict[str, bool]:
        return {
            "detection": self.detection.is_loaded,
            "classification": self.classification.is_loaded,
            "segmentation": self.segmentation.is_loaded,
        }

    def run_sync(self, img_bgr: np.ndarray) -> PipelineResult:
        """Run the full pipeline synchronously.

        Pipeline order:
        1. Detection — find the plant bounding box
        2. Crop to detection region
        3. Classification — determine health state on the crop
        4. Segmentation — pixel-level mask on the crop (stub if model unavailable)
        5. Damage quantification — compute % from segmentation masks
        6. Visualization — compose result overlay on the original image
        """
        result = PipelineResult()
        t0 = time.perf_counter()

        try:
            h, w = img_bgr.shape[:2]
            img_rgb = bgr_to_rgb(img_bgr)

            # --- Step 1: Detection ---
            crop_rgb = img_rgb  # fallback: use full image if no detection
            if self.detection.is_loaded:
                detections = self.detection.predict(img_bgr)
                if detections:
                    best = detections[0]
                    result.detection = best
                    crop_rgb = crop_bbox(
                        img_rgb,
                        int(best.x1), int(best.y1), int(best.x2), int(best.y2),
                        padding=0.05,
                    )
                    logger.info("Detected plant: confidence=%.3f bbox=(%.0f,%.0f,%.0f,%.0f)",
                                best.confidence, best.x1, best.y1, best.x2, best.y2)
                else:
                    logger.warning("No plant detected — using full image for classification")
            else:
                logger.warning("Detection model not loaded — using full image")

            # --- Step 2: Classification ---
            if self.classification.is_loaded:
                result.classification = self.classification.predict_tta(crop_rgb)
                logger.info("Classification: %s (%.3f)",
                            result.classification.predicted_class,
                            result.classification.confidence)

            # --- Step 3: Segmentation ---
            result.segmentation = self.segmentation.predict(crop_rgb)

            # --- Step 4: Damage quantification ---
            if result.segmentation and result.segmentation.available:
                result.damage = compute_damage(
                    plant_mask=result.segmentation.mask,
                    class_masks=result.segmentation.class_masks,
                )

            # --- Step 5: Visualization ---
            bbox_tuple = None
            if result.detection:
                bbox_tuple = (result.detection.x1, result.detection.y1,
                              result.detection.x2, result.detection.y2)

            seg_plant_mask = None
            seg_class_masks = None
            if result.segmentation and result.segmentation.available:
                seg_plant_mask = result.segmentation.mask
                seg_class_masks = result.segmentation.class_masks

            vis = draw_results(
                img_bgr=img_bgr,
                bbox=bbox_tuple,
                det_confidence=result.detection.confidence if result.detection else None,
                health_class=result.classification.predicted_class if result.classification else None,
                health_confidence=result.classification.confidence if result.classification else None,
                plant_mask=seg_plant_mask,
                class_masks=seg_class_masks,
                damage_total_pct=result.damage.total_pct if result.damage else None,
            )
            result.visualization_bytes = encode_image_jpg(vis, quality=90)

        except Exception as e:
            logger.exception("Pipeline error: %s", e)
            result.error = str(e)

        result.processing_time_ms = int((time.perf_counter() - t0) * 1000)
        return result

    async def run(self, img_bgr: np.ndarray) -> PipelineResult:
        """Async wrapper — runs inference in a thread pool to avoid blocking the event loop."""
        return await asyncio.to_thread(self.run_sync, img_bgr)


# Singleton instance
pipeline = InferencePipeline()
