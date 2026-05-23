# Frontend Docker Deployment

This directory contains the Frontend application for EquipoRocket.pk, configured for Docker deployment.

## Quick Start with Docker

### Build and run locally

```bash
# Build the Docker image
docker build -t equiporocket-frontend:latest .

# Run the container
docker run -d \
  --name equiporocket-frontend \
  -p 3000:3000 \
  -e VITE_API_URL=http://localhost:3003/api \
  -e VITE_MS_USUARIOS_URL=http://localhost:3003/api \
  -e VITE_MS_POKEMON_URL=http://localhost:3002/api \
  -e VITE_MS_AUTH_URL=http://localhost:3001/api \
  -e VITE_MS_CARGA_API_URL=http://localhost:8000 \
  -e VITE_MS_MONTECARLO_URL=http://localhost:8010 \
  -e VITE_MS_ASISTENCIA_URL=http://localhost:8005 \
  equiporocket-frontend:latest

# Access the app at http://localhost:3000
```

### With Docker Compose (from project root)

```bash
cd ..
docker-compose up -d frontend
```

## Environment Variables

The frontend uses the following environment variables to connect to microservices:

| Variable | Default (Docker) | Default (Local) | Description |
|----------|------------------|-----------------|-------------|
| `VITE_API_URL` | `http://ms_usuarios:3003/api` | `http://localhost:3003/api` | Main API endpoint |
| `VITE_MS_USUARIOS_URL` | `http://ms_usuarios:3003/api` | `http://localhost:3003/api` | Users microservice |
| `VITE_MS_POKEMON_URL` | `http://ms_pokemon:3002/api` | `http://localhost:3002/api` | Pokemon microservice |
| `VITE_MS_AUTH_URL` | `http://ms_auth:3001/api` | `http://localhost:3001/api` | Authentication service |
| `VITE_MS_CARGA_API_URL` | `http://ms_carga_api:8000` | `http://localhost:8000` | Data loading service |
| `VITE_MS_MONTECARLO_URL` | `http://ms_montecarlo:8010` | `http://localhost:8010` | Monte Carlo simulation |
| `VITE_MS_ASISTENCIA_URL` | `http://ms_asistencia:8005` | `http://localhost:8005` | Attendance tracking |

## Development

For development without Docker:

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code
npm lint
```

## Docker Image Details

- **Base Image**: `node:22-alpine` (multi-stage build)
- **Final Size**: ~300MB
- **Exposed Port**: 3000
- **Health Check**: Enabled
- **Restart Policy**: Unless stopped

## Multi-stage Build

The Dockerfile uses a multi-stage build process:

1. **Stage 1 (Builder)**: Installs dependencies and builds the application
2. **Stage 2 (Runtime)**: Contains only the built application and `serve` for optimal size

## Network Communication

When using Docker Compose, the frontend communicates with microservices through the Docker bridge network using container names:

```
Frontend Container → Docker DNS → Service Name → Microservice Container
```

For example:
- `http://ms_usuarios:3003/api` → ms_usuarios container on port 3003

## Troubleshooting

### Frontend cannot connect to APIs

**Check if services are running:**
```bash
docker-compose ps
```

**Check frontend logs:**
```bash
docker-compose logs frontend
```

**Verify network connectivity:**
```bash
docker network inspect equiporocket-net
```

### Build fails

**Clear cache and rebuild:**
```bash
docker build --no-cache -t equiporocket-frontend:latest .
```

**Check Node version compatibility:**
```bash
docker run node:22-alpine node -v
```

### Port 3000 is already in use

**Use a different port:**
```bash
docker run -p 3001:3000 equiporocket-frontend:latest
```

### API calls failing with CORS errors

**Ensure microservices have CORS enabled** and are running on the correct ports. Check microservice documentation.

## Performance Tips

- Use Docker BuildKit for faster builds: `DOCKER_BUILDKIT=1 docker build .`
- Mount node_modules as a volume during development to avoid reinstalling
- Use `.dockerignore` to exclude unnecessary files (already configured)

## Security Notes

- Remove sensitive environment variables before pushing to production
- Use `.env` files for secret management (don't commit to git)
- Consider using Docker secrets for orchestrated environments (Swarm, Kubernetes)

## CI/CD Integration

### Example GitHub Actions workflow

```yaml
name: Build Frontend Docker Image
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: docker/setup-buildx-action@v1
      - uses: docker/build-push-action@v2
        with:
          context: ./Frontend_EquipoRocket.pk
          push: false
          tags: equiporocket-frontend:${{ github.sha }}
```

## Useful Commands

```bash
# View all images
docker images | grep equiporocket

# View container logs
docker logs -f equiporocket-frontend

# Access container shell
docker exec -it equiporocket-frontend sh

# Stop and remove container
docker stop equiporocket-frontend
docker rm equiporocket-frontend

# Build with custom tag
docker build -t equiporocket-frontend:v1.0 .

# Push to registry (example)
docker tag equiporocket-frontend:latest myregistry/equiporocket-frontend:latest
docker push myregistry/equiporocket-frontend:latest
```

## Related Documentation

- [Main Docker Deployment Guide](../DOCKER_DEPLOYMENT.md)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)
