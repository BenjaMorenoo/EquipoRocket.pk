import pandas as pd
import numpy as np


def _norm(name):
    """Normalize a pokemon name for matrix lookups.

    Converts to lowercase with spaces so that 'flutter-mane', 'Flutter Mane',
    and 'flutter mane' all resolve to the same key ('flutter mane').
    Using spaces is intentional: the DB stores Pikalytics names as-is (e.g.
    'Flutter Mane') and ms_pokemon queries with LOWER(name)=LOWER($1), so a
    space-normalized key round-trips correctly through the case-insensitive lookup.
    """
    return (name or '').lower().replace('-', ' ').strip()


class PokemonAnalyticsEngine:
    def __init__(self, raw_data):
        if isinstance(raw_data, dict):
            if 'data' in raw_data and isinstance(raw_data['data'], list):
                data = raw_data['data']
            elif 'pokemons' in raw_data and isinstance(raw_data['pokemons'], list):
                data = raw_data['pokemons']
            else:
                data = list(raw_data.values())
        else:
            data = list(raw_data)

        self.raw_data = data
        try:
            self.df = pd.DataFrame(data)
        except Exception:
            self.df = pd.DataFrame([{'name': d.get('name') if isinstance(d, dict) else str(d)} for d in data])

        if 'name' in self.df.columns:
            self.df.set_index('name', inplace=True, drop=False)

        self.synergy_matrix = self._build_synergy_matrix()

    def _build_synergy_matrix(self):
        """Build a pairwise co-occurrence matrix from Pikalytics teammate data.

        Keys in the matrix are normalized names (_norm), so lookups are
        insensitive to hyphens vs spaces and letter case.
        """
        relationships = []
        if 'team' in self.df.columns:
            for _, row in self.df.iterrows():
                pokemon_name = _norm(row.get('name'))
                if not pokemon_name:
                    continue
                team = row.get('team')
                if isinstance(team, list):
                    for teammate in team:
                        if isinstance(teammate, dict):
                            target = _norm(teammate.get('pokemon') or teammate.get('name') or '')
                            weight = float(teammate.get('percent', 0)) / 100.0
                        else:
                            target = _norm(str(teammate))
                            weight = 0.0
                        if target:
                            relationships.append({'source': pokemon_name, 'target': target, 'weight': weight})

        if not relationships:
            return pd.DataFrame()

        rel_df = pd.DataFrame(relationships)
        matrix = rel_df.pivot(index='source', columns='target', values='weight').fillna(0.0)
        return matrix

    def _pair_score(self, poke1, poke2):
        """Return the synergy score for a pair, averaging both directions.

        Returns None when neither pokemon appears in the matrix (truly unknown pair).
        Averaging A→B and B→A corrects the asymmetry of raw co-occurrence data.
        """
        a = _norm(poke1)
        b = _norm(poke2)
        mx = self.synergy_matrix
        if mx.empty:
            return None

        a_to_b = float(mx.at[a, b]) if (a in mx.index and b in mx.columns) else None
        b_to_a = float(mx.at[b, a]) if (b in mx.index and a in mx.columns) else None

        if a_to_b is not None and b_to_a is not None:
            return (a_to_b + b_to_a) / 2.0
        if a_to_b is not None:
            return a_to_b
        if b_to_a is not None:
            return b_to_a
        return None  # pair not in Pikalytics data

    def analyze_team_synergy(self, current_team):
        """Calculate synergy score for a team.

        Score = average of all pairwise synergy values.
        Pairs where neither pokemon has Pikalytics data are excluded from
        the average (not counted as 0) to avoid artificially deflating the score.
        Returns synergy_percent (0-100) and the detail for each pair.
        """
        if not isinstance(current_team, (list, tuple)):
            return {'error': 'current_team must be a list of pokemon names'}
        if len(current_team) < 2:
            return {'error': 'Se necesitan al menos 2 Pokémon para analizar la sinergia.'}

        known_scores = []
        pairs = []
        for i, poke1 in enumerate(current_team):
            for poke2 in current_team[i + 1:]:
                try:
                    score = self._pair_score(poke1, poke2)
                except Exception:
                    score = None

                if score is not None:
                    known_scores.append(score)
                pairs.append({
                    'pokemon1': poke1,
                    'pokemon2': poke2,
                    'synergy_percent': round(float(score) * 100, 2) if score is not None else None,
                })

        avg_synergy = float(np.mean(known_scores)) if known_scores else 0.0
        return {
            'synergy_percent': round(avg_synergy * 100, 2),
            'known_pairs': len(known_scores),
            'total_pairs': len(pairs),
            'pairs': pairs,
        }

    def recommend_teammate(self, current_team, top_n=3):
        """Recommend best teammates for an in-progress team.

        Scores each candidate pokemon by summing its averaged pairwise synergy
        with every member already on the team.
        Only pokemon that appear as index rows (main Pikalytics entries) are
        eligible candidates — this prevents teammate-only references (columns)
        from being suggested when they are not in the DB.
        """
        if not current_team:
            return {'error': 'Añade un Pokémon para recibir recomendaciones.'}

        norm_team = [_norm(p) for p in current_team]
        mx = self.synergy_matrix
        if mx.empty:
            return {'recommendations': []}

        all_candidates = list(mx.index)
        scores = {}
        for candidate in all_candidates:
            if candidate in norm_team:
                continue
            total = 0.0
            count = 0
            for member in norm_team:
                s = self._pair_score(member, candidate)
                if s is not None:
                    total += s
                    count += 1
            scores[candidate] = total / count if count > 0 else 0.0

        top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
        return {'recommendations': {name: round(v * 100, 2) for name, v in top}}

    def recommend_build(self, pokemon_name):
        norm = _norm(pokemon_name)
        # try normalized lookup first, then original
        poke = None
        if norm in self.df.index:
            poke = self.df.loc[norm]
        elif pokemon_name in self.df.index:
            poke = self.df.loc[pokemon_name]

        if poke is None:
            return {'error': f'No hay datos para {pokemon_name}'}

        def top_by_percent(lst):
            if not isinstance(lst, list) or not lst:
                return None
            try:
                return sorted(lst, key=lambda x: float(x.get('percent', 0)), reverse=True)[0]
            except Exception:
                return lst[0]

        get = lambda key: poke.get(key) if isinstance(poke, dict) else getattr(poke, key, None)
        top_item = top_by_percent(get('items'))
        top_ability = top_by_percent(get('abilities'))
        top_spread = top_by_percent(get('spreads'))
        moves_raw = get('moves') or []
        moves_sorted = sorted(moves_raw, key=lambda x: float(x.get('percent', 0)), reverse=True) if isinstance(moves_raw, list) else []
        top_moves = [m.get('move') for m in moves_sorted[:4] if m.get('move') != 'Other']

        return {
            'item': top_item.get('item') if top_item else None,
            'ability': top_ability.get('ability') if top_ability else None,
            'nature_and_evs': f"{top_spread.get('nature')} ({top_spread.get('ev')})" if top_spread else None,
            'moves': top_moves,
        }

    def _build_greedy_team(self, seed=None, team_size=6):
        """Build a team greedily by always adding the candidate with the highest
        average synergy against the members already chosen.
        """
        team_norm = [_norm(s) for s in (seed or []) if isinstance(s, str)]
        mx = self.synergy_matrix
        # Use only index rows (main Pikalytics entries) as candidates.
        # Column-only entries are teammate references that may not exist in the DB.
        candidates = list(mx.index) if not mx.empty else []
        if not candidates and 'name' in self.df.columns:
            candidates = [_norm(n) for n in self.df['name'].dropna().unique()]

        while len(team_norm) < team_size:
            scores = {}
            for c in candidates:
                if c in team_norm:
                    continue
                total = 0.0
                count = 0
                for m in team_norm:
                    s = self._pair_score(m, c)
                    if s is not None:
                        total += s
                        count += 1
                scores[c] = total / count if count > 0 else 0.0

            if not scores:
                break
            best = max(scores.items(), key=lambda x: x[1])[0]
            team_norm.append(best)

        # pad if still short
        for c in candidates:
            if len(team_norm) >= team_size:
                break
            if c not in team_norm:
                team_norm.append(c)

        return team_norm

    def recommend_teams(self, seeds=None, top_k=3, team_size=6):
        """Generate up to top_k distinct teams ranked by synergy score.

        Starts from multiple seed pokemon (highest-connectivity nodes in the
        synergy matrix) and builds each team greedily. Returns teams sorted
        by descending synergy_percent.
        """
        starters = [_norm(s) for s in seeds if isinstance(s, str)] if seeds else []

        if not starters:
            mx = self.synergy_matrix
            if not mx.empty:
                totals = mx.sum(axis=1) + mx.sum(axis=0).reindex(mx.index, fill_value=0)
                starters = list(totals.sort_values(ascending=False).head(20).index)
            elif 'name' in self.df.columns:
                starters = [_norm(n) for n in self.df['name'].dropna().unique()][:20]

        teams = []
        seen = set()
        for starter in starters:
            team = self._build_greedy_team(seed=[starter], team_size=team_size)
            key = tuple(sorted(team))
            if key in seen:
                continue
            seen.add(key)
            score = self.analyze_team_synergy(team).get('synergy_percent', 0.0)
            teams.append({'team': team, 'synergy_percent': score})
            if len(teams) >= top_k * 3:
                break

        if not seen:
            team = self._build_greedy_team(seed=[], team_size=team_size)
            key = tuple(sorted(team))
            if key not in seen:
                score = self.analyze_team_synergy(team).get('synergy_percent', 0.0)
                teams.append({'team': team, 'synergy_percent': score})

        teams = sorted(teams, key=lambda x: x['synergy_percent'], reverse=True)
        return {'teams': teams[:top_k]}
