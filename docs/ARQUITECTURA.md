# Arquitectura de EquipoRocket.pk

> Diagrama de arquitectura y patrones de diseño aplicados (corrección punto 3:
> "no hay un diagrama de arquitectura claro que muestre cómo interactúan los
> microservicios"). El diagrama refleja la arquitectura **implementada**,
> verificada directamente en el código de cada servicio.

## Diagrama de componentes y flujo de llamadas

```mermaid
flowchart TB
    subgraph Cliente
        FE["Frontend SPA<br/>React + Vite<br/>src/services/api.js"]
    end

    subgraph Microservicios
        AUTH["ms_auth (Node/Express)<br/>login, registro, JWT"]
        USU["ms_usuarios (Node/Express)<br/>equipos, perfil, analítica admin"]
        POKE["ms_pokemon (Node/Express)<br/>Pokédex de solo lectura"]
        CARGA["ms_carga_api (FastAPI)<br/>ingesta de datos externos"]
        MC["ms_montecarlo (FastAPI)<br/>simulación Monte Carlo"]
        ASIS["ms_asistencia (FastAPI + pandas)<br/>recomendaciones / sinergia"]
    end

    DB[("PostgreSQL equiporocketDb<br/>(ms_db)")]
    EXT[("API externa<br/>Pikalytics")]

    FE -->|"HTTP REST + JWT"| AUTH
    FE -->|"HTTP REST + JWT"| USU
    FE -->|"HTTP REST"| POKE
    FE -->|"HTTP REST"| MC
    FE -->|"HTTP REST"| ASIS
    FE -->|"HTTP REST"| CARGA

    AUTH --> DB
    USU --> DB
    POKE --> DB
    CARGA --> DB
    MC --> DB
    ASIS --> DB

    CARGA -->|"fetch JSON"| EXT
    CARGA -->|"guarda payload crudo en external_raw"| DB
    MC -->|"lee external_raw para construir el pool"| DB
    ASIS -->|"lee external_raw para la matriz de sinergia"| DB
```

## Descripción de los flujos

1. **Autenticación**: el frontend llama a `ms_auth` (`/api/auth/register`, `/api/auth/login`), que emite un JWT firmado con `JWT_SECRET`. Ese mismo secreto es validado por el middleware `requireAuth` de `ms_usuarios`.
2. **Gestión de equipos**: el frontend llama directamente a `ms_usuarios` (`/api/teams`, CRUD de equipos) y a `ms_pokemon` (Pokédex) usando el JWT emitido por `ms_auth`.
3. **Ingesta de datos externos**: `ms_carga_api` consulta la API externa (Pikalytics, vía `API_URL`), guarda el payload crudo en `external_raw.payload` (JSONB) y normaliza entradas hacia `pokemon`, `types`, `abilities`, `items`, `moves`, `spreads`, etc.
4. **Simulación Monte Carlo**: el frontend llama directamente a `ms_montecarlo` (`POST /simulate`). Este servicio carga el "pool" de Pokémon desde la fila más reciente de `external_raw`, ejecuta la búsqueda Monte Carlo (`montecarlo.search_best_team` + `simulator.simulate_battle`) y persiste resultados en `battle_simulations`, `simulation_iterations`, `optimized_configurations` y `configuration_comparisons` (ver [`ms_montecarlo/README.md`](../ms_montecarlo/README.md)).
5. **Asistencia / sinergia**: el frontend llama directamente a `ms_asistencia` (`/analyze/team`, `/recommend/teammate`, `/recommend/build`, `/store/synergy`). Este servicio también lee `external_raw` y construye en memoria una matriz de sinergia (`engine.PokemonAnalyticsEngine`), persistiendo sinergias por pares en `synergy_data` vía `/store/synergy`.

> **Nota:** `ms_montecarlo` y `ms_asistencia` son servicios independientes que **no se llaman entre sí**; cada uno lee `external_raw` directamente desde `ms_db`. De igual forma, `ms_usuarios` no invoca a `ms_montecarlo`: es el **frontend** quien orquesta las llamadas a cada microservicio según la pantalla (Team Builder, Simulación, Asistente IA, etc.), no existe un API Gateway central.

## Patrones de diseño aplicados

### 1. Arquitectura de microservicios
Cada carpeta de nivel superior (`ms_auth`, `ms_usuarios`, `ms_pokemon`, `ms_db`, `ms_montecarlo`, `ms_carga_api`, `ms_asistencia`, `Frontend_EquipoRocket.pk`) es un servicio independiente, con su propio `docker-compose.yml`, `Dockerfile` y dependencias (`package.json` o `requirements.txt`). Se comunican por HTTP/REST sobre una red Docker compartida (`equiporocket-net`). El frontend actúa como orquestador, llamando a cada microservicio mediante su propia URL base (`VITE_MS_*_URL`).

### 2. Separación de responsabilidades (capas)
- **Servicios Node** (`ms_auth`, `ms_usuarios`, `ms_pokemon`, `ms_db`): siguen el patrón `routes → controllers → (repository →) model → config/db.js`. Las rutas exponen los endpoints HTTP, los controllers contienen la lógica de negocio/validación, los models encapsulan el acceso SQL y `config/db.js` centraliza el pool de conexión a Postgres.
- **Servicios Python** (`ms_montecarlo`, `ms_asistencia`, `ms_carga_api`): siguen el patrón `app.py` (endpoints FastAPI) → módulo de dominio (`montecarlo.py` / `simulator.py`, `engine.py`) → `api_client.py` (acceso a datos externos/DB). La lógica de simulación y análisis está desacoplada de la capa HTTP.

### 3. Patrón Repositorio
`ms_usuarios/src/repositories/teamRepository.js` implementa el patrón Repositorio: encapsula el acceso a datos de equipos (`teams`, `team_pokemon`, `team_pokemon_moves`) detrás de una interfaz propia, delegando en `models/teamModel.js`. El controller de equipos (`teamsController.js`) depende del repositorio, no de SQL crudo, lo que facilita testear o sustituir la fuente de datos. El resto de controllers de `ms_usuarios` (admin, data, user) consultan el `pool` de conexión directamente vía `query(...)` — una excepción documentada, no un patrón generalizado en todo el servicio.

## Modelo de datos

`ms_db/schema.sql` define el **modelo relacional físico** del sistema, en notación de tabla estilo "crow's foot" (claves primarias/foráneas y cardinalidades implícitas en los FK), no un DER conceptual abstracto. Puntos relevantes documentados allí y en [`ms_db/README.md`](../ms_db/README.md):

- `team_pokemon` (conceptualmente **"team_member_configuration"**): guarda la configuración completa (habilidad, item, spread, movimientos) de cada Pokémon dentro de un equipo.
- `synergy_data`: sinergia **por pares**, alimentada desde datos externos (Pikalytics) vía `ms_asistencia` — ver limitaciones en [`ms_asistencia/README.md`](../ms_asistencia/README.md).
- `battle_simulations`, `simulation_iterations`, `optimized_configurations`, `configuration_comparisons`: trazabilidad completa de cada simulación Monte Carlo (semilla, versión de algoritmo, iteraciones individuales) y de las recomendaciones generadas — ver [`ms_montecarlo/README.md`](../ms_montecarlo/README.md).
