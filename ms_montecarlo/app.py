from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import os
import json
from datetime import datetime
import psycopg2

from api_client import fetch_api, list_pokemon_entries
from montecarlo import search_best_team

app = FastAPI(title="ms_montecarlo")

# Enable CORS for local development (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulateRequest(BaseModel):
    user_id: Optional[int]
    team: List[str] = Field(..., description="Lista de nombres de los Pokémon del equipo del usuario (seed)")
    opponent: List[str] = Field(..., description="Lista de nombres del equipo rival")
    team_a_id: Optional[int] = None
    team_b_id: Optional[int] = None
    api_url: Optional[str] = None
    iterations: int = 500
    sims: int = 500


def get_db_conn():
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        # build from parts
        host = os.environ.get('PGHOST', 'localhost')
        port = os.environ.get('PGPORT', '5432')
        db = os.environ.get('PGDATABASE', 'equiporocketdb')
        user = os.environ.get('PGUSER', 'postgres')
        pwd = os.environ.get('PGPASSWORD', 'example')
        dsn = f"host={host} port={port} dbname={db} user={user} password={pwd}"
    return psycopg2.connect(dsn)


@app.post('/simulate')
def simulate(req: SimulateRequest):
    api_url = req.api_url or os.environ.get('MONTECARLO_API_URL')
    if not api_url:
        raise HTTPException(status_code=400, detail="api_url is required (or set MONTECARLO_API_URL)")

    pool = []
    # Prefer using the latest fetched payload stored in external_raw (ms_carga_api ingestion)
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT payload FROM external_raw ORDER BY fetched_at DESC LIMIT 1")
        row = cur.fetchone()
        if row and row[0]:
            try:
                print("ms_montecarlo: using pool from DB.external_raw")
                payload = row[0]
                # payload may be returned as a string or a Python dict/object
                if isinstance(payload, (str, bytes)):
                    try:
                        payload = json.loads(payload)
                    except Exception:
                        # keep as-is if cannot parse
                        pass
                pool = list_pokemon_entries(payload)
            except Exception as e:
                print(f"ms_montecarlo: failed to normalize external_raw payload: {e}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ms_montecarlo: external_raw read failed: {e}")

    # If no pool from DB, fall back to calling the configured API URL
    if not pool:
        try:
            data = fetch_api(api_url)
            pool = list_pokemon_entries(data)
        except Exception as e:
            print(f"ms_montecarlo: fetch_api failed: {e}")
            # attempt DB fallback to raw pokemon table (older behaviour)
            try:
                conn = get_db_conn()
                cur = conn.cursor()
                cur.execute("SELECT name, hp, attack, defense, sp_attack, sp_defense, speed FROM pokemon")
                rows = cur.fetchall()
                pool = []
                for r in rows:
                    pool.append({
                        'name': r[0],
                        'hp': r[1],
                        'attack': r[2],
                        'defense': r[3],
                        'sp_attack': r[4],
                        'sp_defense': r[5],
                        'speed': r[6],
                    })
                cur.close()
                conn.close()
            except Exception as db_e:
                print(f"ms_montecarlo: DB fallback failed: {db_e}")
                raise HTTPException(status_code=502, detail=f"Failed to fetch pool from API ({e}) and DB fallback failed ({db_e})")

    if not pool:
        raise HTTPException(status_code=400, detail="Pool empty from API or DB")

    # run search
    best_wr, best_team = search_best_team(
        pool,
        team_size=len(req.team),
        iterations=req.iterations,
        sims=req.sims,
        fixed_teamA_names=req.team,
        fixed_teamB_names=req.opponent,
    )

    win_rate = float(best_wr)

    # Enrich best_team entries from public PokeAPI when fields are missing
    try:
        for p in best_team:
            try:
                name = (p.get('name') or p.get('pokemon') or p.get('display_name') or '').strip().lower()
                if not name:
                    continue
                # only fetch if moves or ability missing
                need_moves = not p.get('moves')
                need_ability = not p.get('ability')
                if not need_moves and not need_ability:
                    continue
                url = f"https://pokeapi.co/api/v2/pokemon/{name}"
                try:
                    detail = fetch_api(url)
                except Exception:
                    detail = None
                if detail:
                    if need_moves:
                        moves = detail.get('moves', [])[:8]
                        # normalize to objects with 'move' key
                        p['moves'] = [{'move': m['move']['name']} for m in moves]
                    if need_ability:
                        abilities = detail.get('abilities', [])
                        if abilities:
                            p['ability'] = {'ability': abilities[0]['ability']['name']}
                    # also provide sprites for frontend
                    p['sprites'] = detail.get('sprites')
            except Exception:
                continue
    except Exception:
        pass
    team_size = max(1, len(req.team) if req.team else 1)
    # Estimate remaining pokemon counts as a simple heuristic from win_rate
    team_a_score = int(round(win_rate * team_size))
    team_b_score = int(round((1 - win_rate) * team_size))
        # team ids (may be None)
    team_a_id = getattr(req, 'team_a_id', None) if hasattr(req, 'team_a_id') else None
    team_b_id = getattr(req, 'team_b_id', None) if hasattr(req, 'team_b_id') else None
    # decide winner id if provided
    winner_team_id = None
    if team_a_id and team_b_id:
        winner_team_id = team_a_id if win_rate >= 0.5 else team_b_id

    # persist into existing battle_simulations table
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        team_a_id = getattr(req, 'team_a_id', None) if hasattr(req, 'team_a_id') else None
        team_b_id = getattr(req, 'team_b_id', None) if hasattr(req, 'team_b_id') else None
        # store probabilities as percentages (0-100)
        team_a_prob = round(win_rate * 100, 2)
        team_b_prob = round((1 - win_rate) * 100, 2)
        # compact best team summary (names) to store in prediction (varchar(255))
        try:
            best_names = [str(p.get('name') or p.get('pokemon') or p.get('display_name') or '') for p in best_team]
            best_summary = json.dumps({'best_team_names': best_names})
        except Exception:
            best_summary = f"best_win_rate={team_a_prob}%"

        cur.execute(
            """INSERT INTO battle_simulations (
                  user_id, team_a_id, team_b_id, winner_team_id, team_a_score, team_b_score, team_a_win_probability, team_b_win_probability,
                  simulation_count, simulation_type, prediction, created_at, completed_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) RETURNING id""",
            [
                req.user_id,
                team_a_id,
                team_b_id,
                winner_team_id,
                team_a_score,
                team_b_score,
                team_a_prob,
                team_b_prob,
                req.iterations,
                'montecarlo',
                best_summary,
            ],
        )
        sim_id = cur.fetchone()[0]

        # Optionally persist best configuration into optimized_configurations in a later step
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")

    # Return only the best configuration as requested by the frontend
    # Prepare simplified best_team for response: strings for item/ability/moves and include sprites
    def simplify_entry(p):
        name = p.get('name') or p.get('pokemon') or p.get('display_name') or ''
        # item may be object like {'item': 'x'} or {'name': 'x'} or a string
        item = p.get('item')
        if isinstance(item, dict):
            item = item.get('item') or item.get('name') or None
        ability = p.get('ability')
        if isinstance(ability, dict):
            ability = ability.get('ability') or ability.get('name') or None
        moves = p.get('moves') or []
        moves_list = []
        if isinstance(moves, list):
            for m in moves:
                if isinstance(m, dict):
                    moves_list.append(m.get('move') or m.get('name') or str(m))
                else:
                    moves_list.append(str(m))
        sprites = p.get('sprites')
        return {
            'name': name,
            'item': item,
            'ability': ability,
            'moves': moves_list,
            'sprites': sprites,
        }

    simplified_best = [simplify_entry(p) for p in (best_team or [])]

    # Return top-level shape: win_rate as percentage and simplified best_team
    return {"success": True, "simulation_id": sim_id, "win_rate": team_a_prob, "best_team": simplified_best}
