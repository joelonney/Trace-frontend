# syntax=docker/dockerfile:1

# ---------- Stage 1: build the static site ----------
# Vite 8 needs Node ^20.19 or >=22.12.
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached until package files change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_* values are baked into the JavaScript bundle at BUILD time (they are public, never put
# secrets here). Override with:  docker build --build-arg VITE_API_MODE=http \
#                                  --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 .
ARG VITE_API_MODE=mock
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV VITE_API_MODE=$VITE_API_MODE \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ---------- Stage 2: serve with nginx (runs as non-root, listens on 8080) ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
