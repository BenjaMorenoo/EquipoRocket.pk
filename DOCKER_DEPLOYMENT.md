# Docker Deployment Guide for EquipoRocket.pk

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- At least 4GB of available RAM

## Quick Start

### Option 1: Using the Central docker-compose.yml (Recommended)

This method starts all services (frontend + all microservices) in one command:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# To see only frontend logs
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Option 2: Individual Service Deployment

If you prefer to start services individually:

```bash
# Create the network first
docker network create equiporocket-net

# Start database
cd ms_db && docker-compose up -d && cd ..

# Start each microservice
cd ms_auth && docker-compose up -d && cd ..
cd ms_usuarios && docker-compose up -d && cd ..
cd ms_pokemon && docker-compose up -d && cd ..
cd ms_carga_api && docker-compose up -d && cd ..
cd ms_montecarlo && docker-compose up -d && cd ..
cd ms_asistencia && docker-compose up -d && cd ..

# Start frontend
cd Frontend_EquipoRocket.pk && docker-compose up -d && cd ..
```

## Accessing the Application

Once all services are running:

- **Frontend**: http://localhost:3000
- **Authentication API**: http://localhost:3001
- **Pokemon API**: http://localhost:3002
- **Users API**: http://localhost:3003
- **Data Loading API**: http://localhost:8000
- **Monte Carlo API**: http://localhost:8010
- **Attendance API**: http://localhost:8005
- **PostgreSQL Database**: localhost:5432 (user: postgres, password: example)

## Environment Variables

### Frontend Configuration

The frontend communicates with microservices using Docker service names (when running with Docker Compose):

```
VITE_API_URL=http://ms_usuarios:3003/api
VITE_MS_USUARIOS_URL=http://ms_usuarios:3003/api
VITE_MS_POKEMON_URL=http://ms_pokemon:3002/api
VITE_MS_AUTH_URL=http://ms_auth:3001/api
VITE_MS_CARGA_API_URL=http://ms_carga_api:8000
VITE_MS_MONTECARLO_URL=http://ms_montecarlo:8010
VITE_MS_ASISTENCIA_URL=http://ms_asistencia:8005
```

For local development (without Docker):
```
VITE_API_URL=http://localhost:3003/api
VITE_MS_USUARIOS_URL=http://localhost:3003/api
VITE_MS_POKEMON_URL=http://localhost:3002/api
VITE_MS_AUTH_URL=http://localhost:3001/api
VITE_MS_CARGA_API_URL=http://localhost:8000
VITE_MS_MONTECARLO_URL=http://localhost:8010
VITE_MS_ASISTENCIA_URL=http://localhost:8005
```

## Useful Docker Commands

```bash
# Check service status
docker-compose ps

# View specific service logs
docker-compose logs ms_auth
docker-compose logs frontend

# Rebuild images
docker-compose build --no-cache

# Access a container shell
docker exec -it frontend sh
docker exec -it ms_usuarios sh

# Restart a specific service
docker-compose restart frontend

# View resource usage
docker stats
```

## Troubleshooting

### Frontend cannot connect to microservices
- Ensure all services are running: `docker-compose ps`
- Check frontend logs: `docker-compose logs frontend`
- Verify services are on the same network: `docker network inspect equiporocket-net`

### Database connection errors
- Check PostgreSQL is running: `docker-compose logs postgres`
- Verify database credentials match environment variables
- Ensure volume is properly mounted: `docker volume ls`

### Port conflicts
- If ports are already in use, edit `docker-compose.yml` to use different ports
- Or stop existing containers: `docker-compose down`

### Clear everything and start fresh
```bash
docker-compose down -v
docker image prune -f
docker-compose up -d --build
```

## Network Communication

All services communicate through the `equiporocket-net` bridge network:

```
[Browser]
    ↓ http://localhost:3000
[Frontend Container]
    ↓ http://ms_usuarios:3003/api (Docker network DNS)
[Microservice Containers]
    ↓ DB_HOST=postgres (Docker network DNS)
[PostgreSQL Container]
```

## Performance Notes

- First build may take 2-3 minutes depending on your internet speed
- Subsequent builds are faster due to layer caching
- Database initialization runs automatically via ms_db service
- All services automatically restart unless manually stopped

## Production Considerations

For production deployment, you should:

1. Use environment files (`.env`) for sensitive data
2. Set strong JWT_SECRET values
3. Use specific image versions instead of `latest`
4. Configure proper resource limits
5. Set up volume backups for PostgreSQL
6. Use a reverse proxy (nginx) for SSL/TLS
7. Enable logging to external services

Example environment file (`.env`):
```
JWT_SECRET=your_secure_jwt_secret_here_in_production
POSTGRES_PASSWORD=secure_password_here
```

Then reference in docker-compose:
```yaml
environment:
  JWT_SECRET: ${JWT_SECRET}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```
