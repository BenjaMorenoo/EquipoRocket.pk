# EquipoRocket - Docker Deployment Guide

Complete guide for deploying EquipoRocket with Docker, featuring a microservices architecture with an API Gateway.

## Architecture Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ http://localhost:3000
       ▼
┌─────────────────────────────┐
│  Frontend (React + Vite)    │ Port 3000
└──────┬──────────────────────┘
       │ http://api_gateway:8000
       ▼
┌──────────────────────────────┐
│   API Gateway (Express)      │ Port 9000 (mapped from 8000)
└──────┬────┬────┬────┬────┬───┘
       │    │    │    │    │
   ┌───▼──┐ │    │    │    │
   │Auth  │ │    │    │    │
   │3001  │ │    │    │    │
   └──────┘ │    │    │    │
       ┌────▼─┐  │    │    │
       │Users │  │    │    │
       │3003  │  │    │    │
       └──────┘  │    │    │
          ┌──────▼─┐  │    │
          │Pokemon │  │    │
          │3002    │  │    │
          └────────┘  │    │
               ┌──────▼─┐  │
               │Carga   │  │
               │8000    │  │
               └────────┘  │
                  ┌────────▼─┐
                  │Montecarlo│
                  │8010      │
                  └──────────┘

         ┌──────────────────┐
         │ PostgreSQL (BD)  │
         │ Port 5432        │
         └──────────────────┘
```

## Quick Start

### Prerequisites

- Docker Desktop (20.10+)
- Docker Compose (2.0+)
- 4GB+ RAM available

### Start Everything (Recommended)

```bash
# From project root
docker-compose up -d

# Wait for all services to be healthy (~30-60 seconds)
docker-compose ps

# Access the application
# Frontend: http://localhost:3000
# Gateway Health: http://localhost:9000/health
```

### Stop Everything

```bash
docker-compose down
```

### Clean Everything (Destroy Data)

```bash
docker-compose down -v
```

## Service Ports

| Service | Internal | External | Description |
|---------|----------|----------|-------------|
| Frontend | 3000 | 3000 | React application |
| **API Gateway** | 8000 | **9000** | Central routing |
| ms_auth | 3001 | 3001 | Authentication |
| ms_pokemon | 3002 | 3002 | Pokémon database |
| ms_usuarios | 3003 | 3003 | Users & teams |
| ms_carga_api | 8000 | 8000 | Data loading |
| ms_montecarlo | 8010 | 8010 | Simulations |
| ms_asistencia | 8005 | 8005 | AI Assistance |
| PostgreSQL | 5432 | 5432 | Database |

## Gateway Communication

The **API Gateway** is the single entry point for the frontend:

```
Frontend → Gateway (9000) → Microservices
```

### Gateway Routes

```
POST   /api/auth/login          → ms_auth:3001
POST   /api/auth/register       → ms_auth:3001
GET    /api/pokemon/*           → ms_pokemon:3002
GET    /api/teams               → ms_usuarios:3003
POST   /api/teams               → ms_usuarios:3003
PUT    /api/teams/:id           → ms_usuarios:3003
DELETE /api/teams/:id           → ms_usuarios:3003
GET    /api/usuarios/*          → ms_usuarios:3003
POST   /api/montecarlo/simulate → ms_montecarlo:8010
POST   /api/asistencia/*        → ms_asistencia:8005
POST   /api/carga/load          → ms_carga_api:8000
```

## Frontend Configuration

The frontend only needs one environment variable:

```
VITE_API_URL=http://api_gateway:8000
```

In Docker: `http://api_gateway:8000` (uses Docker DNS)
Locally: `http://localhost:9000` (uses gateway port mapping)

## Useful Commands

### Check Services Status

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f api_gateway
docker-compose logs -f ms_pokemon
```

### Test Gateway

```bash
# Health check
curl http://localhost:9000/health

# Gateway info
curl http://localhost:9000/gateway-info

# Test route (example)
curl http://localhost:9000/api/pokemon?limit=5
```

### Access Container Shell

```bash
docker-compose exec frontend sh
docker-compose exec api_gateway sh
docker-compose exec ms_usuarios bash
```

### Rebuild Images

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Restart Specific Service

```bash
docker-compose restart api_gateway
docker-compose restart ms_pokemon
```

## Troubleshooting

### Gateway unavailable

```bash
# Check gateway logs
docker-compose logs api_gateway

# Check if gateway container is running
docker-compose ps api_gateway

# Test direct connection
curl -v http://localhost:9000/health
```

### Frontend can't reach gateway

```bash
# Check frontend logs
docker-compose logs frontend

# Verify all services are running
docker-compose ps

# Check network connectivity
docker network inspect equiporocket-net
```

### Microservice not responding through gateway

```bash
# Check if microservice is running
docker-compose ps ms_pokemon

# Check microservice logs
docker-compose logs ms_pokemon

# Test microservice directly (from within container)
docker-compose exec api_gateway wget -O- http://ms_pokemon:3002/health
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres pg_isready -U postgres
```

### Port already in use

If port 9000 (gateway) is already in use, edit `docker-compose.yml`:

```yaml
api_gateway:
  ports:
    - "9001:8000"  # Change from 9000 to 9001
```

Then restart:

```bash
docker-compose down
docker-compose up -d
```

## Performance Tips

- First startup takes longer (building images, initializing DB)
- Subsequent startups are faster (images cached)
- Use `--no-cache` flag to force clean builds
- Monitor resource usage: `docker stats`

## Production Deployment

For production, consider:

1. **Security**
   - Use environment files for secrets
   - Enable HTTPS/TLS on gateway
   - Set strong JWT_SECRET
   - Configure CORS properly
   - Use secrets management system

2. **Performance**
   - Enable rate limiting on gateway
   - Configure caching headers
   - Use CDN for static assets
   - Monitor and log requests

3. **Reliability**
   - Set up monitoring/alerting
   - Configure auto-restart policies
   - Use persistent volumes for data
   - Implement backup strategy
   - Set resource limits

4. **Scalability**
   - Use Kubernetes instead of Docker Compose
   - Implement load balancing
   - Use container registry (Docker Hub, ECR)
   - Configure horizontal scaling

## Docker Compose File Structure

The central `docker-compose.yml` includes:

- **postgres**: PostgreSQL database with persistence
- **ms_db**: Database initialization
- **ms_auth**: Authentication service
- **ms_usuarios**: Users and teams service
- **ms_pokemon**: Pokémon database service
- **ms_carga_api**: Data loading service
- **ms_montecarlo**: Simulation service
- **ms_asistencia**: AI assistance service
- **api_gateway**: Central API Gateway
- **frontend**: React frontend application

All services are on the `equiporocket-net` Docker bridge network.

## Environment Variables

Edit `.env` file or pass via Docker:

```bash
# JWT Secret for authentication
JWT_SECRET=your_secure_secret_here

# PostgreSQL credentials
POSTGRES_PASSWORD=example

# API Gateway port
API_GATEWAY_PORT=9000
```

## Related Documentation

- [API Gateway README](ms_gateway/README.md)
- [Frontend Docker README](Frontend_EquipoRocket.pk/DOCKER_README.md)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Support

For issues or questions:

1. Check logs: `docker-compose logs [service]`
2. Verify connectivity: `docker network inspect equiporocket-net`
3. Check service health: `curl http://localhost:9000/health`
4. Review gateway configuration: `curl http://localhost:9000/gateway-info`
