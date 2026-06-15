# Pruebas unitarias de ms_carga_api/main.py
# Cubre UT-CARGA-01 (idempotencia de process_payload contra Postgres real),
# UT-CARGA-02 (_normalize_payload_for_pool con payloads vacios/incompletos) y
# UT-CARGA-03 (POST /load ante error de la API externa, sin tocar la BD).
import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client():
    return TestClient(main.app)


# ---------------------------------------------------------------------------
# UT-CARGA-01: idempotencia de process_payload (requiere Postgres real)
# ---------------------------------------------------------------------------
PREFIX = "ZZUnitTest"


def _payload():
    return {
        "name": f"{PREFIX}Mon",
        "stats": {"hp": 1, "atk": 2, "def": 3, "spa": 4, "spd": 5, "spe": 6},
        "types": [f"{PREFIX}Type"],
        "abilities": [{"ability": f"{PREFIX}Ability"}],
        "items": [{"item": f"{PREFIX}Item"}],
        "moves": [{"move": f"{PREFIX}Move", "type": f"{PREFIX}Type"}],
    }


def _counts(conn, pokemon_id):
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM types WHERE name=%s", (f"{PREFIX}Type",))
        types_c = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM abilities WHERE name=%s", (f"{PREFIX}Ability",))
        abilities_c = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM items WHERE name=%s", (f"{PREFIX}Item",))
        items_c = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM moves WHERE name=%s", (f"{PREFIX}Move",))
        moves_c = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM pokemon_types WHERE pokemon_id=%s", (pokemon_id,))
        ptypes_c = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM pokemon_abilities WHERE pokemon_id=%s", (pokemon_id,))
        pabilities_c = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM pokemon_moves WHERE pokemon_id=%s", (pokemon_id,))
        pmoves_c = cur.fetchone()[0]
    return (types_c, abilities_c, items_c, moves_c, ptypes_c, pabilities_c, pmoves_c)


def test_process_payload_twice_does_not_duplicate_rows():
    conn = main.get_conn()
    payload = _payload()
    pokemon_id = None
    try:
        inserted_1 = main.process_payload(conn, payload)
        conn.commit()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM pokemon WHERE name=%s", (payload["name"],))
            pokemon_id = cur.fetchone()[0]
        counts_1 = _counts(conn, pokemon_id)

        inserted_2 = main.process_payload(conn, payload)
        conn.commit()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM pokemon WHERE name=%s", (payload["name"],))
            pokemon_id_2 = cur.fetchone()[0]
        counts_2 = _counts(conn, pokemon_id_2)

        assert inserted_1["pokemon"] == 1
        assert inserted_2["pokemon"] == 1
        assert pokemon_id == pokemon_id_2  # ON CONFLICT actualiza la misma fila, no inserta otra
        assert counts_1 == (1, 1, 1, 1, 1, 1, 1)
        assert counts_2 == counts_1  # 2da ejecucion no agrega filas nuevas
    finally:
        if pokemon_id is not None:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM pokemon_moves WHERE pokemon_id=%s", (pokemon_id,))
                cur.execute("DELETE FROM pokemon_abilities WHERE pokemon_id=%s", (pokemon_id,))
                cur.execute("DELETE FROM pokemon_types WHERE pokemon_id=%s", (pokemon_id,))
                cur.execute("DELETE FROM pokemon WHERE id=%s", (pokemon_id,))
                cur.execute("DELETE FROM moves WHERE name=%s", (f"{PREFIX}Move",))
                cur.execute("DELETE FROM items WHERE name=%s", (f"{PREFIX}Item",))
                cur.execute("DELETE FROM abilities WHERE name=%s", (f"{PREFIX}Ability",))
                cur.execute("DELETE FROM types WHERE name=%s", (f"{PREFIX}Type",))
            conn.commit()
        conn.close()


# ---------------------------------------------------------------------------
# ST-CARGA-01: insert_spread con ON CONFLICT no duplica spreads/pokemon_spreads
# ---------------------------------------------------------------------------
def _payload_with_spread():
    return {
        "name": f"{PREFIX}SpreadMon",
        "stats": {"hp": 1, "atk": 2, "def": 3, "spa": 4, "spd": 5, "spe": 6},
        "spreads": [{"nature": f"{PREFIX}Nature", "ev": "4/252/0/0/0/252"}],
    }


def test_process_payload_twice_does_not_duplicate_spreads():
    conn = main.get_conn()
    payload = _payload_with_spread()
    pokemon_id = None
    nature_id = None
    try:
        main.process_payload(conn, payload)
        conn.commit()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM pokemon WHERE name=%s", (payload["name"],))
            pokemon_id = cur.fetchone()[0]
            cur.execute("SELECT id FROM natures WHERE name=%s", (f"{PREFIX}Nature",))
            nature_id = cur.fetchone()[0]
            cur.execute(
                "SELECT COUNT(*) FROM spreads WHERE nature_id=%s AND hp_evs=4 AND attack_evs=252 "
                "AND defense_evs=0 AND sp_attack_evs=0 AND sp_defense_evs=0 AND speed_evs=252",
                (nature_id,),
            )
            spreads_count_1 = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM pokemon_spreads WHERE pokemon_id=%s", (pokemon_id,))
            ps_count_1 = cur.fetchone()[0]

        main.process_payload(conn, payload)
        conn.commit()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM spreads WHERE nature_id=%s AND hp_evs=4 AND attack_evs=252 "
                "AND defense_evs=0 AND sp_attack_evs=0 AND sp_defense_evs=0 AND speed_evs=252",
                (nature_id,),
            )
            spreads_count_2 = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM pokemon_spreads WHERE pokemon_id=%s", (pokemon_id,))
            ps_count_2 = cur.fetchone()[0]

        assert spreads_count_1 == 1
        assert ps_count_1 == 1
        assert spreads_count_2 == spreads_count_1
        assert ps_count_2 == ps_count_1
    finally:
        if pokemon_id is not None:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM pokemon_spreads WHERE pokemon_id=%s", (pokemon_id,))
                cur.execute("DELETE FROM pokemon WHERE id=%s", (pokemon_id,))
                if nature_id is not None:
                    cur.execute("DELETE FROM spreads WHERE nature_id=%s", (nature_id,))
                    cur.execute("DELETE FROM natures WHERE id=%s", (nature_id,))
            conn.commit()
        conn.close()


# ---------------------------------------------------------------------------
# UT-CARGA-02: _normalize_payload_for_pool con payloads vacios/incompletos
# ---------------------------------------------------------------------------
def test_normalize_empty_dict_returns_valid_empty_structure():
    result = main._normalize_payload_for_pool({})
    assert result == {}


def test_normalize_dict_without_pokemon_key_uses_alternate_list_key():
    payload = {"results": [{"name": "Pikachu"}, {"name": "Bulbasaur"}]}
    result = main._normalize_payload_for_pool(payload)
    assert result == payload["results"]


def test_normalize_dict_without_known_keys_returns_payload_unchanged():
    payload = {"foo": "bar", "baz": 123}
    result = main._normalize_payload_for_pool(payload)
    assert result == payload


# ---------------------------------------------------------------------------
# UT-CARGA-03: POST /load ante error de la API externa
# ---------------------------------------------------------------------------
def test_load_with_unreachable_url_returns_502_without_touching_db(client, monkeypatch):
    def boom(*args, **kwargs):
        raise main.requests.exceptions.ConnectionError("simulated network failure")

    monkeypatch.setattr(main.requests, "get", boom)

    def fail_get_conn(*args, **kwargs):
        raise AssertionError("get_conn no deberia llamarse si falla el fetch externo")

    monkeypatch.setattr(main, "get_conn", fail_get_conn)

    res = client.post("/load", json={"url": "http://no-existe.invalid/data.json"})

    assert res.status_code == 502
    assert "Failed to fetch url" in res.json()["detail"]
