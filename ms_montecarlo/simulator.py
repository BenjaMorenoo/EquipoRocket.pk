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
    # base stat contribution
    stat_score = 0.6 * max(atk, spa) + 0.4 * hp

    # moves: usar la 'percent' como proxy de utilidad; cada move aporta según tipo
    moves = poke.get("moves", [])
    move_score = 0.0
    for mv in moves:
        try:
            p = float(mv.get("percent", 0))
        except Exception:
            p = 0.0
        move_score += p
    # normalize
    move_score = move_score / (len(moves) or 1)

    # item multiplier: items with high percent -> small bonus
    items = poke.get("items", [])
    top_item = _most_common_field(items, "item")
    item_mult = 1.0
    if top_item:
        # items like Choice Scarf / Sash etc. may change role; give modest bonus
        item_mult += min(0.25, float(top_item.get("percent", 0)) / 400.0)

    # spread: prefer spreads with high percent because reflejan inversión en stats
    spreads = poke.get("spreads", [])
    spread_bonus = 0.0
    top_spread = _most_common_field(spreads, "nature")
    if top_spread:
        spread_bonus = min(0.25, float(top_spread.get("percent", 0)) / 400.0)

    # ability: small bonus for popular abilities
    abilities = poke.get("abilities", [])
    top_ability = _most_common_field(abilities, "ability")
    ability_bonus = 0.0
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
