"""YOLOv8 plant detection service."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class DetectionResult:
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_id: int = 0
    class_name: str = "plant"


class DetectionService:
    """Wraps Ultralytics YOLOv8 for plant detection."""

    def __init__(self, model_path: str, device: str = "cpu", conf_threshold: float = 0.25):
        self.model = None
        self.device = device
        self.conf_threshold = conf_threshold
        self._model_path = model_path
        self._loaded = False

    def load(self) -> None:
        path = Path(self._model_path)
        if not path.exists():
            logger.error("Detection model not found: %s", path)
            raise FileNotFoundError(f"Detection model not found: {path}")

        from ultralytics import YOLO
        self.model = YOLO(str(path))
        self._loaded = True
        logger.info("Detection model loaded from %s (device=%s)", path, self.device)

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def predict(self, img_bgr: np.ndarray) -> list[DetectionResult]:
        """Run detection on a BGR image. Returns list of detections sorted by confidence desc."""
        if not self._loaded:
            raise RuntimeError("Detection model not loaded — call load() first")

        results = self.model.predict(
            source=img_bgr,
            device=self.device,
            conf=self.conf_threshold,
            verbose=False,
        )

        detections: list[DetectionResult] = []
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                xyxy = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())
                detections.append(DetectionResult(
                    x1=float(xyxy[0]),
                    y1=float(xyxy[1]),
                    x2=float(xyxy[2]),
                    y2=float(xyxy[3]),
                    confidence=conf,
                    class_id=cls_id,
                    class_name="plant",
                ))

        detections.sort(key=lambda d: d.confidence, reverse=True)
        return detections
