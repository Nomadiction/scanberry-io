# ScanBerry.io — Frontend

Telegram Mini App / web client for the **ScanBerry.io** diploma project — AI-powered
field diagnostics for blueberry plants (*Vaccinium corymbosum* L.). The client wraps
a FastAPI backend that runs the full ML pipeline (YOLOv8s detection → EfficientNet-B0
classification → Bush U-Net + Lesion DeepLabV3+ segmentation → damage quantification) and presents results in
a minimal, Telegram-native UI.

## Live URLs

| Environment | URL | Notes |
|---|---|---|
| **Frontend (prod)**  | https://lively-ground-09099940f.7.azurestaticapps.net | Azure Static Web Apps, SKU Free, region `eastus2` |
| **Backend API**      | https://scanberry-api.azurewebsites.net              | Azure App Service (Linux B1), container image from ACR |
| **Health check**     | https://scanberry-api.azurewebsites.net/api/v1/health | Returns `status`, `models_loaded`, `database` |
| **OpenAPI docs**     | https://scanberry-api.azurewebsites.net/docs         | FastAPI Swagger UI |

Both services live in the `rg-scanberry` resource group under the Visual Studio
Enterprise subscription.

---

## Table of Contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Screens and routes](#screens-and-routes)
4. [Domain model and API mapping](#domain-model-and-api-mapping)
5. [State management](#state-management)
6. [Design system](#design-system)
7. [Telegram SDK integration](#telegram-sdk-integration)
8. [Environment variables](#environment-variables)
9. [Local development](#local-development)
10. [Production build](#production-build)
11. [Deployment — Azure Static Web Apps](#deployment--azure-static-web-apps)
12. [Telegram Mini App setup (@BotFather)](#telegram-mini-app-setup-botfather)
13. [CORS and backend integration](#cors-and-backend-integration)
14. [Troubleshooting](#troubleshooting)
15. [Animations, accessibility, and performance](#animations-accessibility-and-performance)
16. [Public assets and Telegram splash](#public-assets-and-telegram-splash)
17. [Quality assurance (TypeScript, build)](#quality-assurance-typescript-build)
18. [Internationalization (i18n)](#internationalization-i18n)
19. [Favorites system](#favorites-system)
20. [Delete from history](#delete-from-history)
21. [Text selection policy](#text-selection-policy)
22. [Implementation scope — diploma-oriented summary](#implementation-scope--diploma-oriented-summary)
23. [Suggested thesis outline (client chapter)](#suggested-thesis-outline-client-chapter)

---

## Tech stack

| Layer | Choice | Version | Why |
|---|---|---|---|
| Language          | TypeScript                          | ^5.6 (strict, `noUnusedLocals`, `noUncheckedIndexedAccess`) | type safety across SDK + API boundaries |
| UI library        | React                               | ^18.3                                                        | mature, best ecosystem for Telegram SDK  |
| Build tool        | Vite                                | 6.3                                                          | fast dev server, zero-config ESM build   |
| Styling           | Tailwind CSS + `@tailwindcss/vite`  | 4.1                                                          | utility-first, tokens in `theme.css`     |
| Routing           | React Router                        | 7.13                                                         | lazy routes, `createBrowserRouter`       |
| Server state      | TanStack Query                      | 5.96                                                         | cache, retries, invalidation             |
| Animations        | Motion (Framer Motion successor)    | 12.23                                                        | spring physics, layout transitions       |
| Telegram SDK      | `@twa-dev/sdk`                      | 8.0                                                          | `WebApp.*` wrappers with types           |
| Icons             | `lucide-react`                      | 0.487                                                        | outline icons, stroke `2` in 24×24 viewBox |
| Class merging     | `clsx` + `tailwind-merge`           | 2.1 / 3.2                                                    | `cn()` helper in `lib/utils.ts`          |
| Deploy CLI        | `@azure/static-web-apps-cli`        | 2.0 (dev)                                                    | `swa deploy` with token                  |

---

## Project structure

```
frontend/
├── public/
│   ├── staticwebapp.config.json     # SPA fallback + caching + security headers (copied to dist/)
│   └── telegram/                    # BotFather Launch Screen: SVG + LAUNCH_SCREEN.txt (hex cheatsheet)
├── src/
│   ├── main.tsx                     # Bootstraps React, mounts <App/>
│   ├── styles/
│   │   ├── index.css                # Entry stylesheet (imports the others)
│   │   ├── tailwind.css             # @tailwind base/components/utilities
│   │   ├── theme.css                # CSS variables: colors, radii, typography, light/dark
│   │   └── fonts.css                # @font-face for Inter / SF Pro
│   └── app/
│       ├── App.tsx                  # ErrorBoundary > ThemeProvider > QueryProvider > ScanProvider > MotionConfig > RouterProvider; TelegramInit
│       ├── routes.tsx               # createBrowserRouter, lazy screens, onboarding gate
│       ├── api/
│       │   ├── analysis.ts          # fetch wrapper + backend<->frontend mapper
│       │   └── hooks.ts             # React Query: useAnalyses, useAnalysis, useUploadAnalysis, useDeleteAnalysis
│       ├── features/
│       │   ├── onboarding/          # First-run carousel (stores flag in localStorage)
│       │   ├── home/                # Dashboard: stats, recent analyses, CTA to /scan
│       │   ├── scan/                # Capture flow: options -> camera -> preview -> loading
│       │   │   ├── ScanContext.tsx        # Shared state for the whole scan flow
│       │   │   ├── ScanOptionsScreen.tsx  # Camera / Gallery picker
│       │   │   ├── CameraCaptureScreen.tsx
│       │   │   ├── PhotoPreviewScreen.tsx
│       │   │   └── AnalysisLoadingScreen.tsx
│       │   ├── result/              # Analysis detail: health badge, damage chart, segmentation overlay
│       │   ├── history/             # Paginated list with filter by health class
│       │   └── settings/            # Bottom sheet: theme toggle, app version, links
│       ├── ui/                      # Button, Card, StatusBadge, ConfirmDialog, CircularGauge, Lightbox, ImageGallery, AnimatedOutlet, ErrorBoundary…
│       ├── lib/
│       │   ├── telegram.ts          # useTelegram(): WebApp.ready/expand, haptics, MainButton/BackButton hooks
│       │   ├── share.ts             # Web Share API + clipboard fallback (result screen)
│       │   ├── hooks.ts             # useCountUp, useSafeArea, useFavorites; count-up matches CircularGauge arc
│       │   ├── i18n.ts              # Custom i18n: translations (EN/RU/ES/DE), Locale type, useLocale(), translate()
│       │   ├── mock-data.ts         # Bundled fixtures when VITE_USE_MOCK=true
│       │   ├── console-filter.ts    # Suppresses noisy Telegram SDK warnings in dev
│       │   └── constants.ts         # STATUS_*, SPRING_CONFIG, TRANSITION_PAGE, animation delays
│       ├── providers/
│       │   ├── ThemeProvider.tsx    # Syncs with Telegram themeParams + manual override
│       │   ├── LocaleProvider.tsx   # i18n context: locale state + localStorage persistence
│       │   └── QueryProvider.tsx    # TanStack Query client with defaults
│       └── types/
│           ├── analysis.ts          # UI-facing domain types
│           └── backend.ts           # Raw wire types mirroring backend `schemas.py`
├── .env.example                     # Template for local dev
├── .env.production                  # Used by `vite build` (Azure URL, `VITE_USE_MOCK=false`)
├── index.html                       # Loads telegram-web-app.js synchronously, then /src/main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts                   # React + Tailwind plugins, manualChunks for vendor/motion/query
```

---

## Screens and routes

| Path | Screen | Purpose | Key interactions |
|---|---|---|---|
| `/`                   | `RootRedirect`          | Decides whether to show onboarding or home based on `localStorage.onboarding_completed` | immediate redirect |
| `/onboarding`         | `OnboardingScreen`      | First-run screen: hero + four feature rows + **Get Started** → sets `localStorage.onboarding_completed=true` | single scroll layout (not a paged carousel) |
| `/home`               | `HomeScreen`            | Dashboard: total scans, breakdown by health class, recent analyses, primary CTA "New diagnosis" | opens `/scan`, `/history`, `/result/:id` |
| `/scan`               | `ScanOptionsScreen`     | Picker between camera and gallery upload | triggers haptic, routes to `/capture` or opens native file input |
| `/capture`            | `CameraCaptureScreen`   | Live camera view via `getUserMedia`; shutter button; torch / switch-camera if supported | captures JPEG, stores in `ScanContext`, routes to `/preview` |
| `/preview`            | `PhotoPreviewScreen`    | Shows the captured/selected photo with "Retake" and "Analyze" buttons | confirms image, routes to `/analysis/loading` |
| `/analysis/loading`   | `AnalysisLoadingScreen` | Runs `useUploadAnalysis()` (`POST /api/v1/analyze`), cosmetic step timeline + scan-line animation over preview | on success → `clear()` scan context → `/result/:id` |
| `/result/:id`         | `ResultScreen`          | Gauges (count-up + `CircularGauge`), gallery + lightbox, probabilities, damage breakdown, share (Web Share / clipboard), delete → `ConfirmDialog` + `useDeleteAnalysis` | `useAnalysis(id)` with `enabled: Boolean(id)` |
| `/history`            | `HistoryScreen`         | Search + filter chips (`useAnalyses` per filter); list of cards | tap → `/result/:id`; empty state with CTA to `/scan` |
| `*`                   | `<Navigate to="/">`    | Catch-all redirect | — |

**Settings** (`settings/SettingsSheet.tsx`) opens from the **home** header only — theme
selector (system / light / dark), language selector (EN / RU / ES / DE), and about section. It is a modal bottom sheet, not a route.

---

## Domain model and API mapping

The backend (`backend/app/schemas.py`) and the UI speak slightly different dialects —
percentages are `0..1` on the wire and `0..100` in the UI, field names differ, colors
and labels are injected client-side. The mapping is centralized in
`src/app/api/analysis.ts`:

| Backend (`schemas.py`)             | Frontend (`types/analysis.ts`) | Mapping                                        |
|------------------------------------|--------------------------------|------------------------------------------------|
| `health_confidence` (`0..1`)       | `confidence` (`0..100`)        | `× 100`, rounded                               |
| `class_probabilities.*` (`0..1`)   | `class_probabilities.*` (`0..100`) | each value `× 100`                         |
| `damage.total_pct` (`0..100`)      | `damage_percentage`            | passthrough                                    |
| `damage.{stress,mold,dry}_pct`     | `damage_breakdown[]`           | rebuilt with `STATUS_LABELS` + `STATUS_COLORS` |
| `original_image_url`               | `image_url`                    | rename                                         |
| `segmentation_mask_url`            | `mask_url`                     | rename, may be `null` until segmentation lands |
| `visualization_url`                | `visualization_url`            | URL resolved + optional `http→https` upgrade   |
| `items` / `page_size`              | `analyses` / `per_page`        | mapped in `mapListResponse`                    |
| `created_at` (ISO string)          | `created_at`                   | unchanged; formatted in UI via `formatDate()`  |

Health class enum is identical on both sides: `healthy | stress | mold | dry`. Colors
and copy live in `src/app/lib/constants.ts`, so adding a new class only requires a
single edit.

### Expected REST endpoints

```
POST   /api/v1/analyze                       # multipart/form-data, returns Analysis
GET    /api/v1/analyses?page=&page_size=     # paginated list, optional ?health_class=
GET    /api/v1/analyses/{id}                 # single analysis
DELETE /api/v1/analyses/{id}                 # removes record + files
GET    /api/v1/analyses/{id}/image           # original upload
GET    /api/v1/analyses/{id}/visualization   # server-rendered overlay
GET    /api/v1/analyses/{id}/mask            # segmentation mask (PNG, when available)
GET    /api/v1/health                        # { status, models_loaded, database }
```

---

## State management

React Query handles all server state:

- **Query keys** are namespaced in `api/hooks.ts` (`analysisKeys.all`, `.lists()`, `.detail(id)`).
- **Defaults** (`QueryProvider.tsx`): `staleTime = 5min`, `gcTime = 10min`, `retry: 1`,
  `refetchOnWindowFocus: false`.
- **Upload**: `useUploadAnalysis` invalidates list queries on success so home/history refresh.
- **Detail**: `useAnalysis(id)` uses `enabled: Boolean(id)` to avoid fetching with an empty id.
- **Delete**: `useDeleteAnalysis` removes `detail(id)` from cache and invalidates `analysisKeys.all`
  on success. UI: `ConfirmDialog` with shared `Button` variants, Escape to dismiss, haptics.
- **Error surface**: root `ErrorBoundary`; failed network requests surface via query `isError` on screens.

Client-only state (onboarding flag, theme choice, in-progress scan blob) uses a mix
of `localStorage` + React Context (`ScanContext`, `ThemeProvider`). No Redux / Zustand —
the state surface is too small to justify a dedicated store.

---

## Design system

Tokens are defined once in `src/styles/theme.css` via CSS variables and consumed by
Tailwind classes plus the shared UI components.

| Token / role | Light (`:root`) | Dark (`.dark`) | Notes |
|--------------|-------------------|----------------|-------|
| `--background` | `#FFFFFF` | `#030712` (`--gray-950`) | page background |
| `--foreground` | `#111827` (`--gray-900`) | `#F9FAFB` (`--gray-50`) | body text |
| `--primary` | `#4F46E5` (`--primary-500`) | `#818CF8` (`--primary-400`) | buttons, accents |
| `--card` | `#FFFFFF` | `#111827` (`--gray-900`) | cards / sheets |
| `--muted-foreground` | `--gray-500` | `--gray-400` | secondary labels |
| Health chips | `STATUS_COLORS` in `constants.ts`: healthy `#10B981`, stress `#F59E0B`, mold `#8B5CF6`, dry `#EF4444` | same | badges, charts |
| Radius | Tailwind `rounded-xl` (12px) on cards/buttons; pills for chips | | |
| Safe area | `--safe-top` / `--safe-bottom` + `pt-safe` / `pb-safe` / `min-h-screen-safe` | | Telegram WebView |

Typography stack:

- Body & UI: **Inter** (variable, weights 400/500/600)
- Numbers & metrics: **JetBrains Mono** (adds technical feel in the damage breakdown)
- iOS fallback: **SF Pro Display** for headings

Animation rules (Motion + CSS):

- Global **`MotionConfig reducedMotion="user"`** in `App.tsx` respects `prefers-reduced-motion`
  for JS-driven animations; `theme.css` also shortens CSS transitions when reduced motion is on.
- **Route transitions**: `AnimatedOutlet` uses `TRANSITION_PAGE` (`duration: 0.22`, cubic ease) from
  `constants.ts`; `will-change: opacity, transform` on the animated wrapper.
- **Springs**: shared `SPRING_CONFIG` (`stiffness: 300`, `damping: 30`) for sheets, galleries, onboarding.
- **Shared layout**: `ImageGallery` / `Lightbox` use `layoutId` for thumbnail → full-screen morph.
- **Data viz**: `CircularGauge` arc follows the same numeric value as `useCountUp` (no separate Motion
  tween on the stroke) so digits and arc stay aligned.

---

## Telegram SDK integration

`index.html` loads the official SDK synchronously before the module entrypoint so
`window.Telegram.WebApp` is available when React mounts:

```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script type="module" src="/src/main.tsx"></script>
```

`src/app/lib/telegram.ts` wraps the SDK with safe no-ops for local browser previews:

Use **`useTelegram()`** from `lib/telegram.ts` — it returns `init`, `haptic`, `mainButton`,
`backButton`, `webApp`, `colorScheme`, etc. All haptic calls are wrapped in `try/catch`
no-ops so local browser dev does not throw.

`TelegramInit` in `App.tsx` calls `init()` once (`WebApp.ready()`, `expand()`, optional
`enableClosingConfirmation()`). `ThemeProvider` resolves **system** theme via
`WebApp.colorScheme` when `theme === 'system'`, applies `class="light"|"dark"` on
`<html>`, and calls `WebApp.setHeaderColor` / `setBackgroundColor` (`#FFFFFF` / `#030712`)
to align Telegram chrome with the app. Manual theme (`localStorage.theme`) overrides
system when not `system`.

**Buttons**: the app does not rely on Telegram's native `MainButton` / `BackButton`
for primary navigation — in-app buttons are friendlier for deep links and browser
previews — but the hooks in `telegram.ts` are available if a future screen needs
them.

---

## Environment variables

| Variable            | Where                                           | Purpose                                                   |
|---------------------|-------------------------------------------------|-----------------------------------------------------------|
| `VITE_API_BASE_URL` | `.env` / `.env.production` / GH Actions `env:` | FastAPI base URL — **no trailing slash, no `/api/v1`**    |
| `VITE_USE_MOCK`     | `.env`                                          | `true` → short-circuit all API calls with bundled mocks   |

Vite loads `.env` for `npm run dev` and `.env.production` for `vite build`. When the
GitHub Actions workflow runs, its `env:` block is exported into the build environment
and wins over the checked-in `.env.production` — keep the two in sync.

**Important**: the frontend never stores secrets. The deployment token for Azure SWA
lives in a GitHub Actions secret (`AZURE_STATIC_WEB_APPS_API_TOKEN`) or in a local
`SWA_CLI_DEPLOYMENT_TOKEN` env var — never checked in.

---

## Local development

```bash
cd frontend
cp .env.example .env          # edit VITE_API_BASE_URL if needed
npm install                   # once
npm run dev                   # http://localhost:5173
```

By default `.env.example` points at `http://localhost:8000` (the FastAPI dev server).
Two common variations:

- **No backend running**: set `VITE_USE_MOCK=true` in `.env`. The app falls back to
  fixtures in `src/app/lib/mock-data.ts` for every query and mutation.
- **Against production backend**: set `VITE_API_BASE_URL=https://scanberry-api.azurewebsites.net`.
  The backend's `CORS_ORIGIN_REGEX` already allows `http://localhost:5173`, so CORS
  works out of the box.

Available scripts:

| Command              | What it does                                              |
|----------------------|-----------------------------------------------------------|
| `npm run dev`        | Vite dev server on port 5173 with HMR                     |
| `npm run build`      | Type-check + `vite build` → `dist/`                       |
| `npm run preview`    | Serve `dist/` locally (useful after `build`)              |
| `npm run deploy:stage` | Build + `swa deploy` to **staging** (default env), app `scanberry-web` |
| `npm run deploy:prod`  | Build + `swa deploy` to **`production`**                                 |
| `npm run deploy:stage:only` | Deploy existing `dist/` to staging (no build)                       |
| `npm run deploy:prod:only`  | Deploy existing `dist/` to production (no build)                    |
| `npm run typecheck`  | `tsc --noEmit` — strict compile check (CI-friendly)        |

---

## Production build

```bash
npm run build       # vite build → dist/ (run `npm run typecheck` separately in CI)
npm run preview     # serves dist/ on http://localhost:4173
```

`vite.config.ts` splits the bundle into three vendor chunks to keep the initial
payload small:

```ts
manualChunks: {
  vendor: ['react', 'react-dom', 'react-router'],
  motion: ['motion'],
  query:  ['@tanstack/react-query'],
}
```

The build also copies `public/staticwebapp.config.json` into `dist/`. **Do not
remove it** — SWA reads that file from the deployed output to configure routing,
caching and security headers.

---

## Deployment — Azure Static Web Apps

Production runs on **Azure Static Web Apps** (Free tier) in `eastus2`, resource
`scanberry-web` inside the `rg-scanberry` resource group. The live hostname is
`lively-ground-09099940f.7.azurestaticapps.net`.

### Current deploy flow (manual, no GitHub)

The project is currently deployed via the SWA CLI using a deployment token from
the Azure resource:

```bash
# 1) Provision the resource (one time)
az staticwebapp create \
  --name scanberry-web \
  --resource-group rg-scanberry \
  --location eastus2 \
  --sku Free

# 2) Fetch the deployment token
TOKEN=$(az staticwebapp secrets list \
  --name scanberry-web \
  --resource-group rg-scanberry \
  --query "properties.apiKey" -o tsv)

# 3) Build and deploy the bundle
cd frontend
export SWA_CLI_DEPLOYMENT_TOKEN="$TOKEN"   # PowerShell: $env:SWA_CLI_DEPLOYMENT_TOKEN = $TOKEN
npm run deploy:prod                        # or: npm run deploy:stage
```

`npm run deploy:prod` / `deploy:stage` run the same flags as a manual `swa deploy`
(`--app-name scanberry-web --no-use-keychain`, production adds `--env production`);
`SWA_CLI_DEPLOYMENT_TOKEN` must be set in the environment.

### Opt-in CI/CD (GitHub Actions)

A ready-to-use workflow ships at `.github/workflows/azure-static-web-apps.yml`. It
is triggered on every push to `main` touching `frontend/**` and on PR open/sync/close
to provision and tear down preview slots. To enable it:

1. Initialize the repository as a git repo and push it to GitHub:

    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git remote add origin https://github.com/<owner>/<repo>.git
    git push -u origin main
    ```

2. Store the deployment token from step 2 above as a GitHub secret:

    ```
    Settings → Secrets and variables → Actions → New repository secret
    Name:  AZURE_STATIC_WEB_APPS_API_TOKEN
    Value: <token>
    ```

3. The workflow runs `npm ci && npm run build` under `frontend/` with
   `VITE_API_BASE_URL=https://scanberry-api.azurewebsites.net` and uploads `frontend/dist/`
   via `Azure/static-web-apps-deploy@v1` with `skip_app_build: true` (we already built).

Every pull request gets an ephemeral preview URL
(`<pr-id>-<hash>.azurestaticapps.net`) that is automatically torn down when the PR
closes. Preview slots are covered by the backend's `CORS_ORIGIN_REGEX`, so no manual
whitelisting is needed.

### `staticwebapp.config.json`

Lives at `frontend/public/staticwebapp.config.json` so Vite copies it into `dist/`.
Highlights:

- **`navigationFallback`** rewrites every non-asset request to `/index.html`, which
  is how React Router gets deep-link support on a static host.
- **`routes`** sets `cache-control: no-cache, no-store, must-revalidate` on
  `index.html` and `public, max-age=31536000, immutable` on `/assets/*` (Vite emits
  content-hashed filenames, so they are safe to cache forever).
- **`responseOverrides.404`** rewrites any unmatched path to `/index.html` with
  status 200 — defensive fallback for edge cases where `navigationFallback` does
  not kick in.
- **`globalHeaders`** sets `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a camera-only
  `Permissions-Policy`, and **`X-Frame-Options: ALLOWALL`** — the last one is
  intentional so Telegram can embed the app inside its WebView.

### Custom domain (optional)

```bash
az staticwebapp hostname set \
  --name scanberry-web \
  --resource-group rg-scanberry \
  --hostname scanberry.io
```

Point a CNAME at `lively-ground-09099940f.7.azurestaticapps.net`, then re-run the
backend CORS update with the new hostname so the browser is happy.

---

## Telegram Mini App setup (@BotFather)

This section turns the deployed SWA into a real Telegram Mini App. Everything happens
inside a chat with **[@BotFather](https://t.me/BotFather)** — no CLI.

### Step 1 — create the bot

1. Open @BotFather in Telegram, send `/newbot`.
2. Answer the prompts:

    ```
    Bot name:     ScanBerry — Blueberry Doctor
    Bot username: scanberry_diagnostics_bot
    ```

    - The **name** is the visible display name (up to 64 chars). "ScanBerry —
      Blueberry Doctor" is short, descriptive, and includes the brand.
    - The **username** must be globally unique, end with `bot`, and only contain
      ASCII letters / digits / underscores. If `scanberry_diagnostics_bot` is taken,
      try `scanberry_health_bot`, `scanberry_plant_bot`, or
      `scanberryio_bot`. **Update every other step in this section with the
      username you actually got.**

3. BotFather replies with an **HTTP API token** — save it in a password manager.
   The Mini App itself does not need this token (it is only used by the optional
   `/start` handler if you build a backend bot later), but you must not lose it.

### Step 2 — write the texts

Run each command in a separate @BotFather message and paste the payload when asked.

| Command               | Field              | Max length | Suggested value |
|-----------------------|--------------------|-----------|-----------------|
| `/setname`            | display name       | 64 chars  | `ScanBerry — Blueberry Doctor` |
| `/setdescription`     | long description (shown on the empty-chat screen) | 512 chars | *see below* |
| `/setabouttext`       | short about text (shown on the profile card)       | 120 chars | `AI diagnostics for blueberry plants. Scan a bush, get a health report in seconds.` |
| `/setuserpic`         | avatar             | 640×640 PNG/JPG | plant icon or project logo on indigo background |

**Long description** (paste as a single block, 505 chars):

```
ScanBerry is a diploma project that turns your phone camera into a blueberry plant
doctor. Photograph a bush in the field and the AI pipeline (YOLOv8 + EfficientNet +
U-Net) detects the plant, classifies its state — healthy, stress, mold, or dry —
segments damaged leaves and reports the percentage of damaged area per lesion type.
Built on field RGB images of Vaccinium corymbosum L. Open the mini app to get an
instant diagnosis or browse your scan history.
```

### Step 3 — set the bot commands

Send `/setcommands`, pick the bot, then paste:

```
start - Open the ScanBerry mini app
scan - Start a new diagnosis
history - View past analyses
about - About the project
help - How to use
```

These show up in the Telegram command menu (`/`) inside the chat with the bot.

### Step 4 — register the Mini App

1. Send `/newapp`, pick the bot.
2. Answer:

    ```
    Title:        ScanBerry Diagnose
    Description:  Full-screen mini app for in-field blueberry plant diagnosis
    Photo:        640×360 cover image (brand background + plant leaf silhouette)
    Demo GIF:     (optional) a 10-second capture → analysis → result loop
    Web App URL:  https://lively-ground-09099940f.7.azurestaticapps.net
    Short name:   diagnose
    ```

    - **Short name** becomes part of the deep link:
      `https://t.me/scanberry_diagnostics_bot/diagnose`. Use this URL on your
      diploma poster, in README badges, in QR codes, etc.
    - Telegram caches the cover image and GIF aggressively — if you update them
      later, bump the query string (`?v=2`) so reviewers see the new version.

### Step 5 — wire the menu button

Send `/setmenubutton`, pick the bot, choose **Configure menu button**, then:

```
Button text: Diagnose
Button URL:  https://lively-ground-09099940f.7.azurestaticapps.net
```

The menu button is the little square next to the chat input. Tapping it opens the
Mini App full-screen inside Telegram — this is how most users will launch it.

**Alternative (menu commands vs. web app button)**: you can pick only one of
"Configure menu button" and "Enable slash commands"; the menu button wins. We keep
commands for backward-compatibility on older clients and set the menu button for
modern ones.

### Step 6 — lock things down

1. `/mybots` → select the bot → **Bot Settings** → **Allow Groups?** → **Turn off**
   (the mini app is a single-user diagnostic tool, groups add no value and open
   rate-limit concerns).
2. `/mybots` → **Bot Settings** → **Group Privacy** → leave enabled.
3. `/mybots` → **Payments** / **Domain** → leave unset for now.

### Step 7 — smoke test

1. Open the bot chat in Telegram mobile **and** desktop.
2. Tap the menu button → the app should open in a WebView, load
   `https://lively-ground-09099940f.7.azurestaticapps.net`, auto-detect Telegram
   theme params, and show the onboarding (first run) or dashboard.
3. Send `/scan` in the chat — even without a bot backend, the command menu should
   show the entries from Step 3. (Responding to the command text itself requires a
   bot backend, which is out of scope for this README.)
4. Send the Mini App deep link (`https://t.me/scanberry_diagnostics_bot/diagnose`)
   to a second device to confirm it opens for external users too.

### Step 8 — QR code for the diploma poster

```bash
# Any QR generator works; this one is offline:
npx qrcode "https://t.me/scanberry_diagnostics_bot/diagnose" -o diagnose-qr.png
```

Print it at ≥ 3 cm on the poster so reviewers can launch the live demo from across
the room.

---

## CORS and backend integration

The browser calls `https://scanberry-api.azurewebsites.net` from the SWA origin,
so the backend must explicitly allow it. The current production config on
`scanberry-api` is:

```jsonc
// CORS_ORIGINS — explicit allow-list
[
  "https://lively-ground-09099940f.7.azurestaticapps.net",
  "http://localhost:5173"
]

// CORS_ORIGIN_REGEX — matches every PR preview slot
"https://.*\\.azurestaticapps\\.net"
```

Updating either value restarts the App Service automatically **but the container
does not always pick up the new env vars on the first restart**. If CORS still
returns `400 Disallowed CORS origin` after a settings change, force a restart:

```bash
az webapp restart --resource-group rg-scanberry --name scanberry-api
```

Then re-run the preflight smoke test:

```bash
curl -s -i -X OPTIONS https://scanberry-api.azurewebsites.net/api/v1/analyses \
  -H "Origin: https://lively-ground-09099940f.7.azurestaticapps.net" \
  -H "Access-Control-Request-Method: GET" \
  | grep -iE "HTTP|access-control"
```

Expected: `HTTP/1.1 200 OK` with
`Access-Control-Allow-Origin: https://lively-ground-09099940f.7.azurestaticapps.net`.

---

## Troubleshooting

| Symptom                                     | Likely cause / fix                                                                                    |
|---------------------------------------------|-------------------------------------------------------------------------------------------------------|
| `Network error — backend is unreachable`   | `VITE_API_BASE_URL` is wrong, or the backend is sleeping. Hit `/api/v1/health` directly.              |
| `400 Disallowed CORS origin` in DevTools    | Origin missing from `CORS_ORIGINS`; run `az webapp restart` after updating settings.                  |
| Blank screen on a deep link                 | `staticwebapp.config.json` not in `dist/`. Confirm it is in `public/` (Vite copies `public/` to `dist/`). |
| 404 on `/assets/*` after a redeploy         | Hard reload — `index.html` is `no-cache`, `/assets/*` filenames are content-hashed, so the old HTML cached for seconds may still reference missing chunks. |
| CORS error only in PR preview               | `CORS_ORIGIN_REGEX` was unset or changed. Restore `https://.*\.azurestaticapps\.net`.                  |
| Telegram shows old app after a redeploy     | Force-close the app from Telegram (`×` icon), Telegram caches the WebView aggressively on mobile.      |
| App loads but stays on a spinner in Telegram| `window.Telegram.WebApp.ready()` was not called — check `telegram.init()` runs on mount.               |
| Camera permission denied in the WebView     | Telegram on Android asks the user separately; add copy in the onboarding about granting camera access.|
| `401/403` from the API                      | Not a real problem yet — the API has no auth, so any 4xx is likely a validation error. Check payload size (`MAX_UPLOAD_SIZE_MB = 20`). |
| BotFather “Unable to extract SVG” / single path | Use `public/telegram/splash-leaf.svg` (minimal `M`/`C`/`z` path, `fill` only). Fallback: **WEBP 512×512**. See `public/telegram/LAUNCH_SCREEN.txt` for HEX. |

---

## Animations, accessibility, and performance

| Mechanism | Where | Purpose |
|-----------|--------|---------|
| `MotionConfig reducedMotion="user"` | `App.tsx` | Disables transform-heavy Motion animations when the OS requests reduced motion. |
| `TRANSITION_PAGE` | `AnimatedOutlet.tsx` | Short route cross-fade + slide; avoids spring on full-page swap to reduce jank. |
| `SPRING_CONFIG` | Sheets, onboarding stagger, `Lightbox` drag | Consistent spring (`stiffness` / `damping`) across the UI. |
| `useCountUp` + `prefers-reduced-motion` | `lib/hooks.ts` | Numeric gauges jump to target instantly when reduced motion is set. |
| Analysis loading RAF | `AnalysisLoadingScreen.tsx` | Scan-line animation skips `setState` while the tab is hidden (`document.hidden`). |
| Lightbox backdrop | `Lightbox.tsx` | `backdrop-blur-sm` (not `md`) to lower GPU cost in Telegram WebView. |

---

## Public assets and Telegram splash

| Path | Role |
|------|------|
| `public/staticwebapp.config.json` | Copied to `dist/` — SPA fallback, asset caching, headers (see [Deployment](#deployment--azure-static-web-apps)). |
| `public/telegram/splash-leaf.svg` | BotFather-friendly splash **icon** (single filled path, brand `#4F46E5`). |
| `public/telegram/splash-icon.svg` | Identical minimal leaf asset (backup filename). |
| `public/telegram/scanberry-emblem.svg` | Rich marketing-style emblem — **not** for BotFather’s strict SVG parser. |
| `public/telegram/LAUNCH_SCREEN.txt` | Copy-paste **HEX** for Light/Dark background + header to match `theme.css`. |

Launch Screen colors align with **`ThemeProvider`**: light surfaces `#FFFFFF`, dark `#030712`; header bar can mirror `#4F46E5` (light) / `#1F2937` (dark) as documented in the txt file.

---

## Quality assurance (TypeScript, build)

- **`tsconfig.json`**: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`.
- **`npm run typecheck`**: `tsc --noEmit` — run before releases and in CI.
- **`npm run build`**: Vite production bundle; no separate ESLint config in repo (rely on TypeScript + IDE).

---

## Internationalization (i18n)

The app ships a **custom i18n system** built without external libraries — a single
`src/app/lib/i18n.ts` file provides all translations and type-safe access.

### Architecture

| Component | File | Role |
|-----------|------|------|
| Translation dictionary | `lib/i18n.ts` | `as const` object mapping `TranslationKey` → `{ en, ru, es, de }` |
| `Locale` type | `lib/i18n.ts` | `'en' \| 'ru' \| 'es' \| 'de'` |
| `TranslationKey` type | `lib/i18n.ts` | `keyof typeof translations` — auto-derived, compile-time safe |
| `LocaleContext` | `lib/i18n.ts` | React Context providing `locale`, `setLocale`, `t()` |
| `useLocale()` | `lib/i18n.ts` | Hook — throws if used outside `LocaleProvider` |
| `translate(key, locale)` | `lib/i18n.ts` | Pure function for non-component code |
| `LocaleProvider` | `providers/LocaleProvider.tsx` | Persists locale in `localStorage('locale')`; defaults to `'en'` |

### Supported locales

| Code | Language | Coverage |
|------|----------|----------|
| `en` | English | 100% — primary/fallback |
| `ru` | Russian | 100% — all 110+ keys |
| `es` | Spanish | 100% — all 110+ keys |
| `de` | German | 100% — all 110+ keys |

### Translation coverage

All user-facing strings are translated, including:

- **Home**: dashboard stats, CTA, recent section, empty state
- **Scan flow**: options screen, camera/gallery labels, 4 photography tips with descriptions
- **Loading**: pipeline step names, status messages, error/finalize text
- **Results**: health score, damage area, visual evidence tabs, classification probabilities, damage breakdown, recommendations (3–5 per health class), details section, action buttons
- **History**: search placeholder, filter tabs, result counts, empty states
- **Settings**: theme labels, language label, about text, model info labels
- **Status labels/descriptions**: healthy, stress, mold, dry — with full medical-style descriptions
- **Severity levels**: good, attention, warning, critical
- **Confidence labels**: high, moderate, low (with rescan suggestion)
- **Card metrics**: health, damage, time
- **Confirm dialogs**: delete title, description, action buttons

### Adding a new locale

1. Add the code to `Locale` type in `i18n.ts`: `'en' | 'ru' | 'es' | 'de' | 'xx'`
2. Add `xx: '...'` to every key in the `translations` object (TypeScript enforces completeness via `as const`)
3. Add the locale to `LocaleProvider.tsx` init guard
4. Add a button in `SettingsSheet.tsx` language grid

### How strings are consumed

Every screen component calls `const { t } = useLocale()` and uses `t('key')` for all
visible text. No hardcoded strings remain in the JSX. The `TranslationKey` type ensures
compile-time safety — a typo in a key is a TypeScript error.

---

## Favorites system

Users can mark analyses as favorites for quick filtering.

| Component | File | Role |
|-----------|------|------|
| `useFavorites()` | `lib/hooks.ts` | Hook returning `{ ids, toggle(id), isFavorite(id) }` |
| Storage | `localStorage('scanberry_favorites')` | JSON array → `Set<string>` for O(1) lookup |
| UI — card | `ui/AnalysisCard.tsx` | Star button (amber when active), `onToggleFavorite` prop |
| UI — history | `features/history/HistoryScreen.tsx` | Filter toggle button in header, filters list to favorites only |

---

## Delete from history

Analyses can be deleted directly from the history list (in addition to the existing
delete on the result screen):

- Each `AnalysisCard` renders a trash icon button (`onDelete` prop)
- Tapping opens a `ConfirmDialog` with translated title/description
- Confirmation triggers `useDeleteAnalysis()` → `DELETE /api/v1/analyses/{id}`
- On success: cache invalidation via `analysisKeys.all`, haptic feedback

---

## Text selection policy

Global `user-select: none` on `<body>` prevents accidental text selection during
swipe/tap interactions (important for mobile/Telegram WebView). Specific elements
that should be copyable (analysis IDs, model names, numeric values) receive the
`.select-text` CSS class, which restores `user-select: text` and `cursor: text`.

Defined in `src/styles/theme.css`:
```css
body { user-select: none; -webkit-user-select: none; cursor: default; }
.select-text, input, textarea { user-select: text; -webkit-user-select: text; cursor: text; }
```

---

## Implementation scope — diploma-oriented summary

**Completed client capabilities (high level):**

1. **Onboarding & navigation** — first-run flag in `localStorage`; lazy-loaded routes; `AnimatedOutlet` transitions; 404 → `index.html` on SWA.
2. **Scan pipeline** — `ScanContext` holds `File` + object URL (with `revokeObjectURL` on clear); camera + gallery; preview; upload mutation with loading UX and error redirect.
3. **Results & history** — analysis detail with animated gauges, image gallery + lightbox (`layoutId`), classification probabilities, damage breakdown, optional mock probabilities when backend omits them.
4. **Actions** — Web Share / clipboard for result link; delete with confirmation and cache invalidation; delete from history list view.
5. **Settings** — theme persistence (`light` / `dark` / `system`), Telegram header/background sync, language selector (4 locales).
6. **i18n** — custom translation system (110+ keys × 4 languages: EN, RU, ES, DE); `LocaleProvider` with `localStorage` persistence; type-safe `TranslationKey`; zero external dependencies.
7. **Favorites** — `useFavorites()` hook with `localStorage` + `Set<string>`; star toggle on cards; filter in history.
8. **Text selection** — global `user-select: none` with selective `.select-text` class for copyable elements.
9. **Telegram** — SDK init, haptics, safe-area utilities, `Permissions-Policy` for camera in `staticwebapp.config.json`.
10. **Deploy** — Azure Static Web Apps; documented manual `swa deploy` and optional GitHub workflow.

**Intentional non-goals (for thesis “limitations” section):**

- No separate admin UI; no auth/JWT in the client (matches current public API).
- No offline persistence of analyses beyond server + React Query cache.

---

## Suggested thesis outline (client chapter)

You can lift section titles almost verbatim from this README:

1. **Problem and role of the client** — field photo → diagnosis; Telegram as deployment channel.
2. **Stack and rationale** — React, Vite, TypeScript, Tailwind, TanStack Query, Motion, TWA SDK (table in [Tech stack](#tech-stack)).
3. **Application architecture** — route map, lazy loading, layout animation, state split (server vs `ScanContext` / theme / locale).
4. **API integration** — REST endpoints, mapping layer, `resolveUrl` / mixed-content handling, mock mode for UI demos.
5. **UX and visual design** — tokens, health colors, safe areas, motion and reduced-motion policy, text selection control.
6. **Internationalization** — custom i18n without external dependencies; 4 languages (EN/RU/ES/DE); type-safe keys; `LocaleProvider` + `localStorage`.
7. **Favorites and history management** — `useFavorites()` with `Set<string>`, filter toggle, delete from list with confirmation dialog.
8. **Telegram Mini App** — `telegram-web-app.js`, `init`, theme sync, BotFather setup, Launch Screen assets (`public/telegram/`).
9. **Deployment** — Azure SWA, `staticwebapp.config.json`, CORS, production URL.
10. **Testing and quality** — `typecheck`, manual test matrix (onboarding, scan, result, history, delete, share, language switch).
11. **Future work** — auth, PWA install, automated E2E, additional locales.

For the **project diary / narrative** in Russian, see also `README.md` at the repository root (working log).

---

## Related docs

- `README.md` (repository root) — diploma working log / synopsis in Russian.
- `AZURE.md` (project root) — Azure infra (RG, PostgreSQL, ACR, App Service, SWA).
- `backend/README.md` — FastAPI, ML pipeline, migrations.
- `docs/figma-prompt.md` — design brief for UI mockups.
- `CLAUDE.md` (project root) — high-level architecture and phase plan.
- `AGENTS.md` — agent notes for this repo.
