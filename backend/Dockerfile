FROM python:3.11-slim

WORKDIR /app

# System deps for opencv-python-headless
RUN apt-get update && \
    apt-get install -y --no-install-recommends libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
# Install CPU-only torch first from PyTorch index (avoids ~1.5 GB of CUDA deps
# pulled in by the default PyPI wheel since torch 2.11 — Azure App Service is CPU).
RUN pip install --no-cache-dir --timeout 600 \
        --index-url https://download.pytorch.org/whl/cpu \
        torch==2.5.1 torchvision==0.20.1 && \
    pip install --no-cache-dir --timeout 600 -r requirements.txt && \
    pip uninstall -y opencv-python opencv-python-headless && \
    pip install --no-cache-dir opencv-python-headless

COPY backend/ .

# Create storage dirs
RUN mkdir -p storage/uploads storage/results

# Bake model weights into image (copy from ../models relative to build context)
# Build with: docker build -t ... -f backend/Dockerfile . (from project root)
COPY models/ /models/

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
