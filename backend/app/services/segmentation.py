"""Segmentation service — Bush (U-Net) + Lesion (DeepLabV3+).

Two-model pipeline:
1. Bush model (U-Net + ResNet34, binary) → plant mask
2. Lesion model (DeepLabV3+ + EfficientNet-B3, 5 classes) → per-pixel lesion map
3. Bush-mask gating: zero out lesion predictions outside the bush area

Output classes (lesion model):
  0 = background, 1 = healthy, 2 = stress, 3 = dry, 4 = mold
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

INPUT_SIZE = 512
LESION_CLASSES = ["background", "healthy", "stress", "dry", "mold"]


@dataclass
class SegmentationResult:
    """Pixel-level segmentation output."""
    mask: np.ndarray | None = None          # (H, W) uint8 0/255 — binary plant mask
    class_masks: dict[str, np.ndarray] = field(default_factory=dict)  # per-class masks
    available: bool = False


class SegmentationService:
    """Two-model segmentation: bush (binary) + lesion (5-class).

    To enable:
    1. Set MODEL_SEGMENTATION_BUSH_PATH to bush best_model.pth
    2. Set MODEL_SEGMENTATION_LESION_PATH to lesion best_model.pth
    3. Restart backend
    """

    def __init__(
        self,
        bush_model_path: str = "",
        lesion_model_path: str = "",
        device: str = "cpu",
    ):
        self.bush_model = None
        self.lesion_model = None
        self.device = device
        self._bush_path = bush_model_path
        self._lesion_path = lesion_model_path
        self._bush_loaded = False
        self._lesion_loaded = False

    def load(self) -> None:
        import torch
        import segmentation_models_pytorch as smp

        dev = torch.device(self.device)

        # --- Bush model ---
        if self._bush_path:
            bp = Path(self._bush_path)
            if bp.exists():
                self.bush_model = smp.Unet(
                    encoder_name="resnet34",
                    encoder_weights=None,
                    in_channels=3,
                    classes=1,
                )
                state = torch.load(str(bp), map_location=dev, weights_only=True)
                self.bush_model.load_state_dict(state)
                self.bush_model.to(dev).eval()
                self._bush_loaded = True
                logger.info("Bush segmentation model loaded from %s", bp)
            else:
                logger.warning("Bush model not found: %s", bp)
        else:
            logger.warning("Bush model path not configured")

        # --- Lesion model ---
        if self._lesion_path:
            lp = Path(self._lesion_path)
            if lp.exists():
                self.lesion_model = smp.DeepLabV3Plus(
                    encoder_name="efficientnet-b3",
                    encoder_weights=None,
                    in_channels=3,
                    classes=5,
                )
                state = torch.load(str(lp), map_location=dev, weights_only=True)
                self.lesion_model.load_state_dict(state)
                self.lesion_model.to(dev).eval()
                self._lesion_loaded = True
                logger.info("Lesion segmentation model loaded from %s", lp)
            else:
                logger.warning("Lesion model not found: %s", lp)
        else:
            logger.warning("Lesion model path not configured")

    @property
    def is_loaded(self) -> bool:
        return self._bush_loaded or self._lesion_loaded

    def predict(self, img_rgb: np.ndarray) -> SegmentationResult:
        """Run segmentation on an RGB crop.

        Returns SegmentationResult with bush mask and per-class lesion masks.
        """
        h, w = img_rgb.shape[:2]

        if not self.is_loaded:
            return SegmentationResult(
                mask=np.zeros((h, w), dtype=np.uint8),
                class_masks={},
                available=False,
            )

        import torch
        import cv2
        from torchvision import transforms

        transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        dev = torch.device(self.device)
        tensor = transform(img_rgb).unsqueeze(0).to(dev)

        class_masks: dict[str, np.ndarray] = {}

        # --- Bush prediction ---
        bush_mask_full = np.ones((h, w), dtype=np.uint8) * 255  # default: everything is plant
        if self._bush_loaded:
            with torch.no_grad():
                bush_out = self.bush_model(tensor)
                bush_pred = (torch.sigmoid(bush_out) > 0.5).float()
            bush_small = (bush_pred[0, 0].cpu().numpy() * 255).astype(np.uint8)
            bush_mask_full = cv2.resize(bush_small, (w, h), interpolation=cv2.INTER_NEAREST)
            class_masks["plant"] = bush_mask_full

        # --- Lesion prediction ---
        if self._lesion_loaded:
            with torch.no_grad():
                lesion_out = self.lesion_model(tensor)
                lesion_map_small = lesion_out.argmax(dim=1)[0].cpu().numpy().astype(np.uint8)

            # Bush-mask gating: zero out predictions outside bush area
            if self._bush_loaded:
                bush_small_bin = (bush_pred[0, 0].cpu().numpy() > 0.5).astype(np.uint8)
                lesion_map_small[bush_small_bin == 0] = 0

            lesion_map_full = cv2.resize(
                lesion_map_small, (w, h), interpolation=cv2.INTER_NEAREST,
            )

            # Extract per-class binary masks (0/255)
            for cls_id, cls_name in enumerate(LESION_CLASSES):
                if cls_name == "background":
                    continue
                cls_mask = ((lesion_map_full == cls_id) * 255).astype(np.uint8)
                class_masks[cls_name] = cls_mask

        return SegmentationResult(
            mask=bush_mask_full,
            class_masks=class_masks,
            available=True,
        )
