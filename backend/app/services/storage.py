"""File storage abstraction — local filesystem or Azure Blob Storage."""

from __future__ import annotations

import logging
from pathlib import Path

import aiofiles

from app.config import settings

logger = logging.getLogger(__name__)


class StorageBackend:
    """Abstract-ish storage that writes/reads files locally or via Azure Blob."""

    def __init__(self) -> None:
        self._use_azure = settings.storage_backend == "azure"
        self._blob_client = None

        if self._use_azure:
            self._init_azure()

    def _init_azure(self) -> None:
        if not settings.azure_storage_connection_string:
            logger.error("AZURE_STORAGE_CONNECTION_STRING is not set — falling back to local")
            self._use_azure = False
            return

        from azure.storage.blob.aio import BlobServiceClient
        self._blob_client = BlobServiceClient.from_connection_string(
            settings.azure_storage_connection_string,
        )
        logger.info("Azure Blob Storage initialized (container=%s)", settings.azure_storage_container)

    async def save_upload(self, data: bytes, original_filename: str, analysis_id: str) -> str:
        """Save an uploaded image. Returns the storage path/key."""
        ext = Path(original_filename).suffix or ".jpg"
        key = f"uploads/{analysis_id}/original{ext}"

        if self._use_azure:
            await self._azure_put(key, data)
        else:
            await self._local_put(key, data)

        return key

    async def save_result(self, data: bytes, analysis_id: str, name: str) -> str:
        """Save a result file (visualization, mask). Returns the storage path/key."""
        key = f"results/{analysis_id}/{name}"

        if self._use_azure:
            await self._azure_put(key, data)
        else:
            await self._local_put(key, data)

        return key

    async def read_file(self, key: str) -> bytes | None:
        """Read a file by its storage key. Returns None if not found."""
        if self._use_azure:
            return await self._azure_get(key)
        return await self._local_get(key)

    async def delete_analysis_files(self, analysis_id: str) -> None:
        """Delete all files associated with an analysis."""
        prefixes = [f"uploads/{analysis_id}/", f"results/{analysis_id}/"]

        if self._use_azure:
            for prefix in prefixes:
                await self._azure_delete_prefix(prefix)
        else:
            for prefix in prefixes:
                self._local_delete_prefix(prefix)

    # --- Local filesystem ---

    async def _local_put(self, key: str, data: bytes) -> None:
        path = Path(settings.local_storage_path) / key
        path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(path, "wb") as f:
            await f.write(data)

    async def _local_get(self, key: str) -> bytes | None:
        path = Path(settings.local_storage_path) / key
        if not path.exists():
            return None
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    def _local_delete_prefix(self, prefix: str) -> None:
        base = Path(settings.local_storage_path) / prefix
        if base.exists():
            import shutil
            shutil.rmtree(base, ignore_errors=True)

    # --- Azure Blob Storage ---

    async def _azure_put(self, key: str, data: bytes) -> None:
        container = self._blob_client.get_container_client(settings.azure_storage_container)
        blob = container.get_blob_client(key)
        await blob.upload_blob(data, overwrite=True)

    async def _azure_get(self, key: str) -> bytes | None:
        try:
            container = self._blob_client.get_container_client(settings.azure_storage_container)
            blob = container.get_blob_client(key)
            stream = await blob.download_blob()
            return await stream.readall()
        except Exception:
            return None

    async def _azure_delete_prefix(self, prefix: str) -> None:
        try:
            container = self._blob_client.get_container_client(settings.azure_storage_container)
            async for blob in container.list_blobs(name_starts_with=prefix):
                await container.delete_blob(blob.name)
        except Exception as e:
            logger.warning("Failed to delete Azure blobs with prefix %s: %s", prefix, e)

    async def close(self) -> None:
        """Close the Azure Blob client (call on app shutdown)."""
        if self._blob_client is not None:
            await self._blob_client.close()


# Singleton
storage = StorageBackend()
