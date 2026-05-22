from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import os
import json
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv('PGHOST', 'localhost')
DB_PORT = int(os.getenv('PGPORT', 5432))
DB_USER = os.getenv('PGUSER', 'postgres')
DB_PASSWORD = os.getenv('PGPASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'equiporocketDb')

DEFAULT_API_URL = os.getenv('API_URL')

app = FastAPI(title='ms_carga_api')


class LoadRequest(BaseModel):
    url: str | None = None


def get_conn(db: str = None):
    dbname = db or DB_NAME
    return psycopg2.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=dbname)


def ensure_raw_table(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS external_raw (
                id SERIAL PRIMARY KEY,
                source_url TEXT,
                payload JSONB,
                fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
            """
        )
    conn.commit()


def insert_raw(conn, url, payload):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO external_raw (source_url, payload) VALUES (%s, %s) RETURNING id;", (url, Json(payload)))
        rid = cur.fetchone()[0]
    conn.commit()
    return rid


def upsert_type(conn, name, color=None):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO types (name, color) VALUES (%s, %s) ON CONFLICT (name) DO UPDATE SET color = COALESCE(EXCLUDED.color, types.color) RETURNING id;", (name, color))
        return cur.fetchone()[0]


def upsert_ability(conn, name, description=None):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO abilities (name, description) VALUES (%s, %s) ON CONFLICT (name) DO UPDATE SET description = COALESCE(EXCLUDED.description, abilities.description) RETURNING id;", (name, description))
        return cur.fetchone()[0]


def upsert_item(conn, name, name_us=None, sprite_url=None):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO items (name, name_us, sprite_url) VALUES (%s, %s, %s) ON CONFLICT (name) DO UPDATE SET name_us = COALESCE(EXCLUDED.name_us, items.name_us), sprite_url = COALESCE(EXCLUDED.sprite_url, items.sprite_url) RETURNING id;", (name, name_us, sprite_url))
        return cur.fetchone()[0]


def upsert_move(conn, name, type_name=None, category=None, power=None, pp=None):
    type_id = None
    if type_name:
        type_id = upsert_type(conn, type_name)
    with conn.cursor() as cur:
        cur.execute("INSERT INTO moves (name, type_id, category, power, pp) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (name) DO UPDATE SET type_id = COALESCE(EXCLUDED.type_id, moves.type_id), category = COALESCE(EXCLUDED.category, moves.category), power = COALESCE(EXCLUDED.power, moves.power), pp = COALESCE(EXCLUDED.pp, moves.pp) RETURNING id;", (name, type_id, category, power, pp))
        return cur.fetchone()[0]


def add_pokemon_type(conn, pokemon_id, type_id, slot=None):
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pokemon_types WHERE pokemon_id=%s AND type_id=%s", (pokemon_id, type_id))
        if cur.fetchone():
            return False
        cur.execute("INSERT INTO pokemon_types (pokemon_id, type_id, slot) VALUES (%s,%s,%s);", (pokemon_id, type_id, slot))
    conn.commit()
    return True


def add_pokemon_ability(conn, pokemon_id, ability_id, is_hidden=False):
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pokemon_abilities WHERE pokemon_id=%s AND ability_id=%s", (pokemon_id, ability_id))
        if cur.fetchone():
            return False
        cur.execute("INSERT INTO pokemon_abilities (pokemon_id, ability_id, is_hidden) VALUES (%s,%s,%s);", (pokemon_id, ability_id, is_hidden))
    conn.commit()
    return True


def add_pokemon_move(conn, pokemon_id, move_id):
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pokemon_moves WHERE pokemon_id=%s AND move_id=%s", (pokemon_id, move_id))
        if cur.fetchone():
            return False
        cur.execute("INSERT INTO pokemon_moves (pokemon_id, move_id) VALUES (%s,%s);", (pokemon_id, move_id))
    conn.commit()
    return True


def upsert_nature(conn, name, increased_stat=None, decreased_stat=None):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO natures (name, increased_stat, decreased_stat) VALUES (%s,%s,%s) ON CONFLICT (name) DO UPDATE SET increased_stat = COALESCE(EXCLUDED.increased_stat, natures.increased_stat), decreased_stat = COALESCE(EXCLUDED.decreased_stat, natures.decreased_stat) RETURNING id;", (name, increased_stat, decreased_stat))
        return cur.fetchone()[0]


def insert_spread(conn, nature_id, ev_string):
    # ev_string expected like '32/0/2/0/0/32' -> hp/atk/def/spa/spd/spe
    parts = [int(p) if p.isdigit() else 0 for p in ev_string.split('/')]
    while len(parts) < 6:
        parts.append(0)
    hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs = parts[:6]
    with conn.cursor() as cur:
        cur.execute("INSERT INTO spreads (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id;", (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs))
        sid = cur.fetchone()[0]
    conn.commit()
    return sid


def upsert_pokemon(conn, p):
    # p expected to contain keys: name, hp, attack, defense, sp_attack, sp_defense, speed
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pokemon (name, hp, attack, defense, sp_attack, sp_defense, speed)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (name) DO UPDATE SET hp=COALESCE(EXCLUDED.hp,pokemon.hp), attack=COALESCE(EXCLUDED.attack,pokemon.attack), defense=COALESCE(EXCLUDED.defense,pokemon.defense), sp_attack=COALESCE(EXCLUDED.sp_attack,pokemon.sp_attack), sp_defense=COALESCE(EXCLUDED.sp_defense,pokemon.sp_defense), speed=COALESCE(EXCLUDED.speed,pokemon.speed)
            RETURNING id;
            """,
            (
                p.get('name'),
                p.get('hp'),
                p.get('attack'),
                p.get('defense'),
                p.get('sp_attack') or p.get('spatk') or p.get('sp_atk'),
                p.get('sp_defense') or p.get('spdef') or p.get('sp_def'),
                p.get('speed'),
            ),
        )
        return cur.fetchone()[0]


def process_payload(conn, payload):
    inserted = {
        'types': 0,
        'pokemon': 0,
        'abilities': 0,
        'items': 0,
        'moves': 0,
        'spreads': 0,
    }

    if not isinstance(payload, dict):
        # If payload is a list of entries, process each element
        if isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict):
                    sub = process_payload(conn, item)
                    for k in inserted:
                        inserted[k] += sub.get(k, 0)
        return inserted
    # If payload represents a single pokemon entry (has 'name' and 'stats')
    if 'name' in payload:
        name = payload.get('name')
        # upsert pokemon stats
        stats = payload.get('stats', {})
        p = {
            'name': name,
            'hp': stats.get('hp'),
            'attack': stats.get('atk') or stats.get('attack'),
            'defense': stats.get('def'),
            'sp_attack': stats.get('spa'),
            'sp_defense': stats.get('spd'),
            'speed': stats.get('spe'),
        }
        try:
            pokemon_id = upsert_pokemon(conn, p)
            inserted['pokemon'] += 1
        except Exception as e:
            raise

        # types
        for idx, tname in enumerate(payload.get('types', []) or []):
            if not tname:
                continue
            type_id = upsert_type(conn, tname)
            inserted['types'] += 1
            try:
                add_pokemon_type(conn, pokemon_id, type_id, slot=idx+1)
            except Exception:
                pass

        # abilities
        for ability in payload.get('abilities', []) or []:
            aname = ability.get('ability') if isinstance(ability, dict) else ability
            if not aname:
                continue
            aid = upsert_ability(conn, aname)
            inserted['abilities'] += 1
            try:
                add_pokemon_ability(conn, pokemon_id, aid, is_hidden=False)
            except Exception:
                pass

        # items
        for item in payload.get('items', []) or []:
            iname = item.get('item') if isinstance(item, dict) else item
            iname_us = item.get('item_us') if isinstance(item, dict) else None
            if not iname:
                continue
            iid = upsert_item(conn, iname, iname_us)
            inserted['items'] += 1

        # moves
        for mv in payload.get('moves', []) or []:
            mname = mv.get('move') if isinstance(mv, dict) else mv
            mtype = mv.get('type') if isinstance(mv, dict) else None
            if not mname:
                continue
            mid = upsert_move(conn, mname, mtype)
            inserted['moves'] += 1
            try:
                add_pokemon_move(conn, pokemon_id, mid)
            except Exception:
                pass

        # spreads/natures
        for sp in payload.get('spreads', []) or []:
            nature = sp.get('nature')
            ev = sp.get('ev')
            if not nature or not ev:
                continue
            nid = upsert_nature(conn, nature)
            sid = insert_spread(conn, nid, ev)
            inserted['spreads'] += 1

    else:
        # Fallback: detect a list of pokemon-like dicts inside the payload
        # Find the best candidate list: a value that is a list and whose elements are dicts with a 'name' key
        candidate_lists = []
        for k, v in payload.items():
            if isinstance(v, list) and len(v) > 0 and all(isinstance(x, dict) for x in v):
                # score by how many items have 'name'
                name_count = sum(1 for x in v if 'name' in x)
                candidate_lists.append((name_count, k, v))

        if candidate_lists:
            # pick the list with the most 'name' occurrences
            candidate_lists.sort(key=lambda x: x[0], reverse=True)
            _, key, lst = candidate_lists[0]
            for item in lst:
                if isinstance(item, dict):
                    sub = process_payload(conn, item)
                    for k in inserted:
                        inserted[k] += sub.get(k, 0)

    return inserted



def fetch_and_store(url: str):
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        payload = r.json()
    except Exception as e:
        raise Exception(f'Failed to fetch url: {e}')

    conn = None
    try:
        conn = get_conn()
        ensure_raw_table(conn)
        raw_id = insert_raw(conn, url, payload)
        inserted = process_payload(conn, payload)
        # commit any pending inserts from processing
        try:
            conn.commit()
        except Exception:
            pass
        return {'raw_id': raw_id, 'inserted': inserted}
    finally:
        if conn:
            conn.close()


@app.on_event('startup')
def startup_load_once():
    # Run initial load in a background thread so startup isn't blocked by network/DB
    import time
    import threading

    def _startup_worker():
        attempts = 10
        for i in range(attempts):
            try:
                c = get_conn()
                c.close()
                break
            except Exception as e:
                print(f'ms_carga_api startup: db not ready (attempt {i+1}/{attempts}): {e}')
                time.sleep(1)

        if DEFAULT_API_URL:
            try:
                print('ms_carga_api startup: loading default API URL (background)')
                res = fetch_and_store(DEFAULT_API_URL)
                print('ms_carga_api startup: load result:', res)
            except Exception as e:
                print('ms_carga_api startup: initial load failed (background):', e)

    t = threading.Thread(target=_startup_worker, daemon=True)
    t.start()


@app.post('/load')
def load_api(body: LoadRequest):
    url = body.url or DEFAULT_API_URL
    if not url:
        raise HTTPException(status_code=400, detail='No URL specified and API_URL not configured')

    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        payload = r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f'Failed to fetch url: {e}')

        # store raw
    try:
        # ensure raw table in target DB
        conn = get_conn()
        ensure_raw_table(conn)
        raw_id = insert_raw(conn, url, payload)
        # process payload and insert mapped records
        inserted = process_payload(conn, payload)
        # commit processed inserts
        try:
            conn.commit()
        except Exception:
            pass
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'DB error: {e}')

    return { 'raw_id': raw_id, 'inserted': inserted }


@app.get('/')
def root():
    return { 'service':'ms_carga_api' }


def _normalize_payload_for_pool(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        # common keys
        for k in ("pokemon", "data", "results", "entries"):
            if k in payload and isinstance(payload[k], list):
                return payload[k]
        # try to detect a candidate list inside dict values
        for v in payload.values():
            if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                # prefer lists whose items have a 'name' key
                if any('name' in (item or {}) for item in v):
                    return v
        # fallback: return the whole payload wrapped
        return payload


@app.get('/api/pool')
def get_pool():
    """Return the latest fetched external payload normalized as a list suitable for the montecarlo service.

    This returns either a list of entries or the raw payload when no list-like structure is found.
    """
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT payload FROM external_raw ORDER BY fetched_at DESC LIMIT 1")
            row = cur.fetchone()
            if not row:
                return { 'data': [] }
            payload = row[0]
        conn.close()
        normalized = _normalize_payload_for_pool(payload)
        return normalized
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read pool from DB: {e}")


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=int(os.getenv('PORT',8000)), reload=True)
