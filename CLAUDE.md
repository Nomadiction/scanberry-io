# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Claude Code: reusable economical setup (all projects)

Use the same pattern in every repo: **short instructions in the repo** + **lean Claude Code settings** + **local permissions** without secrets in git.

### 1. Files and roles

| File | Purpose |
|------|---------|
| **`CLAUDE.md`** (repo root) | Instructions Claude Code loads for this project. Put *contract + token style* once, then *project facts* (stack, commands, architecture). |
| **`.claude/settings.json`** | Commit-friendly defaults: effort, autocompact, deny-list for secrets, optional env. |
| **`.claude/settings.local.json`** | Machine-specific `permissions.allow` / overrides. **Do not commit** tokens, deployment keys, or one-off `Bash(...)` rules. Add `settings.local.json` to `.gitignore` if the team uses shared repos. |

Optional: **user-wide** defaults in `~/.claude/settings.json` (same schema) so new clones inherit economy settings until overridden per repo.

### 2. `CLAUDE.md` template for a new project

Copy these blocks verbatim, then replace placeholders:

1. **Response contract** — grounding (“only context you have”), no filler, list/number immediately.
2. **Token efficiency** — short sentences, tools first, no narration.
3. **Scope** — one line: product name + what the repo contains (e.g. “API + web client”, “ML training only”).
4. **Project body** — commands from repo root, layout, conventions, links. **Avoid** duplicating long docs; point to `README` or `docs/` if needed.

Keep `CLAUDE.md` under ~300–500 lines if possible; move deep history to other files.

### 3. Economical `.claude/settings.json` (baseline)

Tune for **less verbosity and earlier context compaction** (fewer tokens per session):

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "outputStyle": "default",
  "includeGitInstructions": false,
  "effortLevel": "low",
  "spinnerTipsEnabled": false,
  "feedbackSurveyRate": 0,
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)"
    ]
  },
  "env": {
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
  }
}
```

- **`effortLevel`: `"low"`** — shorter, more direct answers; raise only when you need deeper exploration.
- **`includeGitInstructions`: `false`** — avoids injecting extra git how-to into context when you don’t need it.
- **`spinnerTipsEnabled` / `feedbackSurveyRate`** — less UI noise.
- **`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: `"50"`** — compacts conversation context earlier; **trade-off**: long threads summarize sooner (good for cost; may drop old detail). Adjust or remove if you need full verbatim history.

Extend **`permissions.deny`** for paths that must never be read (keys, customer data).

### 4. Local permissions (`settings.local.json`)

- Add **`permissions.allow`** only for commands you actually use (`Bash(git:*)`, `Bash(npm run:*)`, etc.).
- Prefer **patterns** over one-off long `curl` lines with embedded tokens.
- **Never** paste deploy tokens, API keys, or SWA secrets into `settings.json` committed to git; keep those in `settings.local.json` or environment variables.

### 5. Checklist: new repository

1. Add `CLAUDE.md` with contract + efficiency + scope + real commands.
2. Add `.claude/settings.json` (baseline above).
3. Create `.claude/settings.local.json` locally only; add to `.gitignore` if required.
4. Optional: symlink or copy `CLAUDE.md` patterns from a “template” repo; only project-specific middle sections change.
5. If you use **Cursor** as well, mirror the same **contract + efficiency** in `AGENTS.md` or `.cursor/rules` so behavior stays consistent across tools.

### 6. Same idea in Cursor / other agents

- **AGENTS.md** or **.cursor/rules**: duplicate the *Response contract* and *Token efficiency* bullets so the assistant doesn’t re-explain or pad.
- **User rules** in Cursor: global defaults; **project rules** in repo: same as `CLAUDE.md` for single source of truth.

---

## Project Overview

ScanBerry.io is a diploma thesis project: a software system for automated assessment of the physiological state of blueberry plants (Vaccinium corymbosum L.) in field conditions based on RGB image analysis using deep learning and computer vision.

The system must provide:
- Detection of the plant in the image (localization)
- Classification of physiological state (healthy / stress / mold / dry)
- Pixel-level segmentation of damaged areas
- Quantitative damage assessment (% area of each lesion type)
- Results delivery via REST API + mobile-friendly client

## ML Components

Three deep learning tasks:
1. **Detection** — locate the bush (YOLOv8s, single class: `plant`)
2. **Classification** — diagnose health state (`healthy`, `stress`, `mold`, `dry`) using EfficientNet-B0 with transfer learning
3. **Segmentation** — pixel-level damage mapping (`plant`, `lesion_stress`, `lesion_mold`, `lesion_dry`) using U-Net (SMP library)
4. **Damage quantification** — compute % damaged area per lesion type from segmentation masks

## Running Scripts and Notebooks

All scripts must be run from the **project root** (where `dataset/` lives):

```bash
# Data preparation
python scripts/classification_annotations_manager.py
python scripts/detection_annotations_manager.py
python scripts/clean_splits.py   # resets all split folders
```

Training notebooks are designed for Jupyter or Google Colab:
- `notebooks/classification/train_classification.ipynb`
- `notebooks/detection/train_detection.ipynb`
- `notebooks/segmentation/train_segmentation.ipynb`

Notebooks auto-detect the project root by searching upward for the `dataset/` folder.

## Data Pipeline

```
Label Studio annotation (JSON export)
        ↓
scripts/*_annotations_manager.py
        ↓
dataset/
  classification/[train|val|test]/[healthy|stress|mold|dry]/
  detection/images/[train|val|test]/plant/
            labels/[train|val|test]/          ← YOLO .txt format
  segmentation/images/[train|val|test]/plant/
               masks/[train|val|test]/plant/
```

Label Studio exports live in `scripts/json/`. The annotation managers handle UUID-prefixed filenames that Label Studio adds (e.g. `497d6be1-20250705_180102.jpg` → `20250705_180102.jpg`).

Split ratio: **70% train / 15% val / 15% test**, stratified by class for classification, random for detection/segmentation. Fixed `RANDOM_SEED` for reproducibility.

## Dataset Characteristics

- 252 total images; significant class imbalance: stress=101, mold=72, dry=40, healthy=39
- Field conditions: variable background (soil, sky, foreign objects), lighting, angle, resolution (~1000x1900 px avg)
- Weighted sampling and label smoothing are used in classification to handle imbalance
- Val/test splits are small (~36 / ~41 samples) — metrics are noisy; focus on trends across epochs
- Confusion patterns: stress↔mold, healthy↔dry (visually similar classes)

## Full System Architecture

```
Field photo (mobile upload)
        ↓
[1] Detection (YOLOv8s)       → bounding box around bush
        ↓
[2] Segmentation (U-Net/SMP)  → per-pixel masks: plant / lesion_stress / lesion_mold / lesion_dry
[3] Classification (EfficientNet-B0) → health class: healthy / stress / mold / dry
        ↓
[4] Damage quantification     → % area of each lesion type (from segmentation masks)
        ↓
[5] Backend (FastAPI REST API) → image processing, model inference, result storage
        ↓
[6] Client app (mobile UI)    → upload photo, view diagnosis, segmentation overlay, history
```

## Key Architecture Decisions

- **Classification** uses a two-stage training: frozen EfficientNet backbone first (224x224), then full fine-tune (320x320). Augmentation: RandAugment + RandomErasing + Mixup/CutMix. EMA weights for validation, SWA after Stage 2. Early stopping on val macro F1. TTA at inference. Best: SWA 73.2% acc / macro F1 0.697.
- **Detection** uses YOLOv8s (`yolov8s.pt`) via Ultralytics API. Input: 640x640. Optimizer: **SGD** (YOLO default; Adam gives worse bbox precision — +17% mAP@50-95 with SGD). Best: mAP@50=0.995, mAP@50-95=0.753 (+TTA: 0.761). Converges ~20 epochs. Always clear `.cache` files before training.
- **Segmentation** uses U-Net with ResNet18 encoder from `segmentation_models_pytorch` (SMP). Input: 512x512. Dice + Focal loss, mixed precision. `StitchDataset` crops around positive mask pixels.
- **Inference pipeline order**: Detection (crop) → Classification + Segmentation (on cropped region) → Damage quantification.

## Development Phases (from Notion plan)

### PHASE 1. Data Preparation ✅ COMPLETE
- Image audit, cleaning, class validation
- Dataset structure (train/val/test splits)
- Annotation in Label Studio (classification labels, bounding boxes, segmentation masks)

### PHASE 2. Classification Model ✅ COMPLETE
- EfficientNet-B0, transfer learning, two-stage training
- Best result: SWA 73.2% accuracy, macro F1 0.697
- Saved: `models/classification/<timestamp>/best_model.pt`

### PHASE 3. Detection & Segmentation Models — ⚠️ IN PROGRESS
- **Detection ✅ COMPLETE**: YOLOv8s, mAP@50=0.995, mAP@50-95=0.753
- **Segmentation 🔴 BLOCKED**: U-Net/SMP notebook ready, but 0 masks annotated in dataset/segmentation/
- **Damage quantification**: % lesion area = lesion pixels / plant pixels × 100%
- Integration of models into unified inference pipeline

### PHASE 4. Backend (REST API) — ✅ COMPLETE & DEPLOYED
- **Tech stack**: Python + FastAPI, async SQLAlchemy 2.0, PyTorch, OpenCV
- **Database**: PostgreSQL (production) / SQLite (dev)
- **API endpoints**:
  - `POST /api/v1/analyze` — upload image, run full pipeline, return result
  - `GET /api/v1/analyses` — paginated list with health_class filter
  - `GET /api/v1/analyses/{id}` — analysis details
  - `DELETE /api/v1/analyses/{id}` — delete analysis + files
  - `GET /api/v1/analyses/{id}/image` — original image
  - `GET /api/v1/analyses/{id}/visualization` — result overlay
  - `GET /api/v1/analyses/{id}/mask` — segmentation mask (when available)
  - `GET /api/v1/health` — system health check
- **ML pipeline**: detection → crop → classification (TTA) + segmentation (stub) → damage → visualization
- **Input**: JPG/PNG image
- **Output**: health class, damage %, bbox coordinates, segmentation mask, overlay visualization
- File size limits, input validation, error handling, request logging
- GPU vs CPU inference, batch processing, model optimization, result caching

### PHASE 5. Client Application — 🔲 NOT STARTED
- **Platform**: Telegram Mini App (web-based, integrated into Telegram bot)
- **Alternative options**: Flutter / React Native / Kotlin (Android) / Web app (browser)
- **Screens**:
  - Main screen: upload button, history link
  - Analysis screen: selected image, loading indicator, send button
  - Result screen: health class, damage %, segmentation overlay, recommendations
  - History screen: list of past analyses with dates and results
- **Features**: camera capture, gallery selection, result visualization, observation history
- **Field conditions**: unstable internet, retry on connection errors
- REST API integration with backend

### PHASE 6. Testing, Validation & Field Trial — 🔲 NOT STARTED
- Quantitative evaluation of all models on independent test set
- Classification metrics: Accuracy, Precision, Recall, F1, Confusion matrix
- Detection metrics: mAP, IoU, Precision, Recall
- Segmentation metrics: Dice, IoU, Pixel accuracy + visual expert review
- Robustness testing: different lighting, angles, backgrounds
- Backend: API correctness, response time, stress testing
- Client: upload flow, result display, UI/UX testing
- Integration testing: end-to-end client→server→models→response
- Field trial on real images, usability assessment
- Error analysis, limitation documentation
- Performance profiling (processing time, memory, stability)

## Model Outputs

Trained models are saved to `models/` (not committed):
- `models/classification/<timestamp>/best_model.pt`
- `models/detection/yolov8s_plant_<timestamp>/weights/best.pt`
- `models/segmentation/train_unet_<timestamp>/best_model.pth`

## Project Risks & Mitigations

- **Small dataset (252 images)** → augmentation, transfer learning
- **Class imbalance** → weighted sampling, focal loss, label smoothing
- **Variable field conditions** → robust augmentation pipeline
- **Segmentation complexity** → U-Net with pretrained encoder, Dice+Focal loss
- **Limited development time** → phased approach, simplify architecture if needed
