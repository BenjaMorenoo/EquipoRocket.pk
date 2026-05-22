from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
import json
from dotenv import load_dotenv
from engine import PokemonAnalyticsEngine
from typing import Optional

load_dotenv()

DB_HOST = os.getenv('PGHOST', 'localhost')
DB_PORT = int(os.getenv('PGPORT', 5432))
DB_USER = os.getenv('PGUSER', 'postgres')
DB_PASSWORD = os.getenv('PGPASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'equiporocketDb')

app = FastAPI(title='ms_asistencia')

# Allow CORS for frontend (vite dev server). Adjust origins as needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TeamRequest(BaseModel):
    team: list
    top_n: int = 3

class NameRequest(BaseModel):
    name: str


class BuildsRequest(BaseModel):
    seeds: list[str] | None = None
    top_k: int = 3
    team_size: int = 6


class StoreSynergyRequest(BaseModel):
    team: list[str]
    format_id: Optional[int] = None

_engine = None
_raw_loaded_id = None


def get_conn():
    return psycopg2.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME)


def load_latest_external_raw():
    global _engine, _raw_loaded_id
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, payload FROM external_raw ORDER BY fetched_at DESC LIMIT 1;")
            row = cur.fetchone()
            if not row:
                raise Exception('No external_raw rows')
            rid, payload = row[0], row[1]
            if _raw_loaded_id == rid and _engine is not None:
                return _engine
            # payload is JSONB already parsed by psycopg2
            engine = PokemonAnalyticsEngine(payload)
            _engine = engine
            _raw_loaded_id = rid
            return engine
    finally:
        conn.close()


@app.get('/health')
async def health():
    try:
        conn = get_conn()
        conn.close()
        return {'status': 'ok'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/analyze/team')
async def analyze_team(req: TeamRequest):
    engine = load_latest_external_raw()
    return engine.analyze_team_synergy(req.team)


@app.post('/recommend/teammate')
async def recommend_teammate(req: TeamRequest):
    engine = load_latest_external_raw()
    return engine.recommend_teammate(req.team, top_n=req.top_n)


@app.post('/recommend/build')
async def recommend_build(req: NameRequest):
    engine = load_latest_external_raw()
    return engine.recommend_build(req.name)


@app.post('/recommend/builds')
async def recommend_builds(req: BuildsRequest):
    engine = load_latest_external_raw()
    return engine.recommend_teams(seeds=req.seeds or [], top_k=req.top_k, team_size=req.team_size)


@app.post('/store/synergy')
async def store_synergy(req: StoreSynergyRequest):
    """Compute pairwise synergy for a provided team and persist into `synergy_data`.

    The endpoint resolves pokemon names to `pokemon.id` in the database and inserts
    one row per unordered pair (pokemon_id, teammate_pokemon_id) with the measured
    `synergy_percent`. Pairs with unresolved pokemon names are skipped.
    """
    engine = load_latest_external_raw()
    team = req.team or []
    if len(team) < 2:
        raise HTTPException(status_code=400, detail='Se requieren al menos 2 Pokémon para almacenar sinergia')

    # compute pairwise scores reusing engine logic
    pairs = []
    for i, poke1 in enumerate(team):
        for poke2 in team[i+1:]:
            try:
                if poke1 in engine.synergy_matrix.index and poke2 in engine.synergy_matrix.columns:
                    score = float(engine.synergy_matrix.at[poke1, poke2])
                elif poke2 in engine.synergy_matrix.index and poke1 in engine.synergy_matrix.columns:
                    score = float(engine.synergy_matrix.at[poke2, poke1])
                else:
                    score = 0.0
            except Exception:
                score = 0.0
            pairs.append({'a': poke1, 'b': poke2, 'score': round(score * 100.0, 2)})

    if not pairs:
        return {'inserted': 0, 'skipped': 0, 'pairs': []}

    conn = get_conn()
    inserted = 0
    skipped = 0
    inserted_rows = []
    try:
        with conn:
            with conn.cursor() as cur:
                for p in pairs:
                    # resolve pokemon ids (case-insensitive)
                    cur.execute("SELECT id FROM pokemon WHERE lower(name)=lower(%s) LIMIT 1", (p['a'],))
                    row_a = cur.fetchone()
                    cur.execute("SELECT id FROM pokemon WHERE lower(name)=lower(%s) LIMIT 1", (p['b'],))
                    row_b = cur.fetchone()
                    if not row_a or not row_b:
                        skipped += 1
                        continue
                    id_a = row_a[0]
                    id_b = row_b[0]
                    # ensure canonical order for lookup
                    a_id = id_a if id_a <= id_b else id_b
                    b_id = id_b if id_b >= id_a else id_a
                    # Try to find existing row (either order) for same format (handle NULLs)
                    cur.execute(
                        "SELECT id FROM synergy_data WHERE ((pokemon_id=%s AND teammate_pokemon_id=%s) OR (pokemon_id=%s AND teammate_pokemon_id=%s)) AND ((format_id IS NULL AND %s IS NULL) OR format_id = %s) LIMIT 1",
                        (a_id, b_id, b_id, a_id, req.format_id, req.format_id)
                    )
                    existing = cur.fetchone()
                    if existing:
                        cur.execute("UPDATE synergy_data SET synergy_percent=%s WHERE id=%s", (p['score'], existing[0]))
                    else:
                        cur.execute(
                            "INSERT INTO synergy_data (pokemon_id, teammate_pokemon_id, format_id, synergy_percent) VALUES (%s,%s,%s,%s)",
                            (a_id, b_id, req.format_id, p['score'])
                        )
                    inserted += 1
                    inserted_rows.append({'pokemon_id': id_a, 'teammate_pokemon_id': id_b, 'synergy_percent': p['score']})
        return {'inserted': inserted, 'skipped': skipped, 'pairs': inserted_rows}
    finally:
        conn.close()


@app.post('/reload')
async def reload_data():
    try:
        engine = load_latest_external_raw()
        return {'reloaded': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# if run directly
if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app:app', host='0.0.0.0', port=8005, reload=True)
