# Despliegue con Docker

## Levantar el proyecto

Desde la raíz del repositorio, ejecuta:

```bash
docker compose up -d
```

Esto descarga automáticamente todas las imágenes desde Docker Hub (`benjamorenoo/*`), crea la red interna `equiporocket-net`, levanta la base de datos PostgreSQL, aplica el schema de forma idempotente y arranca todos los microservicios.

No se requiere código fuente ni builds locales.

## Poblar la base de datos

Una vez que los contenedores estén corriendo, ejecuta el seed para cargar los datos iniciales (Pokémon, tipos, movimientos, etc.):

```bash
docker compose exec ms_db node seed.js
```

## Servicios y puertos

| Servicio | Descripción | Puerto (host) |
|---|---|---|
| Frontend | Aplicación web (Nginx) | http://localhost:3000 |
| API Gateway | Punto de entrada para el frontend | http://localhost:9000 |
| ms_auth | Autenticación y usuarios | 3001 |
| ms_usuarios | Equipos y colecciones | 3003 |
| ms_pokemon | Pokédex | 3002 |
| ms_carga_api | Carga de datos desde Pikalytics | 8000 |
| ms_montecarlo | Simulaciones Monte Carlo | 8010 |
| ms_asistencia | Recomendaciones con IA | 8005 |
| ms_db | Bootstrap del schema + API REST | 4002 |
| PostgreSQL | Base de datos | 5432 |

El único punto de acceso para el usuario es **http://localhost:3000**. El gateway y los microservicios permanecen en la red interna de Docker.

## Detener el proyecto

```bash
docker compose down
```

Para eliminar también los datos persistidos:

```bash
docker compose down -v
```

## Variables de entorno opcionales

Crea un archivo `.env` junto al `docker-compose.yml` para sobreescribir los valores por defecto:

```env
POSTGRES_PASSWORD=tupassword
JWT_SECRET=tusecretojwt
```
