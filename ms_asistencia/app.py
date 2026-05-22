from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
import json
from dotenv import load_dotenv
from engine import PokemonAnalyticsEngine

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
