# ScanBerry.io

> AI-powered diagnostics for blueberry plants (*Vaccinium corymbosum* L.) from a single field photo.

[![Backend CI](https://github.com/USER/scanberry.io/actions/workflows/azure-backend.yml/badge.svg)](https://github.com/USER/scanberry.io/actions/workflows/azure-backend.yml)
[![Frontend CI](https://github.com/USER/scanberry.io/actions/workflows/azure-static-web-apps.yml/badge.svg)](https://github.com/USER/scanberry.io/actions/workflows/azure-static-web-apps.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ScanBerry.io takes a phone photo of a blueberry bush, runs a three-stage computer-vision pipeline (detection → classification + segmentation → damage quantification) and returns a health verdict, a per-pixel damage map and concrete agronomic recommendations — in under a few seconds on CPU-only hardware.

The system is the practical part of a diploma thesis. It is built as a real, deployable product: FastAPI backend on Azure App Service, React + Vite frontend on Azure Static Web Apps, Telegram Mini App as the primary user surface.

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Tech stack](#tech-stack)
- [Quick start (local)](#quick-start-local)
- [Configuration](#configuration)
- [Deployment to Azure](#deployment-to-azure)
- [CI/CD](#cicd)
- [API reference](#api-reference)
- [Model weights](#model-weights)
- [Contributing](#contributing)
- [License](#license)

---

## What it does

You upload a photo of a blueberry bush. The pipeline:

1. **Detects** the bush in the frame (YOLOv8s).
2. **Crops** to the plant and runs two models in parallel on the crop:
   - **Classification** (EfficientNet-B0) — health class: `healthy`, `stress`, `mold`, `dry`.
   - **Segmentation** (U-Net + DeepLabV3+) — per-pixel masks for plant area and three lesion types.
3. **Quantifies** damage: `% damaged area = lesion_pixels / plant_pixels × 100%` per lesion type.
4. **Returns** a structured response: health class with confidence, per-class probabilities, damage breakdown, and an overlay visualisation; the frontend renders this together with localised agronomic recommendations (RU / EN / ES / DE).

The end user sees one of four diagnoses with a severity level and a checklist of actions ("apply systemic fungicide within 48 h", "increase irrigation frequency", etc.).

## Architecture

```
                 ┌──────────────────────────────┐
                 │ Telegram Mini App / Web SPA  │
                 │  React 18 · Vite · Tailwind  │
                 └────────────────┬─────────────┘
                                  │ HTTPS (multipart upload)
                                  ▼
                 ┌──────────────────────────────┐
                 │     FastAPI (async)          │
                 │  /api/v1/analyze · /history  │
                 └────────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼──────────────────────────┐
        ▼                         ▼                          ▼
  Detection (YOLOv8s)   Classification (EffNet-B0)   Segmentation (U-Net + DeepLab)
        │                         │                          │
        └─────────────────────────┼──────────────────────────┘
                                  ▼
                       Damage quantification
                                  │
                                  ▼
                  ┌──────────────────────────┐
                  │  PostgreSQL (Azure Flex) │
                  │  Blob Storage / local FS │
                  └──────────────────────────┘
```

| Layer | Hosted on | Notes |
|---|---|---|
| Frontend | Azure Static Web Apps | Built by GitHub Actions on every push to `main` touching `frontend/**` |
| Backend | Azure App Service for Linux Containers (B1) | Image lives in Azure Container Registry; weights baked into the image |
| Database | Azure Database for PostgreSQL — Flexible Server | SQLite is used as a fallback in local dev |
| File storage | Azure Blob Storage *or* local filesystem | Selected via `STORAGE_BACKEND` env var |

## Repository layout

```
ScanBerry.io/
├── backend/                # FastAPI app, ML inference, Dockerfile, Alembic
│   ├── app/
│   │   ├── api/            # HTTP routes (analyze, results, health)
│   │   ├── services/       # detection, classification, segmentation, pipeline
│   │   ├── config.py       # pydantic-settings, env-driven
│   │   └── main.py         # FastAPI entry point
│   ├── migrations/         # Alembic
│   ├── Dockerfile          # CPU-only torch, baked-in models
│   ├── docker-compose.yml  # Postgres + API for local dev
│   └── requirements.txt
│
├── frontend/               # React 18 + Vite SPA / Telegram Mini App
│   ├── src/app/
│   │   ├── features/       # home, scan, result, history, settings, onboarding
│   │   ├── lib/            # i18n, mock-data, utils
│   │   ├── api/            # backend client
│   │   └── routes.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── .github/workflows/      # GitHub Actions (frontend + backend deploy)
├── models/                 # Trained weights — git-ignored, see "Model weights"
├── dataset/                # Raw dataset & Label Studio exports — git-ignored
│
├── AZURE.md                # Full Azure infra setup (resource creation, secrets)
├── AGENTS.md               # Conventions for AI coding assistants
├── CLAUDE.md               # Project rules surfaced to Claude Code
├── LICENSE                 # MIT
└── README.md               # This file
```

ML research artefacts (training notebooks, dataset preparation scripts, thesis diary, exploration markdowns) live **outside this repo**, under `../ml-research/` and `../thesis-docs/` on the author's machine. They are intentionally excluded from version control because they are large, deal with raw imagery, and have no role in production deployment.

## Tech stack

| Area | Choice | Reason |
|---|---|---|
| API framework | FastAPI 0.115 + uvicorn | async, OpenAPI out-of-the-box, type-safe |
| ORM / migrations | SQLAlchemy 2.0 (async) + Alembic | mature, supports both Postgres and SQLite |
| ML runtime | PyTorch 2.5 (CPU build) | App Service B1 has no GPU; CPU build keeps the image ~1.5 GB lighter |
| Detection | YOLOv8s (ultralytics) | mAP@50 = 0.995 on the field test set |
| Classification | EfficientNet-B0 (timm-style) | best macro F1 on a 252-image, class-imbalanced set |
| Segmentation | U-Net (bush) + DeepLabV3+ (lesions), via SMP | two-model split materially improves IoU |
| Frontend | React 18 + Vite 6 + Tailwind 4 | small bundle, fast HMR, plays well with Telegram Mini App |
| State / data | TanStack Query | request caching + retry for flaky field connections |
| i18n | Custom typed dictionary in `src/app/lib/i18n.ts` | RU / EN / ES / DE, no runtime overhead |

## Quick start (local)

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker 24+ (optional, for the all-in-one stack)
- Trained model weights placed under `models/` (see [Model weights](#model-weights))

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/USER/scanberry.io.git
cd scanberry.io

# Drop the four .pt/.pth files into models/ first.
docker compose -f backend/docker-compose.yml up --build
# API is now on http://localhost:8000  (Swagger: /docs)
```

In a second terminal:

```bash
cd frontend
cp .env.example .env       # VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev                # http://localhost:5173
```

### Option B — bare-metal backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # adjust DATABASE_URL, MODEL_*_PATH

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Verifying the install

```bash
curl http://localhost:8000/api/v1/health
# {"status":"ok","models":{"detection":true,"classification":true,"segmentation":true}}

curl -F "file=@sample.jpg" http://localhost:8000/api/v1/analyze
```

### Running without weights

If `models/` is empty, the container still starts — but `/analyze` returns `503 Models not loaded`. Use `VITE_USE_MOCK=true` in `frontend/.env` to develop the UI against the bundled fixtures in `src/app/lib/mock-data.ts`.

## Configuration

All runtime configuration is environment-driven. See `backend/.env.example` and `frontend/.env.example` for the authoritative list with comments. Highlights:

| Variable | Default | Notes |
|---|---|---|
| `APP_ENV` | `development` | Toggles auto-create tables on startup |
| `DATABASE_URL` | SQLite | Use `postgresql+asyncpg://...` in production |
| `STORAGE_BACKEND` | `local` | `azure` switches uploads to Blob Storage |
| `DEVICE` | `cpu` | Set to `cuda` if you have a GPU box |
| `MODEL_*_PATH` | (empty) | Absolute or backend-relative paths to weights |
| `CORS_ORIGINS` | localhost set | JSON array; add your deployed frontend URL |
| `CORS_ORIGIN_REGEX` | (empty) | E.g. `https://.*\.azurestaticapps\.net` for SWA preview slots |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Frontend → backend base URL |
| `VITE_USE_MOCK` | `false` | UI works without the backend |

## Deployment to Azure

A full step-by-step (resource creation, IAM, networking) lives in [AZURE.md](AZURE.md). The condensed flow:

### One-time infrastructure

```bash
# Resource group, ACR, Postgres Flex, Storage, App Service plan, Web App
az group create -n rg-scanberry -l eastus2
az acr create -n acrscanberry -g rg-scanberry --sku Basic --admin-enabled true
az postgres flexible-server create -n scanberry-db -g rg-scanberry \
  --tier Burstable --sku-name Standard_B1ms --version 16 \
  --admin-user scanberryadmin --admin-password '<STRONG_PASSWORD>' \
  --public-access 0.0.0.0
az appservice plan create -n plan-scanberry -g rg-scanberry --is-linux --sku B1
az webapp create -n scanberry-api -g rg-scanberry -p plan-scanberry \
  --deployment-container-image-name acrscanberry.azurecr.io/scanberry-api:latest
az staticwebapp create -n scanberry-web -g rg-scanberry -l eastus2 --sku Free
```

Set the App Service environment variables (see [`AZURE.md`](AZURE.md) for the full list, or copy from `backend/.env.example`).

### Backend — push a new image

```bash
# From repo root (build context must include backend/ AND models/)
az acr login --name acrscanberry
docker build -t acrscanberry.azurecr.io/scanberry-api:latest -f backend/Dockerfile .
docker push   acrscanberry.azurecr.io/scanberry-api:latest
az webapp restart -n scanberry-api -g rg-scanberry
curl https://scanberry-api.azurewebsites.net/api/v1/health
```

In CI this is automated by [`.github/workflows/azure-backend.yml`](.github/workflows/azure-backend.yml).

### Frontend — deploy the SPA

CI does this on every push to `main` that touches `frontend/**` ([`.github/workflows/azure-static-web-apps.yml`](.github/workflows/azure-static-web-apps.yml)). For a manual one-off:

```bash
cd frontend
npm ci
export SWA_CLI_DEPLOYMENT_TOKEN="$(az staticwebapp secrets list \
  -n scanberry-web -g rg-scanberry --query 'properties.apiKey' -o tsv)"
npm run deploy:prod
```

## CI/CD

Two GitHub Actions workflows live under `.github/workflows/`:

| Workflow | Trigger | Result |
|---|---|---|
| `azure-static-web-apps.yml` | Push / PR touching `frontend/**` | Builds the SPA and deploys it to Azure SWA (PR previews included) |
| `azure-backend.yml` | Push touching `backend/**` or manual dispatch | Builds the Docker image, pushes it to ACR, switches the Web App to the new tag, restarts, and smoke-tests `/health` |

### Required GitHub secrets

| Secret | Used by | How to obtain |
|---|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | frontend | `az staticwebapp secrets list -n scanberry-web -g rg-scanberry --query 'properties.apiKey' -o tsv` |
| `AZURE_CREDENTIALS` | backend | `az ad sp create-for-rbac --name scanberry-deploy --role contributor --scopes /subscriptions/<SUB_ID>/resourceGroups/rg-scanberry --sdk-auth` |
| `ACR_NAME` | backend | e.g. `acrscanberry` |
| `ACR_LOGIN_SERVER` | backend | e.g. `acrscanberry.azurecr.io` |
| `AZURE_RESOURCE_GROUP` | backend | e.g. `rg-scanberry` |
| `AZURE_WEBAPP_NAME` | backend | e.g. `scanberry-api` |

Optional repository **variable** `MODELS_RELEASE_TAG` (e.g. `weights-v1`) tells the backend workflow to pull weights from a GitHub release before building. See `backend/Dockerfile` for how `models/` is copied.

## API reference

The full OpenAPI spec is served at `/docs` and `/redoc`. Key endpoints (all prefixed with `/api/v1`):

| Method | Path | Description |
|---|---|---|
| `POST` | `/analyze` | Multipart image upload → full pipeline → analysis result (JSON) |
| `GET`  | `/analyses` | Paginated list, optional `health_class` filter |
| `GET`  | `/analyses/{id}` | Analysis details |
| `DELETE` | `/analyses/{id}` | Delete record + associated files |
| `GET`  | `/analyses/{id}/image` | Original uploaded image |
| `GET`  | `/analyses/{id}/visualization` | Detection + classification overlay |
| `GET`  | `/analyses/{id}/mask` | Per-pixel segmentation mask (when available) |
| `GET`  | `/health` | Liveness + per-model load status |

## Model weights

Trained weights are **not** committed (each file is 30–200 MB; total ~400 MB). Two supported flows:

1. **GitHub Release**: upload the four files (`best_model_Yolo.pt`, `best_model_EfficientNet.pt`, `best_model_U-Net.pth`, `best_model_DeepLab.pth`) as assets to a release tagged e.g. `weights-v1`. Set the `MODELS_RELEASE_TAG` repo variable so the backend workflow pulls them in before building.
2. **Out-of-band copy**: place the files manually under `models/<task>/` matching the layout expected by `backend/.env.example`.

Training code (notebooks, dataset preparation, audit scripts) is intentionally not part of this repo — it lives in a separate research workspace.

## Contributing

This is a thesis project, but external suggestions are welcome via issues and PRs. Conventions:

- Run `npm run typecheck && npm run build` from `frontend/` before opening a PR.
- Backend: keep handlers async; new endpoints must include OpenAPI docstrings.
- Don't commit anything under `models/`, `dataset/`, or `backend/storage/`.
- AI assistants: see [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) for the response contract.

## License

MIT — see [LICENSE](LICENSE).
