# ms_pokemon

Microservicio que expone la información de los pokémones almacenados en la base de datos.

Endpoints principales:
- `GET /api/pokemon?limit=...&offset=...` — lista pokémones (id, name, stats básicos)
- `GET /api/pokemon/:name` — obtiene un pokémon por nombre (case-insensitive)

Ejecutar localmente (desde la carpeta `ms_pokemon`):
```bash
cp .env.template .env
# ajustar la contraseña si es necesario
docker compose up -d --build
```
