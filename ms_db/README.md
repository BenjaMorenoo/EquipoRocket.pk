
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

### Integridad de datos y borrado

#### Borrados físicos desde la plataforma

La plataforma solo ejecuta tres `DELETE` físicos, todos sobre tablas hoja sin riesgo de FKs colgantes:

| Operación | Tabla afectada | Contexto |
|---|---|---|
| Usuario quita Pokémon de su colección | `user_collections` | Nadie referencia esta tabla |
| Editar Pokémon de un equipo | `team_pokemon_moves` → `team_pokemon` | Dentro de una transacción; se reemplazan los registros de inmediato |
| `ms_montecarlo` persiste configuración | `team_pokemon_moves` | Limpia movimientos antes de re-insertar |

El **borrado de equipos es siempre un soft-delete** (`UPDATE teams SET active = FALSE`). El trigger `trg_prevent_delete_teams` bloquea cualquier `DELETE` físico directo sobre `teams`, tanto desde la app como desde psql.

Los **usuarios nunca se eliminan físicamente** a través de la aplicación — solo se desactivan (`is_active = FALSE`).

#### Cascadas internas al editar un equipo

Al editar los Pokémon de un equipo (`replaceTeamPokemons`), el DELETE sobre `team_pokemon` dispara cascadas hacia:

- `team_pokemon_moves` (ON DELETE CASCADE)
- `optimized_configurations` (ON DELETE CASCADE) — se eliminan las configuraciones optimizadas de simulaciones anteriores
- `configuration_comparisons` (ON DELETE CASCADE)

#### FKs sin CASCADE — protección por RESTRICT

Las FKs hacia tablas de referencia (`pokemon`, `abilities`, `items`, `moves`, `types`, `formats`) usan **RESTRICT** por defecto: Postgres lanza un error antes de dejar una referencia colgante. No hay riesgo de corrupción silenciosa.

#### Supresión de usuarios (Ley N° 21.719)

El esquema anterior tenía un deadlock: `teams.user_id NOT NULL` + FK sin acción + trigger anti-DELETE en `teams` hacía imposible eliminar físicamente a un usuario con equipos, bloqueando el cumplimiento del derecho de supresión. Las siguientes FKs fueron corregidas:

| Tabla | FK | Comportamiento |
|---|---|---|
| `teams` | `fk_teams_user` → `ON DELETE SET NULL` | El equipo queda en BD sin dueño (analítica intacta) |
| `team_feedback` | `fk_tf_user` → `ON DELETE SET NULL` | El historial de feedback queda sin usuario asociado |
| `battle_simulations` | `fk_bs_user`, `fk_bs_team_a/b`, `fk_bs_winner_team` → `ON DELETE SET NULL` | Los resultados de simulaciones quedan con referencias en NULL |

`teams.user_id` también fue cambiado de `NOT NULL` a nullable.

#### Aplicar la migración en una BD existente

`schema.sql` incluye un bloque de `ALTER TABLE` idempotentes al final del archivo. Para aplicarlos en una BD ya creada sin reinicializar:

```bash
docker compose exec postgres psql -U postgres -d equiporocketDb -f /docker-entrypoint-initdb.d/schema.sql
# o conectarse con psql y ejecutar solo el bloque de ALTER TABLE del final
```

#### Admin por defecto

Al inicializar la BD por primera vez se inserta un usuario administrador con las credenciales definidas en las variables `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_USERNAME` y `DEFAULT_ADMIN_PASSWORD` (por defecto `admin@equiporocket.cl` / `admin` / `Admin123!`). Cambiar estas credenciales antes de desplegar en producción.

Comando para iniciar la DB por primera vez e insertar un admin por defecto:

```bash
docker compose exec ms_db npm run init-db
```


