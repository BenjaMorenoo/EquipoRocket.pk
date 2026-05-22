from fastapi import FastAPI, HTTPException, Body
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
    persist_moves: bool = False
    iterations: int = 1000
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
        # Insert optimized configuration recommendations per team_pokemon (if team_a_id provided)
        try:
            if getattr(req, 'team_a_id', None):
                conn2 = get_db_conn()
                cur2 = conn2.cursor()

                def _get_or_create_move_id(name):
                    if not name:
                        return None
                    cur2.execute("SELECT id FROM moves WHERE lower(name)=lower(%s) LIMIT 1", (name,))
                    r = cur2.fetchone()
                    if r:
                        return r[0]
                    cur2.execute("INSERT INTO moves (name) VALUES (%s) RETURNING id", (name,))
                    return cur2.fetchone()[0]

                def _get_or_create_ability_id(name):
                    if not name:
                        return None
                    cur2.execute("SELECT id FROM abilities WHERE lower(name)=lower(%s) LIMIT 1", (name,))
                    r = cur2.fetchone()
                    if r:
                        return r[0]
                    cur2.execute("INSERT INTO abilities (name) VALUES (%s) RETURNING id", (name,))
                    return cur2.fetchone()[0]

                def _get_or_create_item_id(name):
                    if not name:
                        return None
                    cur2.execute("SELECT id FROM items WHERE lower(name)=lower(%s) LIMIT 1", (name,))
                    r = cur2.fetchone()
                    if r:
                        return r[0]
                    cur2.execute("INSERT INTO items (name) VALUES (%s) RETURNING id", (name,))
                    return cur2.fetchone()[0]

                def _find_or_create_team_pokemon(team_id, pokemon_name):
                    cur2.execute("SELECT id FROM pokemon WHERE lower(name)=lower(%s) LIMIT 1", (pokemon_name,))
                    p = cur2.fetchone()
                    if not p:
                        return None
                    pokemon_id = p[0]
                    cur2.execute("SELECT id FROM team_pokemon WHERE team_id=%s AND pokemon_id=%s LIMIT 1", (team_id, pokemon_id))
                    r = cur2.fetchone()
                    if r:
                        return r[0]
                    cur2.execute("SELECT COALESCE(MAX(slot),0)+1 FROM team_pokemon WHERE team_id=%s", (team_id,))
                    slot = cur2.fetchone()[0]
                    cur2.execute("INSERT INTO team_pokemon (team_id, pokemon_id, slot) VALUES (%s,%s,%s) RETURNING id", (team_id, pokemon_id, slot))
                    return cur2.fetchone()[0]

                for p in best_team:
                    try:
                        name = (p.get('name') or p.get('pokemon') or p.get('display_name') or '').strip()
                        if not name:
                            continue
                        tp_id = _find_or_create_team_pokemon(req.team_a_id, name)
                        if not tp_id:
                            continue
                        # ability / item
                        ability_name = None
                        a = p.get('ability')
                        if isinstance(a, dict):
                            ability_name = a.get('ability') or a.get('name')
                        elif isinstance(a, str):
                            ability_name = a
                        ability_id = _get_or_create_ability_id(ability_name)

                        item_name = None
                        it = p.get('item')
                        if isinstance(it, dict):
                            item_name = it.get('item') or it.get('name')
                        elif isinstance(it, str):
                            item_name = it
                        item_id = _get_or_create_item_id(item_name)

                        # moves: convert to move ids
                        moves = p.get('moves') or []
                        move_ids = []
                        for m in moves:
                            move_name = None
                            if isinstance(m, dict):
                                move_name = m.get('move') or m.get('name')
                            else:
                                move_name = str(m)
                            mid = _get_or_create_move_id(move_name)
                            if mid:
                                move_ids.append(mid)

                        # Insert optimized_configurations row
                        cur2.execute(
                            "INSERT INTO optimized_configurations (battle_simulation_id, team_pokemon_id, recommended_ability_id, recommended_item_id, recommended_moves, win_rate_improvement, confidence_score, created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,NOW())",
                            [sim_id, tp_id, ability_id, item_id, json.dumps(move_ids), None, None],
                        )
                    except Exception:
                        continue

                conn2.commit()
                cur2.close()
                conn2.close()
        except Exception as e:
            print(f"ms_montecarlo: optimized_configurations insert failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")

    # Optionally persist best moves/ability/item into team tables
    if getattr(req, 'persist_moves', False) and getattr(req, 'team_a_id', None):
        try:
            conn = get_db_conn()
            cur = conn.cursor()

            def get_or_create_ability(name):
                if not name:
                    return None
                cur.execute("SELECT id FROM abilities WHERE lower(name)=lower(%s) LIMIT 1", (name,))
                r = cur.fetchone()
                if r:
                    return r[0]
                cur.execute("INSERT INTO abilities (name) VALUES (%s) RETURNING id", (name,))
                return cur.fetchone()[0]

            def get_or_create_item(name):
                if not name:
                    return None
                cur.execute("SELECT id FROM items WHERE lower(name)=lower(%s) LIMIT 1", (name,))
                r = cur.fetchone()
                if r:
                    return r[0]
                cur.execute("INSERT INTO items (name) VALUES (%s) RETURNING id", (name,))
                return cur.fetchone()[0]

            def get_or_create_move(name):
                if not name:
                    return None
                cur.execute("SELECT id FROM moves WHERE lower(name)=lower(%s) LIMIT 1", (name,))
                r = cur.fetchone()
                if r:
                    return r[0]
                cur.execute("INSERT INTO moves (name) VALUES (%s) RETURNING id", (name,))
                return cur.fetchone()[0]

            def find_team_pokemon(team_id, pokemon_name):
                cur.execute("SELECT id, pokemon_id FROM pokemon WHERE lower(name)=lower(%s) LIMIT 1", (pokemon_name,))
                p = cur.fetchone()
                if not p:
                    return None
                pokemon_id = p[0]
                # try to find existing team_pokemon
                cur.execute("SELECT id FROM team_pokemon WHERE team_id=%s AND pokemon_id=%s LIMIT 1", (req.team_a_id, pokemon_id))
                r = cur.fetchone()
                if r:
                    return r[0]
                # create team_pokemon in next slot
                cur.execute("SELECT COALESCE(MAX(slot),0)+1 FROM team_pokemon WHERE team_id=%s", (req.team_a_id,))
                slot = cur.fetchone()[0]
                cur.execute("INSERT INTO team_pokemon (team_id, pokemon_id, slot) VALUES (%s,%s,%s) RETURNING id", (req.team_a_id, pokemon_id, slot))
                return cur.fetchone()[0]

            for p in best_team:
                try:
                    name = (p.get('name') or p.get('pokemon') or p.get('display_name') or '').strip()
                    if not name:
                        continue
                    tp_id = find_team_pokemon(req.team_a_id, name)
                    if not tp_id:
                        continue
                    # ability
                    ability_name = None
                    a = p.get('ability')
                    if isinstance(a, dict):
                        ability_name = a.get('ability') or a.get('name')
                    elif isinstance(a, str):
                        ability_name = a
                    ability_id = get_or_create_ability(ability_name)
                    if ability_id:
                        cur.execute("UPDATE team_pokemon SET ability_id=%s WHERE id=%s", (ability_id, tp_id))
                    # item
                    item_name = None
                    it = p.get('item')
                    if isinstance(it, dict):
                        item_name = it.get('item') or it.get('name')
                    elif isinstance(it, str):
                        item_name = it
                    item_id = get_or_create_item(item_name)
                    if item_id:
                        cur.execute("UPDATE team_pokemon SET item_id=%s WHERE id=%s", (item_id, tp_id))
                    # moves
                    moves = p.get('moves') or []
                    for idx, m in enumerate(moves):
                        move_name = None
                        if isinstance(m, dict):
                            move_name = m.get('move') or m.get('name')
                        else:
                            move_name = str(m)
                        move_id = get_or_create_move(move_name)
                        if move_id:
                            try:
                                cur.execute("INSERT INTO team_pokemon_moves (team_pokemon_id, move_id, slot) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (tp_id, move_id, idx+1))
                            except Exception:
                                pass
                except Exception:
                    continue

            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"ms_montecarlo: persist_moves failed: {e}")

    
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



@app.post('/persist_best')
def persist_best(payload: Any = Body(...)):
    """Persist a best_team sent from frontend into team_pokemon / team_pokemon_moves.
    Expects JSON: { team_id: int, best_team: [ { name, item, ability, moves } ], user_id?: int }
    """
    try:
        team_id = payload.get('team_id')
        best_team = payload.get('best_team') or []
        if not team_id or not isinstance(best_team, list):
            raise HTTPException(status_code=400, detail='team_id and best_team required')
        conn = get_db_conn()
        cur = conn.cursor()

        def get_or_create_ability(name):
            if not name:
                return None
            cur.execute("SELECT id FROM abilities WHERE lower(name)=lower(%s) LIMIT 1", (name,))
            r = cur.fetchone()
            if r:
                return r[0]
            cur.execute("INSERT INTO abilities (name) VALUES (%s) RETURNING id", (name,))
            return cur.fetchone()[0]

        def get_or_create_item(name):
            if not name:
                return None
            cur.execute("SELECT id FROM items WHERE lower(name)=lower(%s) LIMIT 1", (name,))
            r = cur.fetchone()
            if r:
                return r[0]
            cur.execute("INSERT INTO items (name) VALUES (%s) RETURNING id", (name,))
            return cur.fetchone()[0]

        def get_or_create_move(name):
            if not name:
                return None
            cur.execute("SELECT id FROM moves WHERE lower(name)=lower(%s) LIMIT 1", (name,))
            r = cur.fetchone()
            if r:
                return r[0]
            cur.execute("INSERT INTO moves (name) VALUES (%s) RETURNING id", (name,))
            return cur.fetchone()[0]

        def find_or_create_team_pokemon(team_id, pokemon_name):
            cur.execute("SELECT id FROM pokemon WHERE lower(name)=lower(%s) LIMIT 1", (pokemon_name,))
            p = cur.fetchone()
            if not p:
                return None
            pokemon_id = p[0]
            cur.execute("SELECT id FROM team_pokemon WHERE team_id=%s AND pokemon_id=%s LIMIT 1", (team_id, pokemon_id))
            r = cur.fetchone()
            if r:
                return r[0]
            cur.execute("SELECT COALESCE(MAX(slot),0)+1 FROM team_pokemon WHERE team_id=%s", (team_id,))
            slot = cur.fetchone()[0]
            cur.execute("INSERT INTO team_pokemon (team_id, pokemon_id, slot) VALUES (%s,%s,%s) RETURNING id", (team_id, pokemon_id, slot))
            return cur.fetchone()[0]

        for p in best_team:
            try:
                name = (p.get('name') or p.get('pokemon') or p.get('display_name') or '').strip()
                if not name:
                    continue
                tp_id = find_or_create_team_pokemon(team_id, name)
                if not tp_id:
                    continue
                # ability
                ability_name = None
                a = p.get('ability')
                if isinstance(a, dict):
                    ability_name = a.get('ability') or a.get('name')
                elif isinstance(a, str):
                    ability_name = a
                ability_id = get_or_create_ability(ability_name)
                if ability_id:
                    cur.execute("UPDATE team_pokemon SET ability_id=%s WHERE id=%s", (ability_id, tp_id))
                # item
                item_name = None
                it = p.get('item')
                if isinstance(it, dict):
                    item_name = it.get('item') or it.get('name')
                elif isinstance(it, str):
                    item_name = it
                item_id = get_or_create_item(item_name)
                if item_id:
                    cur.execute("UPDATE team_pokemon SET item_id=%s WHERE id=%s", (item_id, tp_id))
                # moves
                moves = p.get('moves') or []
                for idx, m in enumerate(moves):
                    move_name = None
                    if isinstance(m, dict):
                        move_name = m.get('move') or m.get('name')
                    else:
                        move_name = str(m)
                    move_id = get_or_create_move(move_name)
                    if move_id:
                        try:
                            cur.execute("INSERT INTO team_pokemon_moves (team_pokemon_id, move_id, slot) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING", (tp_id, move_id, idx+1))
                        except Exception:
                            pass
            except Exception:
                continue

        conn.commit()
        cur.close()
        conn.close()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"persist_best failed: {e}")
