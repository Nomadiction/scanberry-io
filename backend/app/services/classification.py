"""EfficientNet-B0 classification service."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms

logger = logging.getLogger(__name__)

# ImageFolder sorts alphabetically: dry=0, healthy=1, mold=2, stress=3
CLASS_NAMES = ["dry", "healthy", "mold", "stress"]
CLASS_INDEX = {name: i for i, name in enumerate(CLASS_NAMES)}

# Stage 2 resolution used during training
INPUT_SIZE = 320

# ImageNet normalization
NORMALIZE = transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])


@dataclass
class ClassificationResult:
    predicted_class: str
    confidence: float
    probabilities: dict[str, float]


def _build_model(num_classes: int = 4, dropout: float = 0.3) -> nn.Module:
    """Build EfficientNet-B0 with the same classifier head used during training."""
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=dropout, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


class ClassificationService:
    """Wraps EfficientNet-B0 for health state classification."""

    def __init__(self, model_path: str, device: str = "cpu"):
        self.model: nn.Module | None = None
        self.device = torch.device(device)
        self._model_path = model_path
        self._loaded = False

        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.ToTensor(),
            NORMALIZE,
        ])

    def load(self) -> None:
        path = Path(self._model_path)
        if not path.exists():
            logger.error("Classification model not found: %s", path)
            raise FileNotFoundError(f"Classification model not found: {path}")

        self.model = _build_model(num_classes=len(CLASS_NAMES))
        checkpoint = torch.load(str(path), map_location=self.device, weights_only=False)
        # Support both raw state_dict and training checkpoint format
        state_dict = checkpoint.get("model_state", checkpoint) if isinstance(checkpoint, dict) else checkpoint
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()
        self._loaded = True
        logger.info("Classification model loaded from %s (device=%s)", path, self.device)

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @torch.no_grad()
    def predict(self, img_rgb: np.ndarray) -> ClassificationResult:
        """Classify a single RGB crop. Returns class name, confidence, and per-class probabilities."""
        if not self._loaded:
            raise RuntimeError("Classification model not loaded — call load() first")

        tensor = self.transform(img_rgb).unsqueeze(0).to(self.device)
        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

        pred_idx = int(probs.argmax())
        return ClassificationResult(
            predicted_class=CLASS_NAMES[pred_idx],
            confidence=float(probs[pred_idx]),
            probabilities={name: round(float(probs[i]), 4) for i, name in enumerate(CLASS_NAMES)},
        )

    @torch.no_grad()
    def predict_tta(self, img_rgb: np.ndarray) -> ClassificationResult:
        """Test-Time Augmentation: average predictions over original + horizontal flip."""
        if not self._loaded:
            raise RuntimeError("Classification model not loaded — call load() first")

        imgs = [img_rgb, np.fliplr(img_rgb).copy()]
        batch = torch.stack([self.transform(im) for im in imgs]).to(self.device)
        logits = self.model(batch)
        avg_probs = torch.softmax(logits, dim=1).mean(dim=0).cpu().numpy()

        pred_idx = int(avg_probs.argmax())
        return ClassificationResult(
            predicted_class=CLASS_NAMES[pred_idx],
            confidence=float(avg_probs[pred_idx]),
            probabilities={name: round(float(avg_probs[i]), 4) for i, name in enumerate(CLASS_NAMES)},
        )
