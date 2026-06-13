"""Motor Monte Carlo minimal para recomendar configuraciones de equipo.

Este módulo expone `search_best_team(pool, ...)` que el servicio web puede usar.
"""
import random
import re
from api_client import fetch_api, list_pokemon_entries
from simulator import simulate_battle


def pick_default_config(poke):
    p = dict(poke)
    moves = poke.get("moves", [])
    sorted_moves = sorted(moves, key=lambda m: float(m.get("percent", 0)), reverse=True)
    p["moves"] = sorted_moves[:4]
    items = poke.get("items", [])
    if items:
        p["item"] = max(items, key=lambda i: float(i.get("percent", 0)))
    spreads = poke.get("spreads", [])
    if spreads:
        p["spread"] = max(spreads, key=lambda s: float(s.get("percent", 0)))
    abilities = poke.get("abilities", [])
    if abilities:
        p["ability"] = max(abilities, key=lambda a: float(a.get("percent", 0)))
    return p


def find_entries_by_names(pool, names):
    names_l = [n.strip().lower() for n in names if n]
    res = []
    for n in names_l:
        for p in pool:
            for key in ("name", "pokemon", "display_name"):
                val = p.get(key)
                if val and isinstance(val, str) and val.strip().lower() == n:
                    res.append(p)
                    break
            else:
                continue
            break
    return res


def generate_random_config_for_pokemon(poke, top_moves=6, top_items=3, top_abilities=2, top_spreads=3, rng=None):
    rng = rng or random
    p = dict(poke)
    moves = poke.get("moves", [])
    sorted_moves = sorted(moves, key=lambda m: float(m.get("percent", 0)), reverse=True)
    candidates = sorted_moves[: max(4, top_moves)]
    mvcount = min(4, len(candidates))
    if candidates:
        p["moves"] = list(rng.sample(candidates, k=mvcount))
    else:
        p["moves"] = []

    items = poke.get("items", [])[:top_items]
    p["item"] = rng.choice(items) if items else None

    abilities = poke.get("abilities", [])[:top_abilities]
    p["ability"] = rng.choice(abilities) if abilities else None

    spreads = poke.get("spreads", [])[:top_spreads]
    p["spread"] = rng.choice(spreads) if spreads else None
    return p


def generate_random_team(pool, team_size=3, rng=None):
    rng = rng or random
    sample = rng.sample(pool, k=team_size)
    return [pick_default_config(p) for p in sample]


def generate_configured_team_from_names(pool, names, top_moves=6, top_items=3, top_abilities=2, top_spreads=3, rng=None):
    entries = find_entries_by_names(pool, names)
    if not entries:
        return []
    return [generate_random_config_for_pokemon(p, top_moves, top_items, top_abilities, top_spreads, rng=rng) for p in entries]


def evaluate_team(pool, team, sims=200, opponent_fixed=None, rng=None):
    """Evalúa un equipo simulando `sims` combates individuales.

    Devuelve una tupla `(win_rate, iterations)` donde `iterations` es la lista
    de resultados de cada combate individual (1..sims), con la forma
    `{'iteration': i, 'winner': 'A'|'B'}`. Esto permite persistir la
    trazabilidad completa de la corrida Monte Carlo en `simulation_iterations`.
    """
    rng = rng or random
    wins = 0
    iterations = []
    for i in range(sims):
        if opponent_fixed is not None:
            opp = opponent_fixed
        else:
            opp = generate_random_team(pool, team_size=len(team), rng=rng)
        won = simulate_battle(team, opp, rng=rng)
        if won:
            wins += 1
        iterations.append({'iteration': i + 1, 'winner': 'A' if won else 'B'})
    win_rate = wins / sims if sims else 0.0
    return win_rate, iterations


def search_best_team(pool, team_size=3, iterations=200, sims=200, fixed_teamA_names=None, fixed_teamB_names=None, top_moves=6, top_items=3, top_abilities=2, top_spreads=3, random_seed=None):
    best = (0.0, None, [])
    rng = random.Random(random_seed)

    opponent_fixed = None
    if fixed_teamB_names:
        opponent_fixed = [pick_default_config(p) for p in find_entries_by_names(pool, fixed_teamB_names)]

    teamA_entries = None
    if fixed_teamA_names:
        teamA_entries = find_entries_by_names(pool, fixed_teamA_names)
        if not teamA_entries:
            teamA_entries = None

    for i in range(iterations):
        if teamA_entries:
            team = [generate_random_config_for_pokemon(p, top_moves, top_items, top_abilities, top_spreads, rng=rng) for p in teamA_entries]
        else:
            team = generate_random_team(pool, team_size=team_size, rng=rng)

        wr, its = evaluate_team(pool, team, sims=sims, opponent_fixed=opponent_fixed, rng=rng)
        if wr > best[0]:
            best = (wr, team, its)
    return best


def short_name(p):
    return p.get("name") or p.get("pokemon") or p.get("display_name") or str(p.get("id", ""))
