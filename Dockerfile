FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements-server.txt .
RUN pip install -r requirements-server.txt

# Код сервера (winky/ остаётся на маке — в образ не входит через .dockerignore)
COPY main.py config.py ./
COPY api/ api/
COPY bot/ bot/
COPY database/ database/
COPY webapp/ webapp/

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
