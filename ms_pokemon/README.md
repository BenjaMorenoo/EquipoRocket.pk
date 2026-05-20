# ms_pokemon

Microservicio pequeño (Node/Express) que expone los pokémones almacenados en la base de datos PostgreSQL para que el frontend los consuma.

Características
- Devuelve una lista ligera de pokémones con estadísticas básicas (no consume PokeAPI).
- Pensado para ejecutarse en la red Docker compartida `equiporocket-net` y leer la base `equiporocketDb`.

Endpoints
- `GET /api/pokemon?limit=<n>&offset=<m>`
	- Respuesta: `{ success:true, data: { pokemons: [ { id, name, hp, attack, defense, sp_attack, sp_defense, speed }, ... ] } }`
	- Parámetros: `limit` (máx 2000), `offset` (paginación).
- `GET /api/pokemon/:name`
	- Respuesta: `{ success:true, data: { pokemon: { id, name, hp, attack, defense, sp_attack, sp_defense, speed } } }`
	- Búsqueda case-insensitive por nombre.

Variables de entorno
Copiar y editar `.env.template` a `.env` si hace falta:

- `PORT` (por defecto `3002`)
- `PGHOST` (por defecto `postgres` — asumido service name en Docker compose)
- `PGPORT` (5432)
- `PGUSER` (postgres)
- `PGPASSWORD` (contraseña de Postgres)
- `DB_NAME` (equiporocketDb)

Docker (rápido)
1. Desde la carpeta `ms_pokemon` crea `.env` a partir del template y ajusta `PGPASSWORD` si es necesario:
```bash
cp .env.template .env
# editar .env si la contraseña de postgres es distinta
```
2. Levantar el servicio en la red compartida (usa la red `equiporocket-net` creada por los otros servicios):
```bash
docker compose up -d --build
```

Pruebas
- Lista (curl):
```bash
curl 'http://localhost:3002/api/pokemon?limit=20'
```
- Buscar por nombre (curl):
```bash
curl 'http://localhost:3002/api/pokemon/pikachu'
```

Logs y debugging
- Ver logs del contenedor:
```bash
docker compose logs --follow ms_pokemon
```
- Si `Connection refused` desde `localhost:3002` revisa que el `docker-compose.yml` exponga el puerto (`ports: - "3002:3002"`) y que el servicio esté `Up` (`docker compose ps`).

Integración con frontend
- El frontend puede consumir `http://localhost:3002/api/pokemon` (o el hostname del contenedor si corre dentro del mismo network Docker).
- Si el frontend está en otro contenedor dentro de `equiporocket-net`, usa `http://ms_pokemon:3002/api/pokemon` como base URL.

Notas
- El microservicio asume la existencia de la tabla `pokemon` con al menos estas columnas: `id, name, hp, attack, defense, sp_attack, sp_defense, speed`.
- Si necesitas que devuelva tipos, moves u otras relaciones, puedo añadir joins y endpoints adicionales.
