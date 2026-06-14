# Pruebas unitarias de ms_asistencia/engine.py::PokemonAnalyticsEngine
# Cubre UT-ASIS-01 (simetria de la matriz de sinergia), UT-ASIS-02 (analyze_team_synergy
# con equipo de 6 y con lista vacia) y UT-ASIS-03 (recommend_teammate con top_n=3).
from engine import PokemonAnalyticsEngine


# ---------------------------------------------------------------------------
# UT-ASIS-01: simetria de la matriz de sinergia
# ---------------------------------------------------------------------------
def test_synergy_matrix_is_symmetric_for_symmetric_input():
    raw_data = [
        {'name': 'A', 'team': [{'pokemon': 'B', 'percent': 30}, {'pokemon': 'C', 'percent': 10}]},
        {'name': 'B', 'team': [{'pokemon': 'A', 'percent': 30}, {'pokemon': 'C', 'percent': 20}]},
        {'name': 'C', 'team': [{'pokemon': 'A', 'percent': 10}, {'pokemon': 'B', 'percent': 20}]},
    ]
    engine = PokemonAnalyticsEngine(raw_data)
    matrix = engine.synergy_matrix

    assert matrix.at['A', 'B'] == matrix.at['B', 'A'] == 0.3
    assert matrix.at['A', 'C'] == matrix.at['C', 'A'] == 0.1
    assert matrix.at['B', 'C'] == matrix.at['C', 'B'] == 0.2


# ---------------------------------------------------------------------------
# UT-ASIS-02: analyze_team_synergy
# ---------------------------------------------------------------------------
def test_analyze_team_synergy_with_six_pokemon_returns_aggregate_and_breakdown():
    names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
    raw_data = [
        {'name': p, 'team': [{'pokemon': q, 'percent': 10} for q in names if q != p]}
        for p in names
    ]
    engine = PokemonAnalyticsEngine(raw_data)

    result = engine.analyze_team_synergy(names)

    assert 'synergy_percent' in result
    assert result['synergy_percent'] == 10.0
    # plan_pruebas.md espera tambien un desglose por par (p.ej. 'pairs'/'breakdown')
    assert 'pairs' in result or 'breakdown' in result


def test_analyze_team_synergy_with_empty_list_returns_default_structure_without_exception():
    engine = PokemonAnalyticsEngine([{'name': 'A'}])

    result = engine.analyze_team_synergy([])

    assert 'error' in result


# ---------------------------------------------------------------------------
# UT-ASIS-03: recommend_teammate
# ---------------------------------------------------------------------------
def test_recommend_teammate_with_five_pokemon_returns_top_3_sorted_desc_excluding_team():
    raw_data = [
        {'name': 'A', 'team': [{'pokemon': 'F', 'percent': 50}, {'pokemon': 'G', 'percent': 10}]},
        {'name': 'B', 'team': [{'pokemon': 'F', 'percent': 30}, {'pokemon': 'H', 'percent': 20}]},
        {'name': 'C', 'team': [{'pokemon': 'G', 'percent': 40}]},
        {'name': 'D', 'team': [{'pokemon': 'H', 'percent': 25}]},
        {'name': 'E', 'team': [{'pokemon': 'F', 'percent': 5}]},
    ]
    engine = PokemonAnalyticsEngine(raw_data)
    current_team = ['A', 'B', 'C', 'D', 'E']

    result = engine.recommend_teammate(current_team, top_n=3)
    recs = result['recommendations']

    assert len(recs) == 3
    assert list(recs.keys()) == ['F', 'G', 'H']
    scores = list(recs.values())
    assert scores == sorted(scores, reverse=True)
    assert not (set(recs.keys()) & set(current_team))
