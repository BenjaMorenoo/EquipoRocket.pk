# ms_montecarlo

Microservicio FastAPI (Python) que ejecuta la simulación Monte Carlo de combates Pokémon
y persiste resultados y recomendaciones en la base de datos PostgreSQL de `ms_db`.

## Resumen rápido
- Endpoint principal: `POST /simulate`
- Endpoint auxiliar: `POST /persist_best`
- Puerto por defecto: `8010`

## Variables de entorno
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (o `DATABASE_URL`) — conexión a PostgreSQL.
- `MONTECARLO_API_URL` — URL de la API externa (Pikalytics) usada como respaldo si `external_raw` está vacío.

## Build & run (local)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8010
```

## POST /simulate

### Request

```json
{
  "user_id": 1,
  "team": ["Pikachu", "Charizard", "Gengar"],
  "opponent": ["Garchomp", "Tyranitar", "Metagross"],
  "team_a_id": 10,
  "team_b_id": null,
  "persist_moves": false,
  "iterations": 1000,
  "sims": 500,
  "random_seed": null
}
```

- `team` / `opponent`: nombres de los Pokémon de cada equipo.
- `iterations`: número de configuraciones candidatas que se generan y evalúan, **para cada equipo por separado** (búsqueda Monte Carlo independiente para `team` y para `opponent`, cada uno contra el config-default fijo del otro).
- `sims`: número de combates individuales simulados para evaluar cada configuración candidata. La configuración ganadora del equipo propio (`team`) queda registrada combate por combate en `simulation_iterations` (ver más abajo).
- `random_seed` (opcional): si se entrega, se usa como base para derivar las semillas de ambas búsquedas. Si se omite, cada búsqueda deriva su semilla **determinísticamente** (hash SHA-256) de `(equipo a optimizar, equipo rival, iterations, sims)`, en ese orden. Esto da dos garantías:
  - **Reproducibilidad**: la misma combinación de equipos y parámetros siempre produce el mismo `win_rate` y el mismo `best_team`, sin que el frontend tenga que generar/enviar semillas.
  - **Intercambio invertido**: si en otra request se intercambian `team` ↔ `opponent`, la búsqueda de `team` de una request es exactamente la búsqueda de `opponent` de la otra (misma semilla, mismo resultado), por lo que `team_a_win_probability`/`team_b_win_probability` salen exactamente intercambiados entre ambas requests. La semilla de la búsqueda de `team` se persiste en `battle_simulations.random_seed`.

### Qué hace internamente

1. Carga el "pool" de Pokémon desde la fila más reciente de `external_raw` (o desde la API externa configurada si la tabla está vacía).
2. `montecarlo.search_best_team(...)` se ejecuta **dos veces, de forma independiente**:
   - Una vez optimizando `team`: genera `iterations` configuraciones candidatas y, para cada una, llama a `montecarlo.evaluate_team(...)`, que simula `sims` combates (`simulator.simulate_battle`) contra el config-default fijo de `opponent` y devuelve `(win_rate, iterations)`.
   - Otra vez optimizando `opponent` contra el config-default fijo de `team`, de la misma forma.
3. De la búsqueda de `team` se conserva la configuración con mayor `win_rate` (`best_team`), junto con el detalle de sus `sims` combates individuales (`best_iterations`). El `win_rate` de la búsqueda de `opponent` se usa solo para `team_b_win_probability`/`team_b_score`.
4. Se inserta una fila en `battle_simulations` con:
   - `team_a_score` / `team_b_score`: estimación de Pokémon restantes según el win rate de cada equipo.
   - `team_a_win_probability` / `team_b_win_probability`: win rate en % de la búsqueda de `team` y de `opponent` respectivamente — son resultados **independientes**, no `team_b = 100 - team_a`.
   - `simulation_count`: número de combates individuales simulados para `best_team` (= `sims`).
   - `random_seed` y `algorithm_version`: semilla de la búsqueda de `team` y versión del algoritmo, para trazabilidad y reproducibilidad.
5. Se insertan `sims` filas en `simulation_iterations` (una por cada combate individual de `best_team`), cada una con el ganador (`A` o `B`) de esa iteración.

> **Nota de rendimiento**: al correr una búsqueda por cada equipo, cada `/simulate` ejecuta `2 × iterations × sims` combates en total (el doble que antes de esta corrección).
6. Si `team_a_id` está presente, por cada Pokémon de `best_team`:
   - Se inserta una recomendación en `optimized_configurations` (habilidad, item y movimientos recomendados).
   - Se inserta en `configuration_comparisons` la variante `original` (la configuración recomendada) más 1-2 variantes alternativas (`alt_item_1`, `alt_spread_1`), generadas y re-evaluadas con una muestra reducida de combates (`min(sims, 100)`), para poder comparar el win rate de la recomendación contra alternativas y justificarla.
7. Si `persist_moves=true` y `team_a_id` está presente, se actualizan `team_pokemon` / `team_pokemon_moves` con la configuración recomendada.

### Response

```json
{
  "success": true,
  "simulation_id": 123,
  "win_rate": 62.4,
  "best_team": [
    { "name": "Pikachu", "item": "Light Ball", "ability": "Static", "moves": ["Thunderbolt", "Iron Tail"], "sprites": {} }
  ]
}
```

## POST /persist_best

Permite persistir manualmente un `best_team` (enviado desde el frontend) hacia `team_pokemon` / `team_pokemon_moves`, sin pasar por `/simulate`.

```json
{ "team_id": 10, "best_team": [ { "name": "Pikachu", "item": "Light Ball", "ability": "Static", "moves": ["Thunderbolt"] } ] }
```

## Trazabilidad de simulaciones (corrección del modelo de datos)

Para responder a la pregunta "¿dónde están las iteraciones individuales de Monte Carlo?",
cada simulación queda completamente trazada en las siguientes tablas de `ms_db/schema.sql`:

| Tabla | Contenido |
|---|---|
| `battle_simulations` | Resultado agregado de la simulación: win rate, semilla (`random_seed`), versión del algoritmo (`algorithm_version`) y número de combates simulados (`simulation_count`). |
| `simulation_iterations` | Una fila por cada combate individual simulado (1..`simulation_count`), con el ganador de esa iteración. |
| `optimized_configurations` | Recomendación final (habilidad/item/movimientos) por cada Pokémon del equipo. |
| `configuration_comparisons` | Variantes de configuración evaluadas (`original`, `alt_item_1`, `alt_spread_1`, ...) con su win rate, que justifican la recomendación anterior. |

Ver también [`docs/ARQUITECTURA.md`](../docs/ARQUITECTURA.md) para el diagrama general de la arquitectura.
