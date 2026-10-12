FROM python:3.14-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py ./

# Mount a volume at /data so the series store and the 1.3 GB model survive deploys.
ENV DATA_DIR=/data HF_HOME=/data/huggingface PYTHONUNBUFFERED=1
CMD ["sh", "-c", "uvicorn service:app --host 0.0.0.0 --port ${PORT:-8001}"]
