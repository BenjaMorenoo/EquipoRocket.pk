# ── Stage 1: Build ──
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files (el asterisco hace que el lockfile sea opcional)
COPY package.json package-lock.json* ./

# Instalar TODAS las dependencias necesarias para poder compilar
RUN npm install

# Copy source code
COPY . .

# Build the application (ahora sí encontrará Vite)
RUN npm run build

# ── Stage 2: Runtime ──
FROM node:22-alpine

WORKDIR /app

# Install a lightweight HTTP server to serve the built files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (frontend serves on 5173 by default, but we'll use 3000)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]