"""Image loading and preprocessing utilities."""

from __future__ import annotations

import io

import cv2
import numpy as np
from PIL import Image


def load_image_from_bytes(data: bytes) -> np.ndarray:
    """Decode uploaded bytes into a BGR numpy array (OpenCV format)."""
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image — unsupported or corrupted file")
    return img


def bgr_to_rgb(img: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def rgb_to_bgr(img: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)


def crop_bbox(img: np.ndarray, x1: int, y1: int, x2: int, y2: int, padding: float = 0.05) -> np.ndarray:
    """Crop image to bounding box with optional padding (fraction of bbox size)."""
    h, w = img.shape[:2]
    bw, bh = x2 - x1, y2 - y1
    pad_x = int(bw * padding)
    pad_y = int(bh * padding)
    cx1 = max(0, x1 - pad_x)
    cy1 = max(0, y1 - pad_y)
    cx2 = min(w, x2 + pad_x)
    cy2 = min(h, y2 + pad_y)
    return img[cy1:cy2, cx1:cx2]


def resize_for_model(img_rgb: np.ndarray, size: int) -> np.ndarray:
    """Resize to (size, size) for model input."""
    return cv2.resize(img_rgb, (size, size), interpolation=cv2.INTER_LINEAR)


def encode_image_png(img_bgr: np.ndarray) -> bytes:
    """Encode BGR image to PNG bytes."""
    _, buf = cv2.imencode(".png", img_bgr)
    return buf.tobytes()


def encode_image_jpg(img_bgr: np.ndarray, quality: int = 90) -> bytes:
    """Encode BGR image to JPEG bytes."""
    _, buf = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return buf.tobytes()


def numpy_to_pil(img_rgb: np.ndarray) -> Image.Image:
    return Image.fromarray(img_rgb)


def pil_to_numpy(img: Image.Image) -> np.ndarray:
    return np.array(img)
