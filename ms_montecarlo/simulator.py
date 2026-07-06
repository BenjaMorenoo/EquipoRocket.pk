"""Simulador simplificado y heurístico para comparar equipos.

Este prototipo utiliza heurísticas sobre stats, movimientos y items extraídos de
la API para computar una puntuación por Pokémon y decidir un ganador con ruido
estocástico. Es suficiente para un motor Monte Carlo de prototipo y se puede
reemplazar por un simulador de batalla completo más tarde.
"""
import random


def _most_common_field(lst, key_name):
    """Dado una lista de dicts con keys como 'move'/'item' y 'percent', devuelve el más frecuente."""
    if not lst:
        return None
    best = max(lst, key=lambda d: float(d.get("percent", 0)))
    return best


def score_pokemon(poke):
    """Calcula una puntuación heurística para un Pokémon usando stats, moves y item.

    Esta puntuación no sustituye a una simulación táctica real, pero permite
    comparar equipos en Monte Carlo.
    """
    stats = poke.get("stats") or {}
    hp = float(stats.get("hp", 70))
    atk = float(stats.get("atk", 70))
    spa = float(stats.get("spa", 70))
    stat_score = 0.6 * max(atk, spa) + 0.4 * hp

    # Flat contribution per selected move — avoids systematic bias where the
    # "default" config (top-4 by percent) always outscores randomly-sampled configs.
    moves = poke.get("moves", [])
    move_score = min(len(moves), 4) * 10.0

    # item multiplier: use the SELECTED item (singular key set by generate_random_config),
    # not the full pool list — so different item choices actually produce different scores.
    item_mult = 1.0
    selected_item = poke.get("item")
    if isinstance(selected_item, dict):
        item_mult += min(0.25, float(selected_item.get("percent", 0)) / 400.0)
    elif not selected_item:
        items = poke.get("items", [])
        top_item = _most_common_field(items, "item")
        if top_item:
            item_mult += min(0.25, float(top_item.get("percent", 0)) / 400.0)

    # spread bonus from pool (same for all configs of same pokemon — minor factor)
    spreads = poke.get("spreads", [])
    spread_bonus = 0.0
    top_spread = _most_common_field(spreads, "nature")
    if top_spread:
        spread_bonus = min(0.25, float(top_spread.get("percent", 0)) / 400.0)

    # ability bonus: use the SELECTED ability (singular key), not the full pool list.
    ability_bonus = 0.0
    selected_ability = poke.get("ability")
    if isinstance(selected_ability, dict):
        ability_bonus = min(0.15, float(selected_ability.get("percent", 0)) / 800.0)
    elif not selected_ability:
        abilities = poke.get("abilities", [])
        top_ability = _most_common_field(abilities, "ability")
        if top_ability:
            ability_bonus = min(0.15, float(top_ability.get("percent", 0)) / 800.0)

    base = (stat_score * (1 + spread_bonus) + move_score * 2.5) * item_mult * (1 + ability_bonus)
    return base


def simulate_battle(teamA, teamB, rng=None):
    """Simula un enfrentamiento entre dos equipos devolviendo True si gana teamA.

    Introduce ruido aleatorio para reflejar incertidumbre.
    """
    rng = rng or random
    scoreA = sum(score_pokemon(p) for p in teamA)
    scoreB = sum(score_pokemon(p) for p in teamB)
    # añadir variabilidad: gaussiana relativa
    noiseA = rng.gauss(1.0, 0.06)
    noiseB = rng.gauss(1.0, 0.06)
    finalA = scoreA * noiseA
    finalB = scoreB * noiseB
    return finalA > finalB
