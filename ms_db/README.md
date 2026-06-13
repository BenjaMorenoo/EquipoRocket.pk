
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

## Modelo de datos

`schema.sql` define el **modelo relacional físico** del sistema, en notación de tabla
estilo "crow's foot" (claves primarias/foráneas y cardinalidades implícitas en las FK),
no un DER (Diagrama Entidad-Relación) conceptual abstracto. Cada `CREATE TABLE`
corresponde 1:1 a una tabla real de PostgreSQL ya normalizada. Ver
[docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md) para el diagrama de arquitectura completo
y los patrones de diseño aplicados.

### Trazabilidad de simulaciones Monte Carlo (corrección)

Para dejar evidencia de las iteraciones individuales que ejecuta `ms_montecarlo` y de las
recomendaciones que genera, `battle_simulations` ahora incluye:

- `random_seed` (`BIGINT`): semilla pseudoaleatoria de la corrida, para poder reproducirla.
- `algorithm_version` (`VARCHAR(20)`, default `'v1'`): versión del algoritmo Monte Carlo usado.

Además se agregaron dos tablas nuevas:

- `simulation_iterations`: una fila por cada combate individual simulado para la
  configuración recomendada (`battle_simulations.simulation_count` filas por simulación),
  indicando el ganador (`A`/`B`) de cada iteración.
- `configuration_comparisons`: variantes de configuración (`original`, `alt_item_1`,
  `alt_spread_1`, ...) evaluadas para cada Pokémon del equipo, con su win rate, que
  justifican la recomendación guardada en `optimized_configurations`.

Ver detalle completo en [ms_montecarlo/README.md](../ms_montecarlo/README.md).

### `team_pokemon` (conceptualmente "team_member_configuration")

La tabla `team_pokemon` guarda la configuración completa (habilidad, item, spread de
EVs/naturaleza, tera tipo y movimientos vía `team_pokemon_moves`) de cada Pokémon dentro
de un equipo. El nombre físico se mantiene como `team_pokemon` por compatibilidad con el
código existente; **"team_member_configuration"** es el nombre conceptual usado en la
documentación para reflejar mejor su propósito (no requiere cambios de código).

### `synergy_data`: origen y limitaciones

`synergy_data` almacena sinergia **por pares** entre dos Pokémon. Estos datos provienen
de la información de "teammates" de la API externa (Pikalytics) cargada por
`ms_carga_api` en `external_raw`; `ms_asistencia` construye con esos datos una matriz de
sinergia (`engine.PokemonAnalyticsEngine`) y la persiste por pares vía `POST
/store/synergy`. Es una **simplificación**: la sinergia de un equipo completo (3-6
Pokémon) no se obtiene sumando o promediando filas de esta tabla en SQL, sino que se
calcula a posteriori en `ms_asistencia/engine.py`
(`PokemonAnalyticsEngine.analyze_team_synergy`), que promedia la sinergia de todos los
pares del equipo. Ver [ms_asistencia/README.md](../ms_asistencia/README.md).

Comando para iniciar la DB por primera vez e insertar un admin por defecto
- docker compose exec ms_db npm run init-db


