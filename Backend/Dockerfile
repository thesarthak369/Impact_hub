FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Cloud Run automatically injects the $PORT variable (usually 8080)
CMD uvicorn main:app --host 0.0.0.0 --port $PORT