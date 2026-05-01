"""Damage quantification from segmentation masks."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class DamageResult:
    total_pct: float | None = None
    stress_pct: float | None = None
    mold_pct: float | None = None
    dry_pct: float | None = None


def compute_damage(
    plant_mask: np.ndarray | None,
    class_masks: dict[str, np.ndarray] | None,
) -> DamageResult:
    """Compute damage percentages from segmentation masks.

    Args:
        plant_mask: Binary mask (0/255) of the whole plant region.
        class_masks: Dict mapping lesion class names to their binary masks.
            Expected keys: 'lesion_stress', 'lesion_mold', 'lesion_dry'.

    Returns:
        DamageResult with percentage of each lesion type relative to plant area.
        Returns None values when segmentation data is not available.
    """
    if plant_mask is None or class_masks is None or len(class_masks) == 0:
        return DamageResult()

    plant_pixels = int((plant_mask > 127).sum())
    if plant_pixels == 0:
        return DamageResult(total_pct=0.0, stress_pct=0.0, mold_pct=0.0, dry_pct=0.0)

    def _pct(mask_key: str) -> float:
        mask = class_masks.get(mask_key)
        if mask is None:
            return 0.0
        return round(float((mask > 127).sum()) / plant_pixels * 100, 2)

    stress = _pct("stress")
    mold = _pct("mold")
    dry = _pct("dry")
    total = round(stress + mold + dry, 2)

    return DamageResult(total_pct=total, stress_pct=stress, mold_pct=mold, dry_pct=dry)
