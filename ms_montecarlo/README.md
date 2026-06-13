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
- `iterations`: número de configuraciones candidatas que se generan y evalúan para el equipo propio (búsqueda Monte Carlo).
- `sims`: número de combates individuales simulados para evaluar cada configuración candidata. La configuración ganadora queda registrada combate por combate en `simulation_iterations` (ver más abajo).
- `random_seed` (opcional): si se entrega, la corrida es reproducible (misma semilla ⇒ mismos resultados). Si se omite, se genera una semilla aleatoria que se persiste junto con el resultado.

### Qué hace internamente

1. Carga el "pool" de Pokémon desde la fila más reciente de `external_raw` (o desde la API externa configurada si la tabla está vacía).
2. `montecarlo.search_best_team(...)` genera `iterations` configuraciones candidatas para el equipo propio y, para cada una, llama a `montecarlo.evaluate_team(...)`, que simula `sims` combates (`simulator.simulate_battle`) contra el equipo rival y devuelve `(win_rate, iterations)`.
3. Se conserva la configuración con mayor `win_rate` (`best_team`), junto con el detalle de sus `sims` combates individuales (`best_iterations`).
4. Se inserta una fila en `battle_simulations` con:
   - `team_a_score` / `team_b_score`: estimación de Pokémon restantes según el win rate.
   - `team_a_win_probability` / `team_b_win_probability`: win rate en %.
   - `simulation_count`: número de combates individuales simulados para `best_team` (= `sims`).
   - `random_seed` y `algorithm_version`: semilla usada y versión del algoritmo, para trazabilidad y reproducibilidad.
5. Se insertan `sims` filas en `simulation_iterations` (una por cada combate individual de `best_team`), cada una con el ganador (`A` o `B`) de esa iteración.
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
