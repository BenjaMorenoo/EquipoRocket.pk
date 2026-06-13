# Node.js API Gateway for EquipoRocket

FROM node:22-alpine

WORKDIR /app

# Copy package files (both package.json and optional package-lock.json)
COPY package*.json ./

# Install dependencies: use npm ci if lockfile exists, otherwise fall back to npm install
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# Copy application
COPY app.js .
# Copy example env only; do not require a local .env during build
COPY .env.example .env.example

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

# Start application
CMD ["npm", "start"]
