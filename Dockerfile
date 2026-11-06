# =============================================================================
# Stage 1: Build Modern Frontend SPA (Vite + React + Tailwind Light Theme)
# =============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# =============================================================================
# Stage 2: 24/7 Autonomous Lead Hunter Backend (FastAPI + Playwright + Gemini)
# =============================================================================
FROM python:3.12-slim

# Install system dependencies for Playwright headless Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    curl \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libxshmfence1 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Install Playwright browser
RUN playwright install chromium && playwright install-deps chromium || true

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend distribution from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose standard cloud port
ENV PORT=8000
EXPOSE 8000

# Set working directory to backend so relative imports and SQLite databases resolve cleanly
WORKDIR /app/backend

# Launch 24/7 autonomous lead hunter daemon
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
