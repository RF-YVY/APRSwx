# APRSwx Docker Container
FROM node:18-alpine AS frontend-builder

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Python backend
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --create-home --shell /bin/bash app
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements-ci.txt ./
RUN pip install --upgrade pip && \
    (pip install --no-cache-dir -r requirements.txt || \
     echo "Full requirements failed, trying minimal set..." && \
     pip install --no-cache-dir -r requirements-ci.txt)

# Copy backend code
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/build ./static/

# Copy frontend build to Django static files
RUN mkdir -p /app/staticfiles
COPY --from=frontend-builder /app/frontend/build /app/staticfiles/

# Set permissions
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/websockets/status/ || exit 1

# Default command
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
