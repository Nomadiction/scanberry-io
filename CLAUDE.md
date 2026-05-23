# CLAUDE.md — ScanBerry.io

This file is the instructions Claude Code loads for this repository.

## Response contract (grounding + format)

**Scope:** Assistant for **ScanBerry.io** — this repository (blueberry plant health from RGB images: CV/ML pipeline, FastAPI backend, React/Vite client). Dataset preparation and training notebooks live in a separate `ml-research/` repo, **not here**.

- Answer precisely; rely only on supplied context (files, tool output, user message). If data is missing, say so honestly.
- **Format:** No introductions, praise of the question, or meta (“here is what I will do”). No closings (“hope this helps”, etc.). Straight to substance. If a list is needed — list immediately. If a number — number immediately.

**RU (same rules, for Russian replies):** Ты — ассистент для **ScanBerry.io** (здоровье черники, CV/ML-инференс, FastAPI-бэкенд, веб-клиент). Отвечай точно, опирайся только на переданный контекст. Если данных нет — скажи прямо. Без вступлений и похвалы вопроса, без «сейчас сделаю» и «надеюсь, помог». Сразу суть; список или число — сразу.

## Token efficiency (agent response style)

- Use short, 3-6 word sentences.
- No filler, preamble, or pleasantries.
- Run tools first, show the result, then stop.
- Do not narrate.
- Drop articles ("Me fix code" not "I will fix the code").

---

## What this is

ScanBerry.io is a diploma project: field diagnostics of blueberry plants (*Vaccinium corymbosum* L.) from RGB photos via deep learning. The backend runs a 4-stage ML pipeline (detection → classification → segmentation → damage quantification) and exposes results over REST; the frontend is a Telegram Mini App / mobile-friendly web client.

Stack: Python 3.11 + FastAPI + SQLAlchemy/Alembic + PyTorch/Ultralytics on the backend (Docker, Azure App Service); React 18 + TypeScript + Vite + Tailwind v4 + React Query + React Router 7 on the frontend (Azure Static Web Apps).

## Where things live

```
scanberry-io/
├── backend/                  # FastAPI service + ML inference
│   ├── app/
│   │   ├── main.py           # FastAPI app entry, lifespan, CORS
│   │   ├── config.py         # Pydantic settings, env-driven
│   │   ├── database.py       # async SQLAlchemy engine/session
│   │   ├── models.py         # ORM tables
│   │   ├── schemas.py        # Pydantic request/response DTOs
│   │   ├── api/              # routers: analyze, results, health, deps, mappers
│   │   ├── services/         # pipeline + per-model wrappers
│   │   │   ├── pipeline.py            # orchestrates detect→classify→segment→damage
│   │   │   ├── detection.py           # YOLOv8s wrapper
│   │   │   ├── classification.py      # EfficientNet-B0 wrapper
│   │   │   ├── segmentation.py        # Bush U-Net + Lesion DeepLabV3+
│   │   │   ├── damage.py              # % area per lesion class
│   │   │   ├── visualization.py       # overlay rendering
│   │   │   └── storage.py             # local / Azure Blob backend
│   │   └── utils/image.py
│   ├── migrations/           # Alembic (env.py + versions/)
│   ├── storage/              # local uploads/results — gitignored
│   ├── alembic.ini
│   ├── docker-compose.yml    # local dev: Postgres + API
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md             # full backend docs (RU)
├── frontend/                 # Telegram Mini App / web client
│   ├── src/
│   │   ├── main.tsx
│   │   └── app/
│   │       ├── App.tsx
│   │       ├── routes.tsx
│   │       ├── api/          # analysis.ts, hooks.ts (React Query)
│   │       ├── features/     # home, scan, result, history, settings, onboarding
│   │       ├── ui/           # shared presentational components
│   │       ├── lib/, providers/, types/
│   │       └── styles/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── dist/                 # build output, gitignored, do not edit
│   └── node_modules/         # gitignored, do not edit
├── models/                   # trained weights — gitignored, distributed out-of-band
│   ├── detection/best_model_Yolo.pt
│   ├── classification/best_model_EfficientNet.pt
│   └── segmentation/{best_model_U-Net.pth, best_model_DeepLab.pth}
├── dataset/                  # raw + split data — gitignored, kept locally
│   ├── original_images/
│   ├── classification/[train|val|test]/[healthy|stress|mold|dry]/
│   ├── detection/{images,labels}/[train|val|test]/
│   └── segmentation/{images,masks}/[train|val|test]/
├── .claude/                  # Claude Code settings (see section below)
├── README.md                 # top-level overview
└── LICENSE
```

**Not in this repo:** training scripts (`scripts/`) and Jupyter notebooks (`notebooks/`). Earlier CLAUDE.md drafts referenced them — they live in a separate research repo. Don't try to open them here.

## Single source of truth

| To change...                          | Edit this                                          | Never edit                          |
|---------------------------------------|----------------------------------------------------|-------------------------------------|
| FastAPI route / endpoint              | `backend/app/api/<resource>.py`                    | `dist/`, `__pycache__/`             |
| ML inference logic                    | `backend/app/services/<stage>.py` + `pipeline.py`  | model `.pt`/`.pth` files            |
| Request/response shape                | `backend/app/schemas.py` (Pydantic)                | hand-written JSON in docs           |
| DB schema                             | `backend/app/models.py` + new Alembic revision     | existing migration in `versions/`   |
| App config / env vars                 | `backend/app/config.py`                            | hardcoded literals in services      |
| Frontend route                        | `frontend/src/app/routes.tsx` + `features/<name>/` | `frontend/dist/`                    |
| API client (frontend → backend)       | `frontend/src/app/api/analysis.ts` + `hooks.ts`    | inline `fetch` calls in components  |
| Shared UI primitive                   | `frontend/src/app/ui/`                             | duplicated copies inside features   |
| Trained weights                       | retrain in `ml-research/`, drop into `models/`     | binary patches to existing weights  |

## Don't touch (generated / gitignored)

- `frontend/dist/` — produced by `npm run build`.
- `frontend/node_modules/` — produced by `npm install`.
- `backend/__pycache__/`, `*.pyc` — Python bytecode.
- `backend/storage/uploads/`, `backend/storage/results/`, `*.db` — runtime uploads and the local SQLite DB.
- `models/**` — trained weights, distributed out-of-band (Azure Blob / release attachments). Never commit.
- `dataset/**` — raw photos and Label Studio exports; may contain unredacted field data. Local only.
- `backend/migrations/versions/*.py` already merged — create a *new* revision instead of editing an old one.

## How to run, test, build

All commands assume PowerShell on Windows from the repo root unless noted.

**Backend (local, with Docker — recommended):**
- Start stack: `docker-compose -f backend/docker-compose.yml up`
- API at `http://localhost:8000`, Swagger at `/docs`, health at `/api/v1/health`.

**Backend (without Docker):**
- Install: `pip install -r backend/requirements.txt`
- Apply migrations: `cd backend; alembic upgrade head`
- Run: `cd backend; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- New migration: `cd backend; alembic revision --autogenerate -m "<desc>"`

**Frontend:**
- Install: `cd frontend; npm install`
- Dev server: `cd frontend; npm run dev`
- Typecheck: `cd frontend; npm run typecheck` ← run before declaring done
- Build: `cd frontend; npm run build` (output to `frontend/dist/`)
- Preview build: `cd frontend; npm run preview`
- Deploy staging: `cd frontend; npm run deploy:stage` (requires SWA CLI auth)
- Deploy prod: `cd frontend; npm run deploy:prod`

**Tests:** none committed in this repo at the moment. Don't claim "tests pass" — there's nothing to run. If you add tests, document the command here.

## Conventions

- **Backend layering:** `api/` = thin routers + DTO mapping; `services/` = business + ML logic; `models.py`/`schemas.py` = ORM/Pydantic. New ML stage → new file in `services/`, then wire into `pipeline.py`.
- **Async everywhere on the backend:** SQLAlchemy is configured async (`asyncpg`/`aiosqlite`); use `async def` route handlers and `await` for DB calls.
- **Config:** every new tunable goes through `backend/app/config.py` (Pydantic Settings reads env vars). Never read `os.environ` directly inside services.
- **Frontend data fetching:** all backend calls go through `frontend/src/app/api/analysis.ts`; expose them as React Query hooks in `hooks.ts`. Components should consume hooks, not raw fetch.
- **Frontend feature folders:** one folder per screen in `features/<name>/`, colocate that feature's components and local state. Shared UI → `ui/`.
- **Styling:** Tailwind v4 utility classes + `clsx`/`tailwind-merge`. No new CSS files unless unavoidable.
- **Imports:** match what's already in neighboring files; don't introduce a path-alias scheme if none exists.
- **File naming:** PascalCase for React components and screen files, camelCase for hooks/utility modules, snake_case for Python.
- **Migrations:** never edit an applied revision; always generate a new one and check the autogenerated diff before committing.

## Gotchas and anti-patterns

- **No `scripts/` or `notebooks/` directory here.** Training code lives in a separate `ml-research/` repo. Don't grep for it, don't invent paths.
- **Model weights are not in git.** If `models/<task>/*.pt` is missing, the API will fail to start (`/api/v1/health` will report `models_loaded: false`). Tell the user to drop weights into `models/` from out-of-band storage.
- **`dataset/` is gitignored.** If it's empty on a fresh clone, that's expected; the backend doesn't need it at runtime.
- **CORS / Telegram WebApp:** the frontend runs inside Telegram (`@twa-dev/sdk`) and as a plain web app — don't strip the SDK init or assume `window.Telegram` exists outside Telegram.
- **Two segmentation models:** the pipeline runs Bush U-Net **and** Lesion DeepLabV3+ (not a single U-Net). Both paths come from env vars in `config.py`. Earlier docs in this file said "U-Net only" — that's outdated.
- **YOLOv8 cache files:** `.cache` files in dataset folders can pin a stale label set. If detection inference behaves oddly after a dataset refresh, delete them.
- **Class imbalance is real:** stress=101, mold=72, dry=40, healthy=39 (252 total). Don't propose changes that assume balanced classes.
- **Storage backend is pluggable:** `services/storage.py` switches between local FS and Azure Blob via `STORAGE_BACKEND` env var. When adding code that writes a file, go through this service, not raw `open()`.
- **Don't bypass `pipeline.py`:** API handlers should call the orchestrator, not individual model services directly, or stages drift out of order (detection must crop *before* classification/segmentation).
- **Frontend build artifacts in `dist/` are deployed as-is** to Azure SWA. Editing `dist/` by hand is pointless — it's overwritten by the next `npm run build`.

## Working with me

- Plan before multi-file changes; wait for OK on anything structural (new service, new route, schema change, migration).
- Match existing patterns; if one is broken, flag it, don't fix silently.
- Typecheck the frontend (`npm run typecheck`) and at minimum import-check the backend before saying it's done; report exactly what you ran.
- Never fabricate numbers, benchmarks, APIs, or file paths. If unknown, say "not found", don't guess.
- Ask one specific question with options when blocked, not an open one.

---

## ML pipeline (reference)

Inference order (in `backend/app/services/pipeline.py`):

```
input photo
    ↓
[1] Detection (YOLOv8s, 640x640)       → bbox of bush
    ↓
[2] crop to bbox
    ↓
[3a] Classification (EfficientNet-B0)  → {healthy, stress, mold, dry}
[3b] Segmentation
       Bush U-Net (ResNet18 enc, 512)  → plant mask
       Lesion DeepLabV3+               → lesion_{stress,mold,dry} masks
    ↓
[4] Damage quantification              → % area per lesion class
    ↓
response: class + confidence + damage % + overlay image URL
```

Training details (resolutions, augmentations, optimizers, SWA, TTA, headline metrics) live in `backend/README.md` and the separate research repo. Don't restate them in code comments.

---

## Claude Code: reusable economical setup (all projects)

Same pattern as other repos: short instructions in the repo + lean Claude Code settings + local-only permissions.

### Files and roles

| File | Purpose |
|------|---------|
| `CLAUDE.md` (this file) | Project instructions Claude Code loads automatically. |
| `.claude/settings.json` | Commit-safe defaults: effort, autocompact, secret deny-list. |
| `.claude/settings.local.json` | Machine-specific `permissions.allow`. Do not commit tokens or one-off `Bash(...)` rules. |

### Economical `.claude/settings.json` (baseline)

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
      "Read(./secrets/**)",
      "Read(./backend/.env)",
      "Read(./backend/storage/**)"
    ]
  },
  "env": {
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
  }
}
```

- `effortLevel: "low"` — shorter, more direct answers; raise only for deep exploration.
- `includeGitInstructions: false` — avoids injecting extra git how-to into context.
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "50"` — compacts conversation earlier; long threads summarize sooner.

### Local permissions

- Add `permissions.allow` only for commands actually used (`Bash(git:*)`, `Bash(npm run:*)`, `Bash(docker-compose:*)`, `Bash(alembic:*)`, `Bash(uvicorn:*)`).
- Never paste deploy tokens, Azure SWA secrets, or DB passwords into the committed `settings.json`; keep those in `settings.local.json` or env vars.
