"""Pruebas unitarias del motor Monte Carlo (ms_montecarlo).

Cubre los casos UT-MC-01 a UT-MC-06 de plan_pruebas.md. Todas las pruebas son
de caja blanca sobre funciones puras de `montecarlo.py`/`simulator.py` y sobre
`_derive_seed`/`POST /persist_best` de `app.py`. Ninguna requiere conexión real
a la base de datos: el caso que sí toca `get_db_conn` se aísla con monkeypatch.
"""
import random

from fastapi.testclient import TestClient

import montecarlo
import app as app_module
from app import app, _derive_seed


client = TestClient(app)


def make_poke(name, moves_pct, items_pct=None, abilities_pct=None, spreads_pct=None, stats=None):
    return {
        "name": name,
        "stats": stats or {"hp": 80, "atk": 90, "spa": 70},
        "moves": [{"move": f"Move{i}", "percent": p} for i, p in enumerate(moves_pct)],
        "items": [{"item": f"Item{i}", "percent": p} for i, p in enumerate(items_pct or [])],
        "abilities": [{"ability": f"Ability{i}", "percent": p} for i, p in enumerate(abilities_pct or [])],
        "spreads": [{"nature": f"Nature{i}", "percent": p} for i, p in enumerate(spreads_pct or [])],
    }


# ---------------------------------------------------------------------------
# UT-MC-01: pick_default_config
# ---------------------------------------------------------------------------

def test_pick_default_config_selects_highest_percent():
    poke = make_poke(
        "Pikachu",
        moves_pct=[30, 50, 10, 5, 5],
        items_pct=[20, 60],
        abilities_pct=[40, 60],
        spreads_pct=[70, 30],
    )
    cfg = montecarlo.pick_default_config(poke)

    assert [m["percent"] for m in cfg["moves"]] == [50, 30, 10, 5]
    assert cfg["item"]["percent"] == 60
    assert cfg["ability"]["percent"] == 60
    assert cfg["spread"]["percent"] == 70


def test_pick_default_config_handles_empty_lists():
    poke = {"name": "Empty", "moves": []}
    cfg = montecarlo.pick_default_config(poke)

    assert cfg["moves"] == []
    assert "item" not in cfg
    assert "ability" not in cfg
    assert "spread" not in cfg


# ---------------------------------------------------------------------------
# UT-MC-02: generate_random_config_for_pokemon
# ---------------------------------------------------------------------------

def test_generate_random_config_is_reproducible_with_seed():
    poke = make_poke(
        "Charizard",
        moves_pct=[10, 20, 30, 40, 50, 60],
        items_pct=[10, 20, 30],
        abilities_pct=[10, 20],
        spreads_pct=[10, 20, 30],
    )

    cfg1 = montecarlo.generate_random_config_for_pokemon(poke, rng=random.Random(123))
    cfg2 = montecarlo.generate_random_config_for_pokemon(poke, rng=random.Random(123))

    assert cfg1 == cfg2


def test_generate_random_config_moves_within_top_candidates():
    poke = make_poke("Charizard", moves_pct=[10, 20, 30, 40, 50, 60])
    top_candidates = sorted(poke["moves"], key=lambda m: m["percent"], reverse=True)

    cfg = montecarlo.generate_random_config_for_pokemon(poke, rng=random.Random(7))

    assert len(cfg["moves"]) == 4
    for move in cfg["moves"]:
        assert move in top_candidates


# ---------------------------------------------------------------------------
# UT-MC-03: evaluate_team
# ---------------------------------------------------------------------------

def test_evaluate_team_returns_win_rate_and_iterations():
    strong = make_poke("Strong", moves_pct=[90, 90, 90, 90], stats={"hp": 150, "atk": 150, "spa": 150})
    weak = make_poke("Weak", moves_pct=[10, 10, 10, 10], stats={"hp": 50, "atk": 40, "spa": 40})

    win_rate, iterations = montecarlo.evaluate_team(
        pool=[], team=[strong], sims=50, opponent_fixed=[weak], rng=random.Random(1)
    )

    assert 0.0 <= win_rate <= 1.0
    assert len(iterations) == 50
    assert all(it["winner"] in ("A", "B") for it in iterations)
    assert [it["iteration"] for it in iterations] == list(range(1, 51))
    # El equipo "Strong" domina ampliamente en stats y uso de movimientos: debe ganar casi siempre.
    assert win_rate > 0.8


# ---------------------------------------------------------------------------
# UT-MC-04: _derive_seed (determinismo y simetría de intercambio)
# ---------------------------------------------------------------------------

def test_derive_seed_is_deterministic():
    s1 = _derive_seed(["Pikachu"], ["Charizard"], 100, 50)
    s2 = _derive_seed(["Pikachu"], ["Charizard"], 100, 50)

    assert s1 == s2


def test_derive_seed_changes_with_inputs():
    base = _derive_seed(["Pikachu"], ["Charizard"], 100, 50)

    assert _derive_seed(["Pikachu"], ["Charizard"], 100, 51) != base
    assert _derive_seed(["Bulbasaur"], ["Charizard"], 100, 50) != base


def test_derive_seed_swap_symmetry():
    """Si team/opponent se intercambian en otra request, la búsqueda de `team`
    de una request debe coincidir con la búsqueda de `opponent` de la otra."""
    team = ["Pikachu", "Charizard"]
    opponent = ["Garchomp", "Tyranitar"]
    iterations, sims, base = 100, 50, None

    # Request 1: team=team, opponent=opponent
    seed_team_search_req1 = _derive_seed(team, opponent, iterations, sims, base=base)
    seed_opponent_search_req1 = _derive_seed(opponent, team, iterations, sims, base=base)

    # Request 2: equipos intercambiados (team=opponent, opponent=team)
    seed_team_search_req2 = _derive_seed(opponent, team, iterations, sims, base=base)
    seed_opponent_search_req2 = _derive_seed(team, opponent, iterations, sims, base=base)

    assert seed_team_search_req1 == seed_opponent_search_req2
    assert seed_opponent_search_req1 == seed_team_search_req2
    assert seed_team_search_req1 != seed_opponent_search_req1


# ---------------------------------------------------------------------------
# UT-MC-05: search_best_team (reproducibilidad)
# ---------------------------------------------------------------------------

def test_search_best_team_is_reproducible_with_fixed_seed():
    pool = [
        make_poke(
            f"Mon{i}",
            moves_pct=[10, 20, 30, 40, 50, 60],
            items_pct=[10, 20],
            abilities_pct=[10, 20],
            spreads_pct=[10, 20],
            stats={"hp": 80 + i, "atk": 80 + i, "spa": 70},
        )
        for i in range(6)
    ]

    r1 = montecarlo.search_best_team(pool, team_size=2, iterations=5, sims=10, random_seed=42)
    r2 = montecarlo.search_best_team(pool, team_size=2, iterations=5, sims=10, random_seed=42)

    assert r1[0] == r2[0]
    assert r1[1] == r2[1]
    assert r1[2] == r2[2]


# ---------------------------------------------------------------------------
# UT-MC-06: POST /persist_best (validación de significancia estadística)
# ---------------------------------------------------------------------------

def test_persist_best_rejects_non_significant_win_rate():
    resp = client.post(
        "/persist_best",
        json={"team_id": 1, "best_team": [], "win_rate": 50, "simulation_count": 30, "force": False},
    )

    assert resp.status_code == 400
    assert "not significant" in str(resp.json())


def test_persist_best_force_bypasses_significance_check(monkeypatch):
    class DbNotAvailable(Exception):
        pass

    def fake_get_db_conn():
        raise DbNotAvailable("db not available in unit test")

    monkeypatch.setattr(app_module, "get_db_conn", fake_get_db_conn)

    resp = client.post(
        "/persist_best",
        json={"team_id": 1, "best_team": [], "win_rate": 50, "simulation_count": 30, "force": True},
    )

    # No es 400: force=True omite el chequeo de significancia. El 500 viene de
    # get_db_conn (interceptada), lo que confirma que el flujo llegó al paso
    # de persistencia en BD en lugar de cortar antes por significancia.
    assert resp.status_code == 500
    assert "db not available in unit test" in resp.json()["detail"]
