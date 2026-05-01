"""Application configuration loaded from environment variables."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def _ensure_api_prefix(self) -> "Settings":
        if not self.api_v1_prefix or not self.api_v1_prefix.startswith("/"):
            self.api_v1_prefix = "/api/v1"
        return self

    # Application
    app_env: Literal["development", "production"] = "development"
    log_level: str = "INFO"
    secret_key: str = "change-me-to-random-string"

    # Database
    database_url: str = "sqlite+aiosqlite:///./storage/scanberry.db"

    # Storage
    storage_backend: Literal["local", "azure"] = "local"
    local_storage_path: str = "./storage"
    azure_storage_connection_string: str = ""
    azure_storage_container: str = "scanberry-images"

    # ML Models
    model_detection_path: str = ""
    model_classification_path: str = ""
    model_segmentation_path: str = ""          # legacy single-model path (unused)
    model_segmentation_bush_path: str = ""     # Bush U-Net + ResNet34
    model_segmentation_lesion_path: str = ""   # Lesion DeepLabV3+ + EfficientNet-B3
    device: str = "cpu"

    # API
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = '["http://localhost:3000","http://localhost:5173","http://localhost:8080"]'
    # Regex for dynamic origins (e.g. Azure Static Web Apps preview URLs).
    # Example: r"https://.*\.azurestaticapps\.net"
    cors_origin_regex: str = ""
    max_upload_size_mb: int = 20

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def cors_origins_list(self) -> list[str]:
        try:
            return json.loads(self.cors_origins)
        except (json.JSONDecodeError, TypeError):
            return [s.strip() for s in self.cors_origins.split(",") if s.strip()]

    @property
    def upload_dir(self) -> Path:
        p = Path(self.local_storage_path) / "uploads"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def results_dir(self) -> Path:
        p = Path(self.local_storage_path) / "results"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()
