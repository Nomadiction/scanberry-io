"""Result visualization — draw bounding boxes, segmentation overlays, labels."""

from __future__ import annotations

import cv2
import numpy as np

# Color palette (BGR)
COLOR_BBOX = (0, 255, 0)        # green
COLOR_PLANT = (0, 200, 0)       # green overlay
COLOR_STRESS = (0, 165, 255)    # orange
COLOR_MOLD = (255, 0, 128)      # purple
COLOR_DRY = (0, 0, 255)         # red
OVERLAY_ALPHA = 0.4

CLASS_COLORS = {
    "plant": COLOR_PLANT,
    "healthy": COLOR_PLANT,
    "stress": COLOR_STRESS,
    "mold": COLOR_MOLD,
    "dry": COLOR_DRY,
}

# Health class label colors
HEALTH_COLORS = {
    "healthy": (0, 200, 0),
    "stress": (0, 165, 255),
    "mold": (255, 0, 128),
    "dry": (0, 0, 255),
}


def draw_results(
    img_bgr: np.ndarray,
    bbox: tuple[float, float, float, float] | None = None,
    det_confidence: float | None = None,
    health_class: str | None = None,
    health_confidence: float | None = None,
    plant_mask: np.ndarray | None = None,
    class_masks: dict[str, np.ndarray] | None = None,
    damage_total_pct: float | None = None,
) -> np.ndarray:
    """Compose a visualization image with all analysis results.

    Args:
        img_bgr: Original image in BGR.
        bbox: (x1, y1, x2, y2) detection bounding box.
        health_class: Predicted health class.
        health_confidence: Confidence of classification.
        plant_mask: Binary plant mask (0/255), same size as img or crop.
        class_masks: Per-class lesion masks.
        damage_total_pct: Total damage percentage.

    Returns:
        BGR image with overlays drawn.
    """
    vis = img_bgr.copy()

    # --- Segmentation overlay ---
    if class_masks:
        for cls_name, mask in class_masks.items():
            color = CLASS_COLORS.get(cls_name, COLOR_PLANT)
            if mask is not None and mask.shape[:2] == vis.shape[:2]:
                overlay = vis.copy()
                overlay[mask > 127] = color
                vis = cv2.addWeighted(overlay, OVERLAY_ALPHA, vis, 1 - OVERLAY_ALPHA, 0)
    elif plant_mask is not None and plant_mask.shape[:2] == vis.shape[:2]:
        overlay = vis.copy()
        overlay[plant_mask > 127] = COLOR_PLANT
        vis = cv2.addWeighted(overlay, OVERLAY_ALPHA, vis, 1 - OVERLAY_ALPHA, 0)

    # --- Detection bounding box ---
    if bbox is not None:
        x1, y1, x2, y2 = [int(c) for c in bbox]
        cv2.rectangle(vis, (x1, y1), (x2, y2), COLOR_BBOX, 3)

        # Confidence label near the box
        if det_confidence is not None:
            label = f"plant {det_confidence:.0%}"
            _draw_label(vis, label, x1, y1 - 10, COLOR_BBOX)

    # --- Health class label ---
    if health_class is not None:
        color = HEALTH_COLORS.get(health_class, (255, 255, 255))
        conf_str = f" {health_confidence:.0%}" if health_confidence else ""
        label = f"{health_class.upper()}{conf_str}"
        _draw_label(vis, label, 10, 40, color, font_scale=1.2, thickness=3)

    # --- Damage info ---
    if damage_total_pct is not None:
        dmg_label = f"Damage: {damage_total_pct:.1f}%"
        _draw_label(vis, dmg_label, 10, 80, (255, 255, 255), font_scale=0.8)

    return vis


def _draw_label(
    img: np.ndarray,
    text: str,
    x: int,
    y: int,
    color: tuple[int, int, int],
    font_scale: float = 0.7,
    thickness: int = 2,
) -> None:
    """Draw text with a dark background for readability."""
    font = cv2.FONT_HERSHEY_SIMPLEX
    (tw, th), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    y = max(th + 4, y)
    cv2.rectangle(img, (x, y - th - 4), (x + tw + 4, y + baseline + 4), (0, 0, 0), -1)
    cv2.putText(img, text, (x + 2, y), font, font_scale, color, thickness, cv2.LINE_AA)
