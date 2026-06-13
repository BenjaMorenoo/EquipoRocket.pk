# API Gateway - EquipoRocket

Gateway centralizado que routea todas las peticiones del frontend hacia los microservicios adecuados.

## Descripción

Este gateway actúa como un proxy reverso que:
- Centraliza el punto de acceso para el frontend
- Routea peticiones hacia los microservicios correctos
- Maneja CORS automáticamente
- Propaga headers de autenticación
- Proporciona información de salud del gateway

## Rutas Disponibles

### Health & Info
- `GET /health` - Estado del gateway
- `GET /gateway-info` - Información de configuración

### Autenticación (→ ms_auth:3001)
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `PATCH /api/auth/me`

### Usuarios y Equipos (→ ms_usuarios:3003)
- `GET /api/usuarios/*`
- `GET /api/teams` - Listar equipos
- `POST /api/teams` - Crear equipo
- `GET /api/teams/:id` - Obtener equipo
- `PUT /api/teams/:id` - Actualizar equipo
- `DELETE /api/teams/:id` - Eliminar equipo

### Pokémon (→ ms_pokemon:3002)
- `GET /api/pokemon` - Listar Pokémon
- `GET /api/pokemon/:id` - Obtener Pokémon

### Carga de Datos (→ ms_carga_api:8000)
- `POST /api/carga/load` - Cargar datos

### Simulaciones Monte Carlo (→ ms_montecarlo:8010)
- `POST /api/montecarlo/simulate` - Ejecutar simulación

### Asistencia (→ ms_asistencia:8005)
- `GET /api/asistencia/*` - Datos de asistencia

## Instalación Local

```bash
cd ms_gateway
npm install
cp .env.example .env
npm start
```

El gateway estará disponible en `http://localhost:8000`

## Uso con Docker

```bash
cd ms_gateway
docker compose up -d
```

## Variables de Entorno

```
PORT=8000
MS_AUTH_URL=http://ms_auth:3001
MS_USUARIOS_URL=http://ms_usuarios:3003
MS_POKEMON_URL=http://ms_pokemon:3002
MS_CARGA_API_URL=http://ms_carga_api:8000
MS_MONTECARLO_URL=http://ms_montecarlo:8010
MS_ASISTENCIA_URL=http://ms_asistencia:8005
```

## Integración con Frontend

El frontend debe configurar una única URL base:

```javascript
// Usar solo una variable de entorno
const GATEWAY_URL = 'http://api_gateway:8000';

// O en variables de entorno
VITE_API_URL=http://api_gateway:8000
```

Luego todas las peticiones van hacia el gateway:

```javascript
// Autenticación
POST http://api_gateway:8000/api/auth/login

// Usuarios
GET http://api_gateway:8000/api/usuarios/...

// Equipos
GET http://api_gateway:8000/api/teams

// Pokémon
GET http://api_gateway:8000/api/pokemon
```

## Desarrollo

Con Docker Compose desde la raíz del proyecto, el gateway se inicia automáticamente y está disponible en:
- Docker: `http://api_gateway:8000`
- Local: `http://localhost:8000`

## Logs

```bash
# Ver logs en tiempo real
docker compose logs -f api_gateway
```

## Estructura de Requestor

```
Frontend (3000)
    ↓
API Gateway (8000)
    ├→ /api/auth          → ms_auth (3001)
    ├→ /api/usuarios      → ms_usuarios (3003)
    ├→ /api/teams         → ms_usuarios (3003)
    ├→ /api/users         → ms_usuarios (3003)
    ├→ /api/pokemon       → ms_pokemon (3002)
    ├→ /api/carga         → ms_carga_api (8000)
    ├→ /api/montecarlo    → ms_montecarlo (8010)
    └→ /api/asistencia    → ms_asistencia (8005)
```

## Troubleshooting

### Gateway no responde

```bash
# Verificar que el gateway está corriendo
docker compose ps api_gateway

# Ver logs de error
docker compose logs api_gateway

# Verificar salud
curl http://localhost:8000/health
```

### Microservicio no accesible

1. Verifica que el microservicio esté corriendo
2. Comprueba que la URL en `.env` es correcta
3. Verifica que estén en la misma red Docker

```bash
# Listar servicios en la red
docker network inspect equiporocket-net
```

### CORS errors

El gateway tiene CORS habilitado. Si aún hay errores:
1. Verifica que el frontend acceda a través del gateway
2. Comprueba que los headers se propagan correctamente

## Performance

- Conexiones HTTP keep-alive
- Compresión automática
- Pool de conexiones reutilizable
- Request timeouts configurables

## Producción

Para entorno de producción:

1. Deshabilitar CORS permisivo: cambiar `{ origin: true }` a lista de orígenes
2. Configurar HTTPS/TLS
3. Agregar rate limiting
4. Usar variables de entorno para secretos
5. Habilitar logging persistente
