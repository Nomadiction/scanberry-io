# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Response contract (grounding + format)

**Scope:** Assistant for **ScanBerry.io** — this repository (blueberry plant health from images, CV/ML, dataset pipeline, FastAPI backend, client).

- Answer precisely; rely only on supplied context (files, tool output, user message). If data is missing, say so honestly.
- **Format:** No introductions, praise of the question, or meta (“here is what I will do”). No closings (“hope this helps”, etc.). Straight to substance. If a list is needed — list immediately. If a number — number immediately.

**RU (same rules, for Russian replies):** Ты — ассистент для **ScanBerry.io** (здоровье черники, CV/ML, датасет, API, клиент). Отвечай точно, опирайся только на переданный контекст. Если данных нет — скажи прямо. Без вступлений и похвалы вопроса, без «сейчас сделаю» и «надеюсь, помог». Сразу суть; список или число — сразу.

## Token efficiency (agent response style)

- Use short, 3-6 word sentences.
- No filler, preamble, or pleasantries.
- Run tools first, show the result, then stop.
- Do not narrate.
- Drop articles ("Me fix code" not "I will fix the code").

## Project Overview

ScanBerry.io is a diploma thesis: a computer vision system for diagnosing blueberry bush health from RGB field photos. Three ML tasks:

1. **Detection** — locate the bush (YOLOv8s, single class: `plant`)
2. **Classification** — diagnose health state (`healthy`, `stress`, `mold`, `dry`) using EfficientNet-B0
3. **Segmentation** — pixel-level damage mapping (`plant`, `lesion_stress`, `lesion_mold`, `lesion_dry`) using U-Net (SMP)

Inference order: Detection (crop bush) → Classification + Segmentation (on crop) → Damage quantification (% lesion area from masks).

Backend (REST API) is **complete and deployed** at https://scanberry-api.azurewebsites.net (FastAPI + async SQLAlchemy + PyTorch, Azure App Service). Client (mobile UI) is **not yet implemented**.

## Commands

All scripts must be run from the **project root** (the directory containing `dataset/`):

```bash
# Rebuild classification dataset splits from Label Studio JSON
python scripts/classification_annotations_manager.py

# Rebuild detection dataset splits (images + YOLO .txt labels) from Label Studio JSON
python scripts/detection_annotations_manager.py

# Reset all classification train/val/test split folders (before re-splitting)
python scripts/clean_splits.py
```

Training is done via Jupyter notebooks (local or Google Colab):
```bash
jupyter notebook notebooks/classification/train_classification.ipynb
jupyter notebook notebooks/detection/train_detection.ipynb
jupyter notebook notebooks/segmentation/train_segmentation.ipynb
```

Notebooks auto-detect the project root by walking upward from `os.getcwd()` until a `dataset/` folder is found, then call `os.chdir(ROOT)`. No explicit `cd` needed.

### Key dependencies (no requirements.txt — install manually)
- Classification/Segmentation: `torch`, `torchvision`, `albumentations`, `segmentation-models-pytorch`, `opencv-python`, `torchmetrics`, `matplotlib`
- Detection: `ultralytics` (v8.4+)

## Data Pipeline

```
Label Studio annotation export (JSON)
        ↓
scripts/*_annotations_manager.py
        ↓
dataset/
  classification/images/          ← 252 raw source images (all tasks draw from here)
  classification/[train|val|test]/[healthy|stress|mold|dry]/
  detection/images/[train|val|test]/plant/
            labels/[train|val|test]/   ← YOLO .txt format (cx cy w h, normalized)
  segmentation/images/[train|val|test]/plant/
               masks/[train|val|test]/plant/
```

Label Studio JSON exports live in `scripts/json/`. The annotation managers strip UUID prefixes that Label Studio prepends (e.g. `497d6be1-20250705_180102.jpg` → `20250705_180102.jpg`) and restore bracket-style names that Label Studio removes.

Split ratio: **70% train / 15% val / 15% test** — stratified by class for classification, random shuffle for detection/segmentation. Fixed `RANDOM_SEED = 42`.

Trained model outputs go to `models/` (not committed):
- `models/classification/<timestamp>/best_model.pt`
- `models/detection/yolov8s_plant_<timestamp>/weights/best.pt`
- `models/segmentation/train_unet_<timestamp>/best_model.pth`

## Architecture Notes

### Classification (`notebooks/classification/train_classification.ipynb`)
- Two-stage training: Stage 1 freezes EfficientNet backbone (224×224), Stage 2 fine-tunes all layers (320×320)
- `WeightedRandomSampler` + Focal Loss (configurable `LOSS_CLASS_WEIGHT_MODE`: `none` / `balanced` / `manual`)
- Augmentation: RandAugment + RandomErasing + Mixup (Stage 1) / CutMix (Stage 2)
- EMA weights used for validation and `best_model.pt`; SWA (`swa_model.pt`) saved after Stage 2
- Early stopping on val macro F1 (`EARLY_STOP_METRIC`)
- TTA at test time; best result: SWA 73.2% accuracy / macro F1 0.697 (Run 8, session `efficientnet_b0_20260327_074942`)
- All hyperparameters are defined in a single config cell at the top of the notebook

### Detection (`notebooks/detection/train_detection.ipynb`)
- YOLOv8s (`yolov8s.pt`) via Ultralytics API, input 640×640, single class `plant`
- **Use SGD, not Adam** — switching Adam→SGD gave +17% mAP@50-95 (0.58→0.75). YOLO's internal warmup/lr schedule is tuned for SGD; do not override YOLO defaults (warmup, close_mosaic, lr schedule)
- **Always clear `.cache` files** before training to avoid stale data from prior runs
- Best result: mAP@50=0.995, mAP@50-95=0.753 (+TTA: 0.761), converges ~20 epochs (Run 8, session `yolov8s_plant_20260328_143404`)

### Segmentation (`notebooks/segmentation/train_segmentation.ipynb`)
- U-Net + ResNet18 encoder from `segmentation_models_pytorch` (SMP), input 512×512
- `StitchDataset` crops around positive pixels in the mask with Albumentations augmentations
- Dice + Focal loss, mixed precision; metrics: Dice (`BinaryF1Score`), IoU, Precision
- Segmentation annotation is in progress; masks go in `dataset/segmentation/masks/[train|val|test]/plant/`

### Dataset characteristics
- 252 total images; class imbalance: stress=101, mold=72, dry=40, healthy=39
- Val=36, test=41 — metrics are noisy; ±1 sample can shift accuracy noticeably
- Confusion patterns: stress↔mold, healthy↔dry (visually similar classes)
