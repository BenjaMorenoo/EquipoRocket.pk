# ms_asistencia

FastAPI microservice que proporciona recomendaciones inteligentes para construir equipos Pokémon competitivos, basadas en datos estadísticos reales de Pikalytics.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio |
| POST | `/analyze/team` | Calcula la sinergia de un equipo existente |
| POST | `/recommend/teammate` | Recomienda el mejor compañero para un equipo en construcción |
| POST | `/recommend/build` | Recomienda ítem, habilidad, naturaleza y movimientos para un Pokémon |
| POST | `/store/synergy` | Persiste la sinergia de un equipo en `synergy_data` |
| POST | `/reload` | Fuerza recarga de datos desde la base de datos |

**Ejemplos de payload:**
```json
POST /analyze/team    → { "team": ["flutter-mane", "iron-hands", "rillaboom"] }
POST /recommend/teammate → { "team": ["flutter-mane"], "top_n": 3 }
POST /recommend/build → { "name": "flutter-mane" }
```

---

## Variables de entorno

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `PGHOST` | `localhost` | Host de PostgreSQL |
| `PGPORT` | `5432` | Puerto de PostgreSQL |
| `PGUSER` | `postgres` | Usuario de la base de datos |
| `PGPASSWORD` | — | Contraseña de la base de datos |
| `DB_NAME` | `equiporocketDb` | Nombre de la base de datos |

---

## Build & Run

**Local:**
```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app:app --reload --port 8005
```

**Docker:**
```bash
docker build -t ms_asistencia:local .
docker run -e PGHOST=host.docker.internal -e PGPASSWORD=... -p 8005:8005 ms_asistencia:local
```

---

## Cómo funciona el motor de asistencia

### Explicación técnica

El motor (`engine.py`, clase `PokemonAnalyticsEngine`) se inicializa con el payload más reciente de la tabla `external_raw`, que proviene de Pikalytics y contiene estadísticas de uso real de la comunidad competitiva.

#### 1. Normalización de nombres

Antes de cualquier operación, todos los nombres de Pokémon pasan por `_norm()`:

```python
def _norm(name):
    return (name or '').lower().replace('-', ' ').strip()
```

Esto hace que `"flutter-mane"`, `"Flutter Mane"` y `"flutter mane"` resuelvan al mismo identificador (`"flutter mane"`), eliminando discrepancias entre los nombres que usa Pikalytics, los que almacena la base de datos y los que envía el frontend.

#### 2. Construcción de la matriz de sinergia (`_build_synergy_matrix`)

Para cada Pokémon en el dataset, Pikalytics incluye un campo `team` con la lista de compañeros más frecuentes y el porcentaje de veces que aparecen juntos. El motor recorre todos los pares `(source → target, percent)` y construye una **matriz de co-ocurrencia direccional** usando `pandas.DataFrame.pivot`:

```
synergy_matrix[A][B] = porcentaje con que B aparece en equipos que tienen A / 100
```

La matriz es **asimétrica** por naturaleza: que A aparezca junto a B el 30% de las veces no implica que B aparezca junto a A el 30% de las veces (depende de cuánto se usa cada uno).

#### 3. Score de un par (`_pair_score`)

Para calcular la sinergia entre dos Pokémon se promedian **ambas direcciones**:

```
score(A, B) = (matrix[A][B] + matrix[B][A]) / 2
```

Si solo existe una dirección, se usa ese valor solo. Si ninguno de los dos aparece en la matriz (Pokémon no registrado en Pikalytics), el par devuelve `None` y se **excluye del promedio** del equipo — no se cuenta como 0 para no penalizar equipos con Pokémon menos populares.

#### 4. Sinergia de equipo completo (`analyze_team_synergy`)

Se calculan todos los pares posibles `(i, j)` del equipo y se promedia el score de los pares conocidos:

```
synergy_percent = mean([score(poke_i, poke_j) for all i < j]) × 100
```

Un equipo de 6 Pokémon tiene 15 pares posibles. Solo los pares con datos reales contribuyen al promedio.

#### 5. Recomendación de compañero (`recommend_teammate`)

Para cada candidato en el dataset se calcula el promedio de su sinergia con todos los miembros actuales del equipo. Los `top_n` candidatos con mayor promedio son devueltos como recomendaciones.

#### 6. Construcción greedy de equipo (`_build_greedy_team`)

Dado un Pokémon semilla, el motor construye el equipo completo paso a paso: en cada paso selecciona el candidato con el mayor promedio de sinergia con los miembros ya elegidos. Esto produce un equipo localmente óptimo sin exploración exhaustiva.

#### 7. Recomendación de build (`recommend_build`)

Devuelve el ítem, habilidad, naturaleza/EVs y movimientos más usados por ese Pokémon en el dataset de Pikalytics (ordenados por campo `percent` descendente).

---

### Explicación para cualquiera

Imagina que quieres armar el mejor equipo Pokémon posible. ¿Cómo sabes qué Pokémon funcionan bien juntos?

**El motor usa estadísticas reales** de la comunidad competitiva. Pikalytics recopila datos de millones de partidas y registra, para cada Pokémon, con qué compañeros de equipo aparece más seguido. Si Flutter Mane aparece en el mismo equipo que Iron Hands el 45% de las veces, eso nos dice que esta combinación es popular y probablemente efectiva.

**El porcentaje de sinergia** que ves en la app es básicamente eso: ¿qué tan seguido los jugadores expertos usan estos Pokémon juntos? Un 40% significa que el 40% de los equipos con Pokémon A también tienen a Pokémon B.

**¿Por qué promediar dos direcciones?** Si A usa mucho a B pero B no siempre usa A (porque B es tan versátil que va con todos), el número honesto está en el medio. El motor suma los dos porcentajes y divide entre dos para ser justo con ambos.

**¿Por qué ignorar los pares sin datos?** Si tienes un Pokémon raro que Pikalytics no registra, no hay forma de saber si tiene buena o mala sinergia. En vez de asumir que es mala (dando 0%), el motor simplemente no lo cuenta. Así el porcentaje de sinergia del equipo refleja solo lo que realmente se conoce.

**El constructor asistido** usa esta lógica para recomendarte: dado tu equipo parcial, ¿qué Pokémon complementaría mejor a los que ya tienes según los datos reales de la comunidad? Y cuando generas un equipo completo desde cero, el motor elige uno por uno al compañero que mejor se lleva con los ya elegidos, garantizando que el resultado sea el equipo de mayor sinergia alcanzable con los datos disponibles.

---

## Origen y limitaciones de los datos de sinergia

- **Fuente**: `external_raw.payload` cargado por `ms_carga_api` desde Pikalytics. Sin datos cargados, el motor no tiene información y devolverá sinergias vacías.
- **Co-ocurrencia, no análisis de tipos**: `synergy_percent` mide frecuencia de aparición conjunta en partidas reales, no una fórmula de ventajas/desventajas de tipo.
- **Pares solamente**: `synergy_data` (tabla en DB) guarda sinergia par a par. La sinergia de un equipo completo se calcula en memoria por `analyze_team_synergy` y no depende de que esa tabla esté poblada.
- **Meta-dependiente**: los datos reflejan el meta actual en el momento de la última carga. Si el meta cambia, hay que recargar via `POST /reload` o reiniciar el servicio.
