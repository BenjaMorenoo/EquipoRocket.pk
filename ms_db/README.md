
# ms_db

Microservicio que crea la base de datos PostgreSQL `equiporocketDb` y aplica el esquema inicial contenido en `schema.sql`.

Resumen rápido
- Endpoint principal: `POST /init` — crea la BD (si no existe) y aplica el esquema.
- Puerto por defecto: `4002`.

Requisitos
- Node.js 18+ (para ejecución local)
- Docker & Docker Compose (para ejecución en contenedor)

Variables de entorno
Usar el archivo `.env` (copia de `.env.example`) o configurar variables en `docker-compose.yml`:

- `PGHOST` (host de Postgres)
- `PGPORT` (puerto, 5432 por defecto)
- `PGUSER` (usuario de Postgres)
- `PGPASSWORD` (contraseña)
- `DB_NAME` (nombre de la BD a crear, por defecto `equiporocketDb`)
- `PORT` (puerto donde corre `ms_db`)

Instalación y uso local

```bash
cd ms_db
npm install
cp .env.example .env
# editar .env con credenciales reales
# crear la BD y aplicar el esquema
npm run init-db
# o arrancar el servicio y llamar al endpoint
npm start
curl -X POST http://localhost:4002/init
```

Uso con Docker Compose (recomendado)

1) Levantar todo (Postgres + ms_db). `ms_db` esperará a Postgres, ejecutará la inicialización y arrancará el servidor:

```bash
cd ms_db
docker compose up --build
```

2) Alternativa en pasos (levantar Postgres y luego inicializar):

```bash
cd ms_db
docker compose up -d postgres
docker compose build ms_db
docker compose run --rm ms_db npm run init-db
docker compose up -d ms_db
```

Nota sobre redes Docker

Este servicio puede unirse a una red Docker compartida llamada `equiporocket-net` para comunicarse con otros microservicios (por ejemplo `ms_carga_api`, `ms_auth`). Si usas composes separados, crea la red una sola vez con el script proporcionado en la raíz del repo:

PowerShell:

```powershell
.\scripts\create_network.ps1
```

Bash:

```bash
./scripts/create_network.sh
```

Ambos `docker-compose.yml` ya están configurados para usar la red externa `equiporocket-net`. Si prefieres no usar la red externa y en su lugar combinar varios `docker-compose.yml`, puedes usar `docker compose -f file1 -f file2 up --build`.


Ver tablas creadas (desde el contenedor Postgres)

```bash
docker compose exec postgres psql -U postgres -d equiporocketDb -c "\dt"
```

Persistencia de datos

Comandos `psql` útiles

- Listar todas las bases de datos:

```bash
docker compose exec postgres psql -U postgres -c "\l"
```

- Describir la estructura de una tabla (ejemplo `teams`):

```bash
docker compose exec postgres psql -U postgres -d equiporocketDb -c "\d teams"
```

- Ver las primeras filas de una tabla (`teams` ejemplo):

```bash
docker compose exec postgres psql -U postgres -d equiporocketDb -c "SELECT * FROM teams LIMIT 5;"
```

- Entrar en una sesión interactiva `psql` dentro del contenedor:

```bash
docker compose exec -it postgres psql -U postgres -d equiporocketDb
# dentro de psql puedes usar: \d table_name;  SELECT * FROM table_name LIMIT 10;
```


Por defecto `docker-compose.yml` monta la carpeta de datos de Postgres en el host como `./pgdata:/var/lib/postgresql/data`, garantizando persistencia entre reinicios y reconstrucciones del contenedor. Si prefieres usar un volumen nombrado, sustituye la sección `volumes` por un volumen Docker.

Endpoints
- `GET /` — información mínima del servicio.
- `POST /init` — crea la base de datos `DB_NAME` si no existe y aplica `schema.sql`.

Notas operativas
- Si la inicialización falla por dependencias de FK (órden de ejecución), revisa el `schema.sql` y asegúrate de que las tablas se crean en un orden compatible; el script actual ejecuta cada statement en secuencia.
- Si quieres que `ms_db` no intente crear la BD automáticamente al arrancar, modifica el `command` en `docker-compose.yml` o elimina la llamada a `npm run init-db`.

Solución de problemas
- Error de conexión a Postgres: verifica `PGHOST`, `PGPORT`, `PGUSER` y `PGPASSWORD`.
- Permisos o bloqueo en `./pgdata`: asegúrate que el usuario del host tiene permisos de escritura en esa carpeta.

Archivo de esquema
- El archivo del esquema está en [ms_db/schema.sql](schema.sql).



