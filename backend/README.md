# ScanBerry.io Backend

REST API для автоматизированной оценки физиологического состояния растений голубики (*Vaccinium corymbosum* L.) на основе анализа RGB-изображений с использованием глубокого обучения и компьютерного зрения.

**Production URL**: https://scanberry-api.azurewebsites.net

## Содержание

- [Архитектура системы](#архитектура-системы)
- [Технологический стек](#технологический-стек)
- [Структура проекта](#структура-проекта)
- [ML-пайплайн](#ml-пайплайн)
  - [Поток обработки изображения](#поток-обработки-изображения)
  - [Детекция (YOLOv8s)](#1-детекция-yolov8s)
  - [Классификация (EfficientNet-B0)](#2-классификация-efficientnet-b0)
  - [Сегментация (Bush U-Net + Lesion DeepLabV3+)](#3-сегментация-bush-u-net--lesion-deeplabv3)
  - [Квантификация повреждений](#4-квантификация-повреждений)
  - [Визуализация результатов](#5-визуализация-результатов)
  - [Метрики обученных моделей](#метрики-обученных-моделей)
- [API-эндпоинты](#api-эндпоинты)
  - [Системные](#системные)
  - [Анализ изображений](#анализ-изображений)
  - [Управление результатами](#управление-результатами)
- [База данных](#база-данных)
- [Хранилище файлов](#хранилище-файлов)
- [Конфигурация](#конфигурация)
- [Локальный запуск](#локальный-запуск)
- [Docker](#docker)
- [Деплой в Azure](#деплой-в-azure)
- [Тестирование API](#тестирование-api)
- [Режимы деградации](#режимы-деградации)
- [Обновление сегментации](#обновление-сегментации-от-stub-к-multi-class)
- [Продакшен-чеклист](#продакшен-чеклист)

---

## Архитектура системы

### Общая схема

```
Клиент (мобильное приложение / браузер)
        ↓  HTTPS
Azure App Service (reverse proxy, TLS termination)
        ↓  HTTP
Docker-контейнер (python:3.11-slim)
        ↓
Uvicorn ASGI-сервер (0.0.0.0:8000)
        ↓
FastAPI Application
  ├── API-обработчики (async I/O)
  ├── ML Pipeline (thread pool — asyncio.to_thread)
  │     ├── Detection     — YOLOv8s (Ultralytics)
  │     ├── Classification — EfficientNet-B0 (torchvision)
  │     ├── Segmentation  — Bush U-Net/ResNet34 + Lesion DeepLabV3+/EfficientNet-B3 (SMP)
  │     ├── Damage quantification
  │     └── Visualization — OpenCV overlay
  ├── Storage Backend
  │     ├── Local filesystem (development)
  │     └── Azure Blob Storage (production)
  └── Database
        ├── SQLite + aiosqlite (development)
        └── PostgreSQL + asyncpg (production)
```

### Поток данных при анализе

```
[Клиент]                        [API]                          [Сервисы]
    │                              │                               │
    │  POST /analyze (image)       │                               │
    │─────────────────────────────>│                               │
    │                              │  Валидация (тип, размер)      │
    │                              │──────────┐                    │
    │                              │          │                    │
    │                              │  Decode → BGR numpy           │
    │                              │  Create DB record             │
    │                              │  Save original → Storage      │
    │                              │                               │
    │                              │  pipeline.run(img_bgr)        │
    │                              │──────────────────────────────>│
    │                              │                    ┌──────────│
    │                              │                    │ Detection│
    │                              │                    │ → Crop   │
    │                              │                    │ Classify │
    │                              │                    │ Segment  │
    │                              │                    │ Damage   │
    │                              │                    │ Visualize│
    │                              │<─────────────────────────────│
    │                              │  PipelineResult               │
    │                              │                               │
    │                              │  Save visualization → Storage │
    │                              │  Update DB record             │
    │                              │  Commit                       │
    │                              │                               │
    │  201 AnalysisResponse (JSON) │                               │
    │<─────────────────────────────│                               │
```

### Ключевые архитектурные решения

| Решение | Обоснование |
|---------|-------------|
| **Async I/O** (SQLAlchemy 2.0, aiofiles, aiohttp) | Неблокирующие операции с БД и файлами, высокая пропускная способность |
| **Thread pool для ML-инференса** (`asyncio.to_thread`) | CPU-bound PyTorch вычисления не блокируют event loop |
| **Абстракция хранилища** (`StorageBackend`) | Единый интерфейс для local FS и Azure Blob, переключение через env var |
| **Независимая загрузка моделей** | Сбой одной модели не влияет на остальные, partial results |
| **Graceful degradation** | API работает даже без моделей, health-эндпоинт отражает статус |
| **Alembic-миграции при старте** | Production-ready: схема БД обновляется автоматически |
| **Singleton-сервисы** | `pipeline`, `storage` — единственные экземпляры, модели загружены в память один раз |
| **Pydantic-settings** | Type-safe конфигурация из env vars / `.env` файла с валидацией |

---

## Технологический стек

| Компонент | Технология | Версия | Роль |
|-----------|-----------|--------|------|
| Web-фреймворк | FastAPI | 0.115.6 | REST API, валидация, Swagger UI |
| ASGI-сервер | Uvicorn | 0.34.0 | HTTP-сервер с uvloop |
| ORM | SQLAlchemy (async) | 2.0.36 | Асинхронная работа с БД |
| Миграции | Alembic | 1.14.1 | Версионирование схемы БД |
| PostgreSQL-драйвер | asyncpg | 0.30.0 | Async PostgreSQL для продакшена |
| SQLite-драйвер | aiosqlite | 0.20.0 | Async SQLite для разработки |
| Deep Learning | PyTorch | >= 2.0.0 | Инференс нейросетей (CPU/CUDA) |
| Детекция | Ultralytics YOLOv8 | >= 8.4.0 | Локализация растений |
| Сегментация | segmentation-models-pytorch | >= 0.3.3 | U-Net (bush) + DeepLabV3+ (lesion), pretrained encoders |
| Компьютерное зрение | OpenCV (headless) | >= 4.8.0 | Обработка и визуализация |
| Облачное хранилище | azure-storage-blob | 12.24.0 | Azure Blob Storage |
| HTTP-клиент | aiohttp | >= 3.9.0 | Async-транспорт для Azure SDK |
| Конфигурация | pydantic-settings | 2.7.1 | Типизированные настройки |

---

## Структура проекта

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app: lifespan, CORS, роутеры
│   ├── config.py               # Settings из env vars (pydantic-settings)
│   ├── models.py               # ORM-модель Analysis (таблица analyses)
│   ├── schemas.py              # Pydantic: request/response схемы
│   ├── database.py             # Async engine, session factory, init_db()
│   │
│   ├── api/                    # HTTP-обработчики
│   │   ├── health.py           # GET  /health
│   │   ├── analyze.py          # POST /analyze
│   │   ├── results.py          # GET/DELETE /analyses, файлы
│   │   ├── deps.py             # Dependency injection (get_db)
│   │   └── mappers.py          # Analysis ORM → AnalysisResponse
│   │
│   ├── services/               # Бизнес-логика и ML
│   │   ├── pipeline.py         # Оркестратор: detection → cls → seg → dmg → vis
│   │   ├── detection.py        # YOLOv8s — bounding box растения
│   │   ├── classification.py   # EfficientNet-B0 — класс состояния
│   │   ├── segmentation.py     # Bush U-Net + Lesion DeepLabV3+ — пиксельные маски
│   │   ├── damage.py           # % площади повреждений из масок
│   │   ├── storage.py          # Local FS / Azure Blob абстракция
│   │   └── visualization.py    # Наложение bbox, масок, текста (OpenCV)
│   │
│   └── utils/
│       └── image.py            # decode, crop, resize, encode, BGR↔RGB
│
├── migrations/
│   ├── env.py                  # Alembic async runner
│   └── versions/
│       └── 001_initial_schema.py
│
├── Dockerfile                  # Production-образ (python:3.11-slim)
├── docker-compose.yml          # Dev-окружение (PostgreSQL + API)
├── requirements.txt            # Python-зависимости
└── alembic.ini                 # Конфигурация Alembic
```

---

## ML-пайплайн

### Поток обработки изображения

```
Входное RGB-изображение (JPG/PNG/WebP/BMP, до 20 МБ)
        ↓
┌──────────────────────────────────────────────────────┐
│  1. ДЕТЕКЦИЯ (YOLOv8s)                               │
│     Вход:  BGR-изображение (оригинальное разрешение) │
│     Выход: bounding box (x1, y1, x2, y2)            │
│            + confidence (0.0–1.0)                    │
│     Fallback: если модель не загружена или растение   │
│              не найдено — используется всё изображение│
│     → Кроп по bbox с паддингом 5%                    │
└──────────────────────────────────────────────────────┘
        ↓ (кропнутое изображение)
┌──────────────────────────────────────────────────────┐
│  2. КЛАССИФИКАЦИЯ (EfficientNet-B0)                  │
│     Вход:  RGB 320×320 (resize + ImageNet normalize) │
│     TTA:   оригинал + горизонтальный флип,           │
│            усреднение softmax-вероятностей            │
│     Выход: класс (healthy / stress / mold / dry)     │
│            + confidence + вероятности всех 4 классов  │
└──────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────┐
│  3. СЕГМЕНТАЦИЯ (Bush U-Net + Lesion DeepLabV3+)     │
│     Вход:  RGB 512×512 (resize + ImageNet normalize) │
│     Выход: бинарные маски повреждений                │
│            (plant, lesion_stress, lesion_mold,        │
│             lesion_dry)                               │
│     Порог: sigmoid > 0.5                             │
│     * Stub-режим: возвращает пустую маску            │
│       (available=false) если модель не обучена        │
└──────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────┐
│  4. КВАНТИФИКАЦИЯ ПОВРЕЖДЕНИЙ                        │
│     Формула: lesion_pct = lesion_pixels / plant_pixels│
│                           × 100%                     │
│     Выход: total_pct, stress_pct, mold_pct, dry_pct │
│     * Только при segmentation.available = true       │
└──────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────┐
│  5. ВИЗУАЛИЗАЦИЯ (OpenCV)                            │
│     Наложение на оригинальное изображение:           │
│     • Bounding box детекции (зелёный)                │
│     • Цветные маски сегментации (alpha 40%)          │
│     • Текст: класс + confidence                      │
│     • Текст: % повреждений                           │
│     Кодирование в JPEG (quality=90)                  │
└──────────────────────────────────────────────────────┘
        ↓
Сохранение в БД + хранилище → HTTP 201 Response
```

### 1. Детекция (YOLOv8s)

**Сервис**: `app/services/detection.py` → `DetectionService`

| Параметр | Значение |
|----------|----------|
| Архитектура | YOLOv8s (small) |
| Входной размер | 640×640 (внутри Ultralytics) |
| Число классов | 1 (`plant`) |
| Порог уверенности | 0.25 |
| Устройство | CPU / CUDA (настраивается) |

**Логика**:
1. Загрузка модели через `ultralytics.YOLO(path)`
2. Инференс: `model.predict(img_bgr, conf=0.25, verbose=False)`
3. Парсинг результатов: `box.xyxy`, `box.conf`, `box.cls`
4. Сортировка по confidence (descending)
5. Выбор лучшей детекции (highest confidence)
6. Кроп изображения с 5% паддингом через `utils.image.crop_bbox()`

**Выходная структура**:
```python
@dataclass
class DetectionResult:
    x1: float        # Верхний левый угол X
    y1: float        # Верхний левый угол Y
    x2: float        # Нижний правый угол X
    y2: float        # Нижний правый угол Y
    confidence: float  # 0.0–1.0
    class_id: int = 0
    class_name: str = "plant"
```

### 2. Классификация (EfficientNet-B0)

**Сервис**: `app/services/classification.py` → `ClassificationService`

| Параметр | Значение |
|----------|----------|
| Архитектура | EfficientNet-B0 (torchvision) |
| Предобучение | ImageNet (weights загружаются из `.pt`) |
| Входной размер | 320×320 |
| Классификатор | Dropout(0.3) → Linear(1280 → 4) |
| Нормализация | ImageNet: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225] |
| TTA | Оригинал + горизонтальный флип, усреднение |

**Порядок классов** (алфавитный, совпадает с `ImageFolder` при обучении):

| Индекс | Класс | Описание |
|--------|-------|----------|
| 0 | `dry` | Засохшие участки |
| 1 | `healthy` | Здоровое растение |
| 2 | `mold` | Плесневые поражения |
| 3 | `stress` | Стрессовые повреждения |

> **Важно**: Порядок классов зашит в массиве `CLASS_NAMES = ["dry", "healthy", "mold", "stress"]`. Если модель обучена с другим порядком, результаты будут некорректными.

**Test-Time Augmentation (TTA)**:
```python
# Два прохода: оригинал + горизонтальный флип
imgs = [img_rgb, np.fliplr(img_rgb).copy()]
batch = torch.stack([transform(im) for im in imgs])
logits = model(batch)
avg_probs = torch.softmax(logits, dim=1).mean(dim=0)  # усреднение
```

**Выходная структура**:
```python
@dataclass
class ClassificationResult:
    predicted_class: str              # "healthy" | "stress" | "mold" | "dry"
    confidence: float                 # 0.0–1.0 (max softmax)
    probabilities: dict[str, float]   # {"healthy": 0.85, "stress": 0.10, ...}
```

### 3. Сегментация (Bush U-Net + Lesion DeepLabV3+)

**Сервис**: `app/services/segmentation.py` → `SegmentationService`

Сегментация состоит из **двух моделей**, обучение которых выполнено в `notebooks/segmentation/train_segmentation_v3.ipynb`:

**3a. Бинарная сегментация куста (Bush)**

| Параметр | Значение |
|----------|----------|
| Архитектура | U-Net (segmentation-models-pytorch) |
| Encoder | ResNet34 (ImageNet) |
| Входной размер | 512×512 |
| Число классов | 1 (binary: куст vs фон) |
| Loss | Dice + Focal (binary) |
| Активация | Sigmoid, порог 0.5 |
| Результат | **Test Dice 0.8849, IoU 0.7971** |
| Веса | `models/segmentation/bush_unet_20260429_064404/best_model.pth` |

**3b. Мультиклассовая сегментация поражений (Lesion)**

| Параметр | Значение |
|----------|----------|
| Архитектура | DeepLabV3+ (segmentation-models-pytorch) |
| Encoder | EfficientNet-B3 (ImageNet) |
| Входной размер | 512×512 |
| Число классов | 5 (bg, healthy, stress, dry, mold) |
| Loss | Focal(gamma=3) + Dice (multiclass, ignore bg) |
| Активация | Argmax по каналам |
| Bush-mask gating | Да (lesion-маска обнуляется вне куста) |
| Oversampling | x3 для изображений с lesion-пикселями |
| Результат | **Test mDice 0.4086, mIoU 0.3461** |
| Веса | `models/segmentation/lesion_deeplabv3p_20260429_071223/best_model.pth` |

**Классы сегментации поражений:**

| Класс (id) | Название | Цвет визуализации (RGB) | Test Dice | Test IoU |
|------------|----------|------------------------|-----------|----------|
| 0 | background | Чёрный (0, 0, 0) | — | — |
| 1 | healthy | Зелёный (0, 180, 0) | 0.8118 | 0.6892 |
| 2 | stress | Жёлтый (255, 200, 0) | 0.2361 | 0.2247 |
| 3 | dry | Коричневый (160, 82, 45) | 0.3520 | 0.3056 |
| 4 | mold | Фиолетовый (180, 0, 200) | 0.2344 | 0.1651 |

**Текущее состояние**: Модели обучены (v3), веса доступны. На production пока stub-режим — требуется обновление `segmentation.py` под двухмодельную архитектуру (Bush U-Net → маска куста → Lesion DeepLabV3+ → 5-class map внутри куста).

**Выходная структура**:
```python
@dataclass
class SegmentationResult:
    mask: np.ndarray | None           # (H, W) uint8 0/255 — бинарная маска растения (bush model)
    class_masks: dict[str, np.ndarray]  # {"healthy": ..., "stress": ..., "dry": ..., "mold": ...}
    available: bool                   # True только если реальная модель загружена
```

### 4. Квантификация повреждений

**Модуль**: `app/services/damage.py` → `compute_damage()`

**Формула**:
```
lesion_pct = (количество пикселей повреждения / количество пикселей растения) × 100%
total_pct  = stress_pct + mold_pct + dry_pct
```

Пороговое значение для подсчёта пикселей: `> 127` (маски бинарные, 0 или 255).

**Выходная структура**:
```python
@dataclass
class DamageResult:
    total_pct: float | None    # Общий % повреждений
    stress_pct: float | None   # Стресс
    mold_pct: float | None     # Плесень
    dry_pct: float | None      # Засыхание
```

### 5. Визуализация результатов

**Модуль**: `app/services/visualization.py` → `draw_results()`

Результат — оригинальное изображение с наложенными элементами:

| Элемент | Вид | Условие |
|---------|-----|---------|
| Bounding box детекции | Зелёный прямоугольник (3 px) + лейбл "plant XX%" | Детекция найдена |
| Маски сегментации | Полупрозрачные цветные наложения (alpha=40%) | Сегментация доступна |
| Класс состояния | Крупный текст в верхнем левом углу, цвет по классу | Классификация выполнена |
| % повреждений | Белый текст "Damage: XX.X%" | Есть данные о повреждениях |

**Цветовая схема классов**:

| Класс | Цвет текста (BGR) | Визуальный вид |
|-------|-------------------|----------------|
| `healthy` | (0, 200, 0) | Зелёный |
| `stress` | (0, 165, 255) | Оранжевый |
| `mold` | (255, 0, 128) | Пурпурный |
| `dry` | (0, 0, 255) | Красный |

Текст рендерится с тёмным фоном для читаемости на любом изображении. Шрифт: `cv2.FONT_HERSHEY_SIMPLEX`, антиалиасинг: `cv2.LINE_AA`.

### Метрики обученных моделей

| Модель | Метрика | Значение | Примечание |
|--------|---------|----------|------------|
| Детекция (YOLOv8s) | mAP@50 | 0.995 | Практически идеальная локализация |
| Детекция (YOLOv8s) | mAP@50-95 | 0.753 | +TTA: 0.761 |
| Классификация (EfficientNet-B0) | Accuracy (SWA) | 92.1% | Run 9, 4 класса, 252 изображения |
| Классификация (EfficientNet-B0) | Macro F1 (SWA) | 0.863 | Балансировка по классам |
| Сегментация Bush (U-Net + ResNet34) | Test Dice | 0.8849 | IoU 0.7971, 250 изображений |
| Сегментация Lesion (DeepLabV3+ + EffNet-B3) | Test mDice | 0.4086 | mIoU 0.3461, healthy=0.81, stress=0.24, dry=0.35, mold=0.23 |

---

## API-эндпоинты

**Base URL**: `https://scanberry-api.azurewebsites.net`  
**API prefix**: `/api/v1`  
**Swagger UI**: https://scanberry-api.azurewebsites.net/docs  
**ReDoc**: https://scanberry-api.azurewebsites.net/redoc

### Сводная таблица

| Метод | URL | Описание | Статус |
|-------|-----|----------|--------|
| `GET` | `/` | Информация о сервисе | 200 |
| `GET` | `/api/v1/health` | Проверка состояния системы | 200 |
| `POST` | `/api/v1/analyze` | Загрузка и анализ изображения | 201 |
| `GET` | `/api/v1/analyses` | Список анализов (пагинация + фильтр) | 200 |
| `GET` | `/api/v1/analyses/{id}` | Детали конкретного анализа | 200 |
| `DELETE` | `/api/v1/analyses/{id}` | Удаление анализа и файлов | 204 |
| `GET` | `/api/v1/analyses/{id}/image` | Оригинальное изображение (binary) | 200 |
| `GET` | `/api/v1/analyses/{id}/visualization` | Визуализация с наложениями (JPEG) | 200 |
| `GET` | `/api/v1/analyses/{id}/mask` | Маска сегментации (PNG) | 200 |

### Системные

#### `GET /`

```json
{
  "service": "ScanBerry.io",
  "version": "0.1.0",
  "docs": "/docs"
}
```

#### `GET /api/v1/health`

Проверяет подключение к БД и статус загрузки моделей.

```json
{
  "status": "ok",
  "version": "0.1.0",
  "models_loaded": {
    "detection": true,
    "classification": true,
    "segmentation": false
  },
  "database": "ok"
}
```

| Поле | Значения | Описание |
|------|----------|----------|
| `status` | `"ok"` / `"degraded"` | `"ok"` — все модели загружены; `"degraded"` — часть недоступна |
| `database` | `"ok"` / `"error"` | Результат тестового запроса `SELECT 1` |

---

### Анализ изображений

#### `POST /api/v1/analyze`

Загрузка изображения и запуск полного ML-пайплайна.

**Request**: `multipart/form-data`

| Поле | Тип | Обязательное | Описание |
|------|-----|-------------|----------|
| `file` | binary | Да | Изображение JPG/PNG/WebP/BMP, до 20 МБ |

**Допустимые MIME-типы**: `image/jpeg`, `image/png`, `image/webp`, `image/bmp`

**Response** (201 Created):

```json
{
  "id": "3e849a8389b14dc5a33889003d3de43a",
  "created_at": "2026-04-04T17:56:19.050531Z",
  "original_filename": "20250705_184105.jpg",
  "image_width": 1440,
  "image_height": 1582,
  "detection": {
    "x1": 33.46,
    "y1": 0.0,
    "x2": 1312.93,
    "y2": 1224.12,
    "confidence": 0.699
  },
  "health_class": "dry",
  "health_confidence": 0.353,
  "class_probabilities": {
    "healthy": 0.2173,
    "stress": 0.2205,
    "mold": 0.2088,
    "dry": 0.3534
  },
  "segmentation_available": false,
  "segmentation_mask_url": null,
  "damage": null,
  "visualization_url": ".../api/v1/analyses/{id}/visualization",
  "original_image_url": ".../api/v1/analyses/{id}/image",
  "processing_time_ms": 9355,
  "pipeline_version": "0.1.0",
  "error_message": null
}
```

**Поля ответа**:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | Уникальный идентификатор анализа (UUID hex, 32 символа) |
| `created_at` | datetime (UTC) | Время создания |
| `original_filename` | string | Имя загруженного файла |
| `image_width`, `image_height` | int | Размеры изображения (пиксели) |
| `detection` | object / null | Bounding box растения (x1, y1, x2, y2, confidence) |
| `health_class` | string / null | Предсказанный класс: `healthy`, `stress`, `mold`, `dry` |
| `health_confidence` | float / null | Уверенность классификации (0.0–1.0) |
| `class_probabilities` | object / null | Вероятности всех 4 классов |
| `segmentation_available` | bool | Доступна ли сегментация для этого анализа |
| `segmentation_mask_url` | string / null | URL маски сегментации (если доступна) |
| `damage` | object / null | Метрики повреждений: total_pct, stress_pct, mold_pct, dry_pct |
| `visualization_url` | string / null | URL визуализации с наложениями |
| `original_image_url` | string | URL оригинального изображения |
| `processing_time_ms` | int | Время обработки в миллисекундах |
| `pipeline_version` | string | Версия пайплайна |
| `error_message` | string / null | Сообщение об ошибке (если пайплайн упал) |

**Коды ошибок**:

| Код | Ситуация |
|-----|----------|
| 400 | Неподдерживаемый формат файла, пустой файл, повреждённое изображение |
| 413 | Файл превышает лимит (`MAX_UPLOAD_SIZE_MB`, по умолчанию 20 МБ) |

---

### Управление результатами

#### `GET /api/v1/analyses`

Список анализов с пагинацией и фильтрацией.

**Query-параметры**:

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `page` | int | 1 | Номер страницы (от 1) |
| `page_size` | int | 20 | Элементов на страницу (1–100) |
| `health_class` | string | — | Фильтр: `healthy`, `stress`, `mold`, `dry` |

**Response** (200):

```json
{
  "items": [
    {
      "id": "3e849a8389b14dc5a33889003d3de43a",
      "created_at": "2026-04-04T17:56:19.050531Z",
      "original_filename": "20250705_184105.jpg",
      "health_class": "stress",
      "health_confidence": 0.78,
      "segmentation_available": false,
      "processing_time_ms": 3200,
      "visualization_url": ".../api/v1/analyses/{id}/visualization"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

Сортировка: `created_at DESC` (новые первыми).

#### `GET /api/v1/analyses/{id}`

Полная информация об анализе. Формат ответа совпадает с `POST /analyze`.

#### `DELETE /api/v1/analyses/{id}`

Удаляет запись из БД и все связанные файлы из хранилища (оригинал, визуализация, маска). Возвращает `204 No Content`. Вызывается из фронтенда на экране `/result/:id` (иконка-корзина в шапке → `ConfirmDialog` → `useDeleteAnalysis`), который после успеха инвалидирует React Query кэш и уводит на `/history`.

#### `GET /api/v1/analyses/{id}/image`

Оригинальное загруженное изображение. `Content-Type`: `image/jpeg` или `image/png`.

#### `GET /api/v1/analyses/{id}/visualization`

Результат визуализации с наложениями (bbox, маски, текст). `Content-Type`: `image/jpeg`.

#### `GET /api/v1/analyses/{id}/mask`

Маска сегментации. `Content-Type`: `image/png`. Возвращает `404` если сегментация недоступна.

---

## База данных

### Таблица `analyses`

| Поле | Тип | Nullable | Index | Описание |
|------|-----|----------|-------|----------|
| `id` | String(32) | PK | — | UUID hex (генерируется при создании) |
| `created_at` | DateTime (UTC) | No | DESC | Время создания записи |
| **Метаданные загрузки** | | | | |
| `original_filename` | String(255) | No | — | Имя файла от клиента |
| `image_path` | String(512) | No | — | Ключ в хранилище (uploads/{id}/original.jpg) |
| `image_width` | Integer | No | — | Ширина изображения (px) |
| `image_height` | Integer | No | — | Высота изображения (px) |
| **Результаты детекции** | | | | |
| `det_bbox_x1` | Float | Yes | — | Bounding box: верхний левый X |
| `det_bbox_y1` | Float | Yes | — | Bounding box: верхний левый Y |
| `det_bbox_x2` | Float | Yes | — | Bounding box: нижний правый X |
| `det_bbox_y2` | Float | Yes | — | Bounding box: нижний правый Y |
| `det_confidence` | Float | Yes | — | Уверенность детекции |
| **Результаты классификации** | | | | |
| `health_class` | String(32) | Yes | Yes | Класс: healthy / stress / mold / dry |
| `health_confidence` | Float | Yes | — | Уверенность классификации |
| `class_probabilities` | Text | Yes | — | JSON: `{"healthy": 0.85, ...}` |
| **Результаты сегментации** | | | | |
| `segmentation_mask_path` | String(512) | Yes | — | Ключ маски в хранилище |
| `segmentation_available` | Boolean | No | — | Флаг доступности сегментации |
| **Квантификация повреждений** | | | | |
| `damage_total_pct` | Float | Yes | — | Общий % повреждённой площади |
| `damage_stress_pct` | Float | Yes | — | % стресса |
| `damage_mold_pct` | Float | Yes | — | % плесени |
| `damage_dry_pct` | Float | Yes | — | % засыхания |
| **Визуализация и мета** | | | | |
| `visualization_path` | String(512) | Yes | — | Ключ визуализации в хранилище |
| `processing_time_ms` | Integer | Yes | — | Время обработки (мс) |
| `pipeline_version` | String(32) | No | — | Версия пайплайна (default "0.1.0") |
| `error_message` | Text | Yes | — | Ошибка пайплайна (если случилась) |

### Миграции (Alembic)

Управление схемой через Alembic с async-поддержкой. Миграция `001_initial_schema.py` создаёт таблицу `analyses` со всеми полями и индексами.

```bash
# Применить все миграции
alembic upgrade head

# Создать новую миграцию при изменении models.py
alembic revision --autogenerate -m "description"

# Откатить последнюю миграцию
alembic downgrade -1
```

В Docker-контейнере миграции выполняются автоматически при старте.

---

## Хранилище файлов

Абстракция `StorageBackend` (`app/services/storage.py`) предоставляет единый интерфейс:

| Метод | Описание |
|-------|----------|
| `save_upload(data, filename, id)` | Сохранить загруженное изображение |
| `save_result(data, id, name)` | Сохранить результат (визуализация, маска) |
| `read_file(key)` | Прочитать файл по ключу |
| `delete_analysis_files(id)` | Удалить все файлы анализа |
| `close()` | Закрыть Azure-клиент при shutdown |

### Структура ключей

```
uploads/{analysis_id}/original.{ext}     # Оригинальное изображение
results/{analysis_id}/visualization.jpg  # Визуализация с наложениями
results/{analysis_id}/mask.png           # Маска сегментации
```

### Local (development)

Файлы хранятся на диске: `{LOCAL_STORAGE_PATH}/{key}`. Каталоги создаются автоматически.

### Azure Blob Storage (production)

Blob-контейнер: `scanberry-images` (настраивается через `AZURE_STORAGE_CONTAINER`). Структура ключей идентична локальной. Автоматический fallback на local, если `AZURE_STORAGE_CONNECTION_STRING` пустой.

---

## Конфигурация

Все настройки загружаются из переменных окружения через `pydantic-settings` (`app/config.py`). Поддерживается `.env` файл.

### Переменные окружения

| Переменная | Тип | По умолчанию | Описание |
|-----------|-----|-------------|----------|
| **Приложение** | | | |
| `APP_ENV` | `development` / `production` | `development` | Режим: dev автосоздаёт таблицы, prod — только Alembic |
| `LOG_LEVEL` | string | `INFO` | Уровень логирования (DEBUG, INFO, WARNING, ERROR) |
| `SECRET_KEY` | string | `change-me...` | Секретный ключ приложения |
| **База данных** | | | |
| `DATABASE_URL` | string | `sqlite+aiosqlite:///./storage/scanberry.db` | Async SQLAlchemy URL |
| **Хранилище** | | | |
| `STORAGE_BACKEND` | `local` / `azure` | `local` | Бэкенд хранилища файлов |
| `LOCAL_STORAGE_PATH` | string | `./storage` | Корень локального хранилища |
| `AZURE_STORAGE_CONNECTION_STRING` | string | — | Строка подключения Azure Blob |
| `AZURE_STORAGE_CONTAINER` | string | `scanberry-images` | Имя blob-контейнера |
| **ML-модели** | | | |
| `MODEL_DETECTION_PATH` | string | — | Путь к весам YOLOv8 (`.pt`) |
| `MODEL_CLASSIFICATION_PATH` | string | — | Путь к весам EfficientNet (`.pt`) |
| `MODEL_SEGMENTATION_PATH` | string | — | Путь к весам U-Net (`.pth`) |
| `DEVICE` | string | `cpu` | PyTorch device: `cpu` или `cuda` |
| **API** | | | |
| `API_V1_PREFIX` | string | `/api/v1` | Префикс маршрутов (авто-валидация на `/`) |
| `CORS_ORIGINS` | string (JSON) | `["http://localhost:3000", ...]` | Разрешённые CORS-источники |
| `MAX_UPLOAD_SIZE_MB` | int | `20` | Максимальный размер загрузки (МБ) |

### Пример `.env` файла

```env
# Приложение
APP_ENV=development
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key-here

# База данных (dev — SQLite, prod — PostgreSQL)
DATABASE_URL=sqlite+aiosqlite:///./storage/scanberry.db
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/scanberry

# Хранилище
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./storage
# AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
# AZURE_STORAGE_CONTAINER=scanberry-images

# ML-модели (пути относительно рабочей директории или абсолютные)
MODEL_DETECTION_PATH=../models/detection/best.pt
MODEL_CLASSIFICATION_PATH=../models/classification/best_model.pt
MODEL_SEGMENTATION_PATH=
# MODEL_SEGMENTATION_PATH=../models/segmentation/best_model.pth

# Вычисления
DEVICE=cpu

# API
CORS_ORIGINS=["http://localhost:3000","http://localhost:8080"]
MAX_UPLOAD_SIZE_MB=20
```

---

## Локальный запуск

### Предварительные требования

- Python 3.11+
- Обученные модели в папке `models/` (см. [ML-пайплайн](#ml-пайплайн))
- (опционально) PostgreSQL 16+ для production-режима

### Установка

```bash
cd backend
python -m venv venv

# Linux/Mac
source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

### Запуск (development)

```bash
# Из папки backend/
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

В dev-режиме (`APP_ENV=development`) SQLite-база и таблицы создаются автоматически при старте.

### Интерактивная документация

После запуска доступна по адресам:
- **Swagger UI**: http://localhost:8000/docs — интерактивное тестирование API
- **ReDoc**: http://localhost:8000/redoc — документация в формате ReDoc

---

## Docker

### Dockerfile

Образ `python:3.11-slim` (~150 MB base) + зависимости + код + модели:

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# Системные зависимости для OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0

# Python-зависимости
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Код бэкенда
COPY backend/ .
RUN mkdir -p storage/uploads storage/results

# Веса моделей (из корня проекта)
COPY models/ /models/

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

**Контекст сборки** — корень проекта (где лежат `backend/` и `models/`):
```bash
docker build -t scanberry-api -f backend/Dockerfile .
```

> **Примечание**: Веса моделей (~200–500 МБ) вшиваются в образ при сборке (`COPY models/ /models/`). При обновлении моделей нужна пересборка образа.

### Docker Compose (локальная разработка)

```bash
docker-compose up
```

Поднимает:
- **PostgreSQL 16-alpine** (порт 5432, база `scanberry`, пользователь `scanberry`)
- **Backend API** (порт 8000, подключение к PostgreSQL, модели монтируются через volume)

Данные PostgreSQL сохраняются в Docker-volume `pgdata`.

---

## Деплой в Azure

### Инфраструктура

| Ресурс | Имя | Конфигурация |
|--------|-----|-------------|
| Resource Group | `rg-scanberry` | East US 2 |
| App Service Plan | `plan-scanberry` | B1 (1 core, 1.75 GB RAM) |
| Web App | `scanberry-api` | Linux, Web App for Containers |
| Container Registry | `acrscanberry` | Azure Container Registry (Basic) |
| База данных | — | Azure Database for PostgreSQL (Flexible Server) |
| Хранилище | — | Azure Blob Storage |

### Сборка и деплой

> **Все команды выполнять в PowerShell** (не Git Bash!). Git Bash автоматически конвертирует строки с `/` в Windows-пути (`/models/best.pt` → `C:/Program Files/Git/models/best.pt`).

```powershell
# 1. Настройка переменных окружения (выполняется один раз)
az webapp config appsettings set `
  --name scanberry-api `
  --resource-group rg-scanberry `
  --settings `
    APP_ENV="production" `
    MODEL_DETECTION_PATH="/models/detection/best.pt" `
    MODEL_CLASSIFICATION_PATH="/models/classification/best_model.pt" `
    WEBSITES_CONTAINER_START_TIME_LIMIT=600

# 2. Сборка Docker-образа в Azure Container Registry
az acr build --registry acrscanberry --image scanberry-api:latest -f backend/Dockerfile .

# 3. Перезапуск App Service (подтянет новый образ)
az webapp restart --name scanberry-api --resource-group rg-scanberry
```

### Обновление весов моделей

1. Положить новые файлы весов:
   - `models/detection/best.pt`
   - `models/classification/best_model.pt`
   - `models/segmentation/best_model.pth` (когда будет обучена)
2. Пересобрать и задеплоить:

```powershell
az acr build --registry acrscanberry --image scanberry-api:latest -f backend/Dockerfile .
az webapp restart --name scanberry-api --resource-group rg-scanberry
```

### Особенности работы в Azure

| Аспект | Поведение |
|--------|-----------|
| **Cold start** | 30–60 сек (загрузка PyTorch + модели). Последующие запросы: 2–10 сек |
| **Container timeout** | `WEBSITES_CONTAINER_START_TIME_LIMIT=600` (10 минут на старт) |
| **HTTPS** | TLS termination на уровне Azure App Service |
| **Always On** | Контейнер засыпает после ~20 мин бездействия (B1 план), требуется B2+ для Always On |
| **Git Bash** | Не использовать для az CLI с путями `/...` — конвертирует в Windows-пути |

---

## Тестирование API

### cURL

```bash
# Проверка здоровья
curl https://scanberry-api.azurewebsites.net/api/v1/health

# Загрузка изображения на анализ
curl -X POST https://scanberry-api.azurewebsites.net/api/v1/analyze \
  -F "file=@photo.jpg"

# Список всех анализов
curl https://scanberry-api.azurewebsites.net/api/v1/analyses

# Список с фильтром по классу
curl "https://scanberry-api.azurewebsites.net/api/v1/analyses?health_class=stress&page=1&page_size=10"

# Детали анализа
curl https://scanberry-api.azurewebsites.net/api/v1/analyses/{id}

# Скачать визуализацию
curl -o result.jpg https://scanberry-api.azurewebsites.net/api/v1/analyses/{id}/visualization

# Удалить анализ
curl -X DELETE https://scanberry-api.azurewebsites.net/api/v1/analyses/{id}
```

### Swagger UI

Интерактивное тестирование всех эндпоинтов прямо в браузере:

https://scanberry-api.azurewebsites.net/docs

Swagger UI позволяет загружать файлы, просматривать схемы запросов/ответов и выполнять запросы без дополнительных инструментов.

### Python (httpx)

```python
import httpx

BASE = "https://scanberry-api.azurewebsites.net/api/v1"

# Анализ изображения
with open("photo.jpg", "rb") as f:
    r = httpx.post(f"{BASE}/analyze", files={"file": f})
    result = r.json()
    print(result["health_class"], result["health_confidence"])

# Список анализов
r = httpx.get(f"{BASE}/analyses", params={"page": 1, "page_size": 5})
for item in r.json()["items"]:
    print(item["id"], item["health_class"])
```

---

## Режимы деградации

Система спроектирована для работы даже при частичной доступности моделей:

| Состояние | Поведение | health status |
|-----------|-----------|---------------|
| Все модели загружены | Полный пайплайн: детекция → классификация → сегментация → квантификация | `"ok"` |
| Нет детекции | Классификация и сегментация работают на полном изображении (без кропа) | `"degraded"` |
| Нет классификации | Детекция работает, `health_class` = null | `"degraded"` |
| Нет сегментации | Детекция + классификация работают, `segmentation_available` = false, `damage` = null | `"degraded"` |
| Ни одна модель не загружена | API отвечает, но результаты пустые; визуализация содержит только оригинальное изображение | `"degraded"` |
| БД недоступна | Эндпоинты возвращают 500, `/health` показывает `database: "error"` | `"degraded"` |

Каждая модель загружается в отдельном try-catch блоке. Ошибка одной модели не влияет на загрузку остальных. Если при инференсе произошла ошибка, она сохраняется в `error_message`, а результат возвращается как частичный.

---

## Подключение сегментации к production

Модели обучены (v3, ноутбук `notebooks/segmentation/train_segmentation_v3.ipynb`). Текущий production: **stub-режим** — `available=false`.

### Шаг 1. Bush-модель (бинарная сегментация куста)

Веса: `models/segmentation/bush_unet_20260429_064404/best_model.pth`

1. Установить `MODEL_SEGMENTATION_BUSH_PATH` в `.env` (путь к весам)
2. В `segmentation.py`: загрузить `smp.Unet(encoder_name='resnet34', classes=1)`, inference → бинарная маска куста

### Шаг 2. Lesion-модель (5-class сегментация поражений)

Веса: `models/segmentation/lesion_deeplabv3p_20260429_071223/best_model.pth`

1. Установить `MODEL_SEGMENTATION_LESION_PATH` в `.env`
2. В `segmentation.py`: загрузить `smp.DeepLabV3Plus(encoder_name='efficientnet-b3', classes=5)`, inference → argmax → 5-class map
3. Bush-mask gating на inference: `lesion_pred[bush_mask == 0] = 0` (обнулить предсказания вне куста)

### Шаг 3. Интеграция pipeline

Порядок inference:
1. Bush model → бинарная маска куста (512×512, sigmoid > 0.5)
2. Lesion model → 5-class map (512×512, argmax)
3. Bush-mask gating: `lesion_map[bush_mask == 0] = 0`
4. Извлечь class_masks: `{"healthy": mask==1, "stress": mask==2, "dry": mask==3, "mold": mask==4}`
5. Передать в `compute_damage()` для квантификации

После подключения автоматически заработают:
- Маски сегментации через `GET /analyses/{id}/mask`
- Квантификация повреждений (`damage` в ответе)
- Цветные overlay на визуализации

---

## Обработка ошибок

| HTTP-код | Ситуация |
|----------|----------|
| 400 | Неподдерживаемый формат файла, пустой файл, повреждённое/нечитаемое изображение |
| 404 | Анализ не найден, файл не найден в хранилище, сегментация недоступна |
| 413 | Файл превышает `MAX_UPLOAD_SIZE_MB` |
| 500 | Внутренняя ошибка пайплайна |

При ошибке в ML-пайплайне (500):
- Исключение перехватывается в `pipeline.run_sync()`
- Записывается в лог (`logger.exception`)
- Сохраняется в поле `error_message` в БД
- API возвращает частичный результат с заполненными данными до момента ошибки

---

## Продакшен-чеклист

- [x] `APP_ENV=production`
- [x] PostgreSQL (`DATABASE_URL=postgresql+asyncpg://...`)
- [x] Azure Blob Storage (`STORAGE_BACKEND=azure`)
- [x] Alembic-миграции при старте контейнера (CMD)
- [x] Пути к моделям через переменные окружения
- [x] CORS настроен на домен клиента
- [x] Валидация загрузок (тип, размер, целостность)
- [x] Health-эндпоинт для мониторинга
- [x] Структурированное логирование (уровень настраивается)
- [x] Graceful degradation при отсутствии моделей
- [x] HTTPS (TLS termination на Azure App Service)
- [x] Container start timeout = 600 сек
- [ ] `DEVICE=cuda` при наличии GPU
- [ ] Сегментационные модели (обучены, подключение к production pending)
- [ ] Always On (требуется план B2+)
- [ ] Rate limiting / аутентификация (не реализовано — дипломный проект)

---

## Лицензия

Дипломный проект. Все права защищены.
