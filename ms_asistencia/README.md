ms_asistencia

FastAPI microservice providing assisted team-building recommendations based on external_raw data stored in the main DB (table `external_raw`).

Endpoints:
- GET /health
- POST /analyze/team { team: ["Pikachu","Charizard"] }
- POST /recommend/teammate { team: [...], top_n: 3 }
- POST /recommend/build { name: "Pikachu" }
- POST /reload  (force reload from DB)

Env vars (via .env or Docker):
- PGHOST, PGPORT, PGUSER, PGPASSWORD, DB_NAME

Build & run (local):

python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8005

Docker:

docker build -t ms_asistencia:local .
docker run -e PGHOST=host.docker.internal -e PGPASSWORD=... -p 8005:8005 ms_asistencia:local

## Origen y limitaciones de los datos de sinergia (`synergy_data`)

`POST /store/synergy` calcula la sinergia **por pares** entre los Pokémon de `team` y la
persiste en la tabla `synergy_data` (`ms_db/schema.sql`), una fila por cada par
`(pokemon_id, teammate_pokemon_id, synergy_percent)`.

- **Origen de los datos**: `engine.PokemonAnalyticsEngine` construye `self.synergy_matrix`
  a partir del campo `team` (lista de "teammates" con su `percent` de uso conjunto) de
  cada entrada en `external_raw.payload`. Ese payload proviene de la API externa
  (Pikalytics) cargada por `ms_carga_api`. Es decir, `synergy_percent` refleja qué tan
  seguido dos Pokémon aparecen juntos en equipos reales reportados por esa API, no un
  cálculo propio de tipos/daño.
- **Es una simplificación pairwise**: `synergy_data` solo guarda sinergia entre **pares**
  de Pokémon. La sinergia de un equipo completo (3-6 Pokémon) **no** se obtiene sumando o
  promediando filas de `synergy_data` con SQL.
- **Sinergia de equipo completo (a posteriori)**: `POST /analyze/team` y el cálculo de
  `synergy_percent` para un equipo de N Pokémon se hacen en
  `engine.PokemonAnalyticsEngine.analyze_team_synergy`, que toma el **promedio** de la
  sinergia de todos los pares `(i, j)` del equipo usando `self.synergy_matrix` (la misma
  matriz que alimenta `synergy_data`). Este cálculo se hace en memoria (pandas) y no
  depende de que `synergy_data` esté poblada en la base de datos.
