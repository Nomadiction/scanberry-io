# Azure Infrastructure Guide — ScanBerry.io

This document describes the Azure resources needed to deploy the ScanBerry.io backend and what environment variables / keys to configure.

## Provisioned Resources (created 2026-04-03)

| Resource              | Name                    | Region       | Status    |
|-----------------------|-------------------------|--------------|-----------|
| Resource Group        | `rg-scanberry`          | East US 2    | ✅ Ready  |
| Container Registry    | `acrscanberry`          | East US 2    | ✅ Ready  |
| PostgreSQL Flex Server| `scanberry-db`          | North Europe | ✅ Ready  |
| Storage Account       | `stscanberry`           | East US 2    | ✅ Ready  |
| App Service Plan      | `plan-scanberry` (B1)   | East US 2    | ✅ Ready  |
| Web App               | `scanberry-api`         | East US 2    | ✅ Running|

**Subscription:** Visual Studio Enterprise Subscription – MPN (`948dbf1d-d224-4135-9ba8-77db1e5874a5`)

**API URL:** https://scanberry-api.azurewebsites.net

**PostgreSQL FQDN:** `scanberry-db.postgres.database.azure.com`

> **Note on models:** Azure File Share mount is not supported on B1 Linux App Service.
> Models are baked directly into the Docker image at `/models/`.
> Build from project root: `docker build -f backend/Dockerfile .`

## Required Azure Resources

### 1. Resource Group

```bash
az group create --name rg-scanberry --location westeurope
```

### 2. Azure Database for PostgreSQL — Flexible Server

```bash
az postgres flexible-server create \
  --resource-group rg-scanberry \
  --name scanberry-db \
  --location westeurope \
  --admin-user scanberryadmin \
  --admin-password '<STRONG_PASSWORD>' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0

# Create the database
az postgres flexible-server db create \
  --resource-group rg-scanberry \
  --server-name scanberry-db \
  --database-name scanberry
```

**Environment variable:**
```
DATABASE_URL=postgresql+asyncpg://scanberryadmin:<PASSWORD>@scanberry-db.postgres.database.azure.com:5432/scanberry
```

**Important:** Enable "Allow public access from any Azure service" in Networking settings, or configure VNet integration for the App Service.

### 3. Azure Blob Storage

```bash
# Create storage account
az storage account create \
  --resource-group rg-scanberry \
  --name stscanberry \
  --location westeurope \
  --sku Standard_LRS \
  --kind StorageV2

# Create container for images
az storage container create \
  --account-name stscanberry \
  --name scanberry-images \
  --public-access off

# Get connection string
az storage account show-connection-string \
  --resource-group rg-scanberry \
  --name stscanberry \
  --query connectionString -o tsv
```

**Environment variables:**
```
STORAGE_BACKEND=azure
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=stscanberry;AccountKey=...;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER=scanberry-images
```

### 4. Azure Container Registry (for Docker images)

```bash
az acr create \
  --resource-group rg-scanberry \
  --name acrscanberry \
  --sku Basic \
  --admin-enabled true

# Login and push (build from project root — Dockerfile copies ../models into image)
az acr login --name acrscanberry
docker build -t acrscanberry.azurecr.io/scanberry-api:latest -f backend/Dockerfile .
docker push acrscanberry.azurecr.io/scanberry-api:latest
```

### 5. Azure App Service (Web App for Containers)

```bash
# Create App Service Plan (Linux, B1 tier for dev, P1v2+ for production with GPU)
az appservice plan create \
  --resource-group rg-scanberry \
  --name plan-scanberry \
  --is-linux \
  --sku B1

# Create Web App from container
az webapp create \
  --resource-group rg-scanberry \
  --plan plan-scanberry \
  --name scanberry-api \
  --deployment-container-image-name acrscanberry.azurecr.io/scanberry-api:latest

# Configure ACR credentials
az webapp config container set \
  --resource-group rg-scanberry \
  --name scanberry-api \
  --container-registry-url https://acrscanberry.azurecr.io \
  --container-registry-user acrscanberry \
  --container-registry-password '<ACR_PASSWORD>'
```

## Environment Variables for App Service

Set all environment variables in **App Service > Configuration > Application settings**:

| Variable                            | Value                           | Description                        |
|-------------------------------------|---------------------------------|------------------------------------|
| `APP_ENV`                           | `production`                    | Environment mode                   |
| `LOG_LEVEL`                         | `INFO`                          | Logging level                      |
| `SECRET_KEY`                        | `<random 64-char string>`       | Secret key for future auth         |
| `DATABASE_URL`                      | `postgresql+asyncpg://...`      | PostgreSQL connection string       |
| `STORAGE_BACKEND`                   | `azure`                         | Use Azure Blob Storage             |
| `AZURE_STORAGE_CONNECTION_STRING`   | `DefaultEndpointsProtocol=...`  | Blob Storage connection string     |
| `AZURE_STORAGE_CONTAINER`           | `scanberry-images`              | Blob container name                |
| `MODEL_DETECTION_PATH`              | `/models/detection/best_model_Yolo.pt` | YOLOv8s detection weights |
| `MODEL_CLASSIFICATION_PATH`         | `/models/classification/best_model_EfficientNet.pt` | EfficientNet-B0 classification weights |
| `MODEL_SEGMENTATION_BUSH_PATH`      | `/models/segmentation/best_model_U-Net.pth` | Bush U-Net + ResNet34 segmentation |
| `MODEL_SEGMENTATION_LESION_PATH`    | `/models/segmentation/best_model_DeepLab.pth` | Lesion DeepLabV3+ + EfficientNet-B3 |
| `DEVICE`                            | `cpu`                           | `cpu` or `cuda`                    |
| `API_V1_PREFIX`                     | `/api/v1`                       | API prefix                         |
| `CORS_ORIGINS`                      | `["https://scanberry.io"]`      | Explicit allowed origins (JSON)    |
| `CORS_ORIGIN_REGEX`                 | `https://.*\.azurestaticapps\.net` | Regex for SWA preview slots     |
| `MAX_UPLOAD_SIZE_MB`                | `20`                            | Max upload size                    |
| `WEBSITES_PORT`                     | `8000`                          | Azure App Service port mapping     |

```bash
# Set variables via CLI (первоначальная настройка)
az webapp config appsettings set \
  --resource-group rg-scanberry \
  --name scanberry-api \
  --settings \
    APP_ENV=production \
    DATABASE_URL="postgresql+asyncpg://..." \
    STORAGE_BACKEND=azure \
    AZURE_STORAGE_CONNECTION_STRING="..." \
    AZURE_STORAGE_CONTAINER=scanberry-images \
    DEVICE=cpu \
    WEBSITES_PORT=8000 \
    MODEL_DETECTION_PATH=/models/detection/best_model_Yolo.pt \
    MODEL_CLASSIFICATION_PATH=/models/classification/best_model_EfficientNet.pt \
    MODEL_SEGMENTATION_BUSH_PATH=/models/segmentation/best_model_U-Net.pth \
    MODEL_SEGMENTATION_LESION_PATH=/models/segmentation/best_model_DeepLab.pth
```

---

## Деплой: пошаговая инструкция

Модели, backend-код и frontend деплоятся отдельно. Ниже — полный цикл.

### Шаг 1. Собрать и запушить Docker-образ backend

Модели вшиваются в образ (`COPY models/ /models/` в Dockerfile).
Сборка из **корня проекта**, чтобы Docker-контекст видел и `backend/`, и `models/`.

```bash
cd D:/unic/diploma/ScanBerry.io

# Авторизация в Azure Container Registry
az acr login --name acrscanberry

# Сборка образа (из корня — Dockerfile: backend/Dockerfile)
docker build -t acrscanberry.azurecr.io/scanberry-api:latest -f backend/Dockerfile .

# Push в реестр
docker push acrscanberry.azurecr.io/scanberry-api:latest
```

> **Размер образа**: ~1.5 GB (Python + PyTorch CPU + модели ~180 MB).
> Первый push долгий, последующие — только изменённые слои.

### Шаг 2. Указать пути к моделям в App Service

Если ранее переменные для сегментации не были заданы:

```bash
az webapp config appsettings set \
  --resource-group rg-scanberry \
  --name scanberry-api \
  --settings \
    MODEL_DETECTION_PATH=/models/detection/best_model_Yolo.pt \
    MODEL_CLASSIFICATION_PATH=/models/classification/best_model_EfficientNet.pt \
    MODEL_SEGMENTATION_BUSH_PATH=/models/segmentation/best_model_U-Net.pth \
    MODEL_SEGMENTATION_LESION_PATH=/models/segmentation/best_model_DeepLab.pth
```

### Шаг 3. Перезапустить backend

```bash
az webapp restart --resource-group rg-scanberry --name scanberry-api
# Ждать ~60-90 секунд — контейнер стартует, загружает 4 модели
```

### Шаг 4. Проверить health

```bash
curl -s https://scanberry-api.azurewebsites.net/api/v1/health | python -m json.tool
```

Ожидаемый ответ:
```json
{
  "status": "ok",
  "models_loaded": {
    "detection": true,
    "classification": true,
    "segmentation": true
  },
  "database": "ok"
}
```

Если `segmentation: false` — проверить логи:
```bash
az webapp log tail --resource-group rg-scanberry --name scanberry-api
```

### Шаг 5. Деплой frontend (Azure Static Web Apps)

```bash
cd D:/unic/diploma/ScanBerry.io/frontend

# Установка зависимостей и сборка
npm ci
npm run build

# Деплой (токен должен быть в переменной окружения)
# PowerShell:
$env:SWA_CLI_DEPLOYMENT_TOKEN = "<токен из Azure Portal → scanberry-web → Manage deployment token>"
# Bash:
export SWA_CLI_DEPLOYMENT_TOKEN="<токен>"

npm run deploy:prod
```

### Шаг 6. Smoke-тест всей системы

```bash
# 1. Backend health
curl -s https://scanberry-api.azurewebsites.net/api/v1/health

# 2. CORS preflight
curl -i -X OPTIONS https://scanberry-api.azurewebsites.net/api/v1/analyses \
  -H "Origin: https://lively-ground-09099940f.7.azurestaticapps.net" \
  -H "Access-Control-Request-Method: GET" | grep -i "access-control"

# 3. Тест анализа (загрузить фото)
curl -X POST https://scanberry-api.azurewebsites.net/api/v1/analyze \
  -F "file=@test_photo.jpg" | python -m json.tool

# 4. Открыть фронт в браузере
# https://lively-ground-09099940f.7.azurestaticapps.net
```

В ответе на `/analyze` теперь должны быть:
- `segmentation_available: true`
- `damage: { total_pct, stress_pct, mold_pct, dry_pct }` с реальными числами

---

## Текущие файлы моделей в `/models/`

| Файл | Размер | Модель | Архитектура |
|------|--------|--------|-------------|
| `detection/best_model_Yolo.pt` | 22 MB | Detection | YOLOv8s, 1 class (plant) |
| `classification/best_model_EfficientNet.pt` | 16 MB | Classification | EfficientNet-B0, 4 classes |
| `segmentation/best_model_U-Net.pth` | 97 MB | Bush segmentation | U-Net + ResNet34, binary |
| `segmentation/best_model_DeepLab.pth` | 47 MB | Lesion segmentation | DeepLabV3+ + EfficientNet-B3, 5 classes |

## Running Alembic Migrations (Production)

```bash
# SSH into App Service or run locally pointing to prod DB
DATABASE_URL="postgresql+asyncpg://..." alembic upgrade head
```

## Estimated Monthly Cost (Development)

| Resource                      | SKU           | ~Cost/month |
|-------------------------------|---------------|-------------|
| App Service Plan              | B1 (Linux)    | ~$13        |
| PostgreSQL Flexible Server    | B1ms          | ~$15        |
| Storage Account               | Standard LRS  | ~$1         |
| Container Registry            | Basic         | ~$5         |
| **Total**                     |               | **~$34**    |

For production with GPU inference, consider Azure Container Apps or Azure ML endpoints.

---

## Frontend — Azure Static Web Apps (Phase 5)

The Telegram Mini App / web client (`/frontend`) is deployed to **Azure Static Web Apps**.
SWA serves the SPA from a global CDN, gives every PR a preview URL, handles HTTPS and routes
unmatched paths back to `index.html` (configured via `frontend/public/staticwebapp.config.json`).

### 1. Create the resource

```bash
az staticwebapp create \
  --name scanberry-web \
  --resource-group rg-scanberry \
  --location westeurope \
  --sku Free \
  --source https://github.com/<owner>/<repo> \
  --branch main \
  --app-location frontend \
  --output-location dist \
  --login-with-github
```

This command links the GitHub repository, generates a deployment token, and writes
a workflow file under `.github/workflows/`. We already ship our own workflow at
`.github/workflows/azure-static-web-apps.yml`, so you can either:

- Use `--no-build` style provisioning and rely on the existing workflow, or
- Let Azure create its workflow once, then replace it with the version in this repo.

The deployment token must be stored as a GitHub Actions secret:

```
Settings → Secrets and variables → Actions → New repository secret
Name:  AZURE_STATIC_WEB_APPS_API_TOKEN
Value: <token from Azure portal → Static Web App → Manage deployment token>
```

### 2. Build configuration

The workflow runs `npm ci && npm run build` inside `frontend/` and uploads `frontend/dist/`.
Vite picks up `frontend/.env.production` at build time, which sets:

```
VITE_API_BASE_URL=https://scanberry-api.azurewebsites.net
VITE_USE_MOCK=false
```

If the backend URL changes, update **both** `.env.production` and the `env:` block in the
workflow (the workflow value wins because it's exported into the build environment).

### 3. SPA configuration (`staticwebapp.config.json`)

Located at `frontend/public/staticwebapp.config.json` so Vite copies it into the build output.
Highlights:

- `navigationFallback` rewrites every non-asset request to `index.html` so React Router works.
- `routes` adds long cache headers to hashed assets (`/assets/*`) and `no-cache` to `index.html`.
- `globalHeaders` sets a few security defaults (`X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`). `X-Frame-Options: ALLOWALL` is intentional — Telegram embeds the app
  inside a WebView iframe.

### 4. CORS — App Service must allow the new origin

After SWA is created (e.g. `https://nice-bay-0123abcd.5.azurestaticapps.net`), update the
backend so the browser can call `https://scanberry-api.azurewebsites.net` from that origin:

```bash
az webapp config appsettings set \
  --resource-group rg-scanberry \
  --name scanberry-api \
  --settings \
    'CORS_ORIGINS=["https://nice-bay-0123abcd.5.azurestaticapps.net","https://scanberry.io"]' \
    'CORS_ORIGIN_REGEX=https://.*\.azurestaticapps\.net'
```

Why both?
- `CORS_ORIGINS` is the canonical allow-list for production URLs.
- `CORS_ORIGIN_REGEX` is consumed by FastAPI's `allow_origin_regex` and matches every
  ephemeral PR-preview slot (`<branch>.<hash>.azurestaticapps.net`) so feature branches
  can hit the live API without manual whitelisting.

The Azure App Service will restart automatically once the settings change.

### 5. Smoke test the deployment

```bash
# 1. API itself is healthy
curl https://scanberry-api.azurewebsites.net/api/v1/health

# 2. CORS preflight from the SWA origin succeeds
curl -i -X OPTIONS https://scanberry-api.azurewebsites.net/api/v1/analyses \
  -H "Origin: https://<your-swa>.azurestaticapps.net" \
  -H "Access-Control-Request-Method: GET"

# 3. Open the SWA URL in a browser, navigate to /history — analyses should load.
```

### 6. Custom domain (optional)

```bash
az staticwebapp hostname set \
  --name scanberry-web \
  --resource-group rg-scanberry \
  --hostname scanberry.io
```

Add the corresponding CNAME at the DNS provider, then re-run the CORS update with the new
hostname so the browser is happy.
