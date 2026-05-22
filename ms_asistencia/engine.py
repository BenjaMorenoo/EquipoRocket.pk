import pandas as pd
import numpy as np

class PokemonAnalyticsEngine:
    def __init__(self, raw_data):
        """
        raw_data: list/dict representing collection of pokemon entries.
        The engine will try to normalize to list of dicts with 'name' and optional 'team', 'items', 'abilities', 'spreads', 'moves'
        """
        # Normalize input
        if isinstance(raw_data, dict):
            # try common keys
            if 'data' in raw_data and isinstance(raw_data['data'], list):
                data = raw_data['data']
            elif 'pokemons' in raw_data and isinstance(raw_data['pokemons'], list):
                data = raw_data['pokemons']
            else:
                # maybe it's a map name->obj
                data = list(raw_data.values())
        else:
            data = list(raw_data)

        self.raw_data = data
        try:
            self.df = pd.DataFrame(data)
        except Exception:
            # fallback: build dataframe with name column only
            self.df = pd.DataFrame([{'name': d.get('name') if isinstance(d, dict) else str(d)} for d in data])

        if 'name' in self.df.columns:
            self.df.set_index('name', inplace=True, drop=False)

        self.synergy_matrix = self._build_synergy_matrix()

    def _build_synergy_matrix(self):
        relationships = []
        if 'team' in self.df.columns:
            for _, row in self.df.iterrows():
                pokemon_name = row.get('name')
                if not pokemon_name:
                    continue
                team = row.get('team')
                if isinstance(team, list):
                    for teammate in team:
                        # teammate might be dict with 'pokemon' and 'percent' or simple str
                        if isinstance(teammate, dict):
                            target = teammate.get('pokemon') or teammate.get('name')
                            weight = float(teammate.get('percent', 0)) / 100.0
                        else:
                            target = str(teammate)
                            weight = 0.0
                        if target:
                            relationships.append({'source': pokemon_name, 'target': target, 'weight': weight})
        if not relationships:
            return pd.DataFrame()
        rel_df = pd.DataFrame(relationships)
        matrix = rel_df.pivot(index='source', columns='target', values='weight').fillna(0.0)
        return matrix

    def analyze_team_synergy(self, current_team):
        if not isinstance(current_team, (list, tuple)):
            return {'error': 'current_team must be a list of pokemon names'}
        if len(current_team) < 2:
            return {'error': 'Se necesitan al menos 2 Pokémon para analizar la sinergia.'}
        synergy_scores = []
        for i, poke1 in enumerate(current_team):
            for poke2 in current_team[i+1:]:
                try:
                    if poke1 in self.synergy_matrix.index and poke2 in self.synergy_matrix.columns:
                        score = self.synergy_matrix.at[poke1, poke2]
                    elif poke2 in self.synergy_matrix.index and poke1 in self.synergy_matrix.columns:
                        score = self.synergy_matrix.at[poke2, poke1]
                    else:
                        score = 0.0
                except Exception:
                    score = 0.0
                synergy_scores.append(score)
        avg_synergy = float(np.mean(synergy_scores)) if synergy_scores else 0.0
        return {'synergy_percent': round(avg_synergy * 100, 2)}

    def recommend_teammate(self, current_team, top_n=3):
        if not current_team:
            return {'error': 'Añade un Pokémon para recibir recomendaciones.'}
        valid_team = [p for p in current_team if p in self.synergy_matrix.index]
        if not valid_team:
            return {'recommendations': []}
        team_vectors = self.synergy_matrix.loc[valid_team]
        recommendation_scores = team_vectors.sum(axis=0)
        recommendation_scores = recommendation_scores.drop(labels=[p for p in current_team if p in recommendation_scores.index], errors='ignore')
        top_recommendations = recommendation_scores.sort_values(ascending=False).head(top_n)
        return {'recommendations': top_recommendations.to_dict()}

    def recommend_build(self, pokemon_name):
        if pokemon_name not in self.df.index:
            return {'error': f'No hay datos para {pokemon_name}'}
        poke = self.df.loc[pokemon_name]
        # safe extracts
        def top_by_percent(lst):
            if not isinstance(lst, list) or not lst:
                return None
            try:
                sorted_list = sorted(lst, key=lambda x: float(x.get('percent', 0)), reverse=True)
                return sorted_list[0]
            except Exception:
                return lst[0]
        top_item = top_by_percent(poke.get('items') if isinstance(poke, dict) else poke.items)
        top_ability = top_by_percent(poke.get('abilities') if isinstance(poke, dict) else poke.abilities)
        top_spread = top_by_percent(poke.get('spreads') if isinstance(poke, dict) else poke.spreads)
        moves_sorted = sorted(poke.get('moves', []), key=lambda x: float(x.get('percent', 0)), reverse=True) if isinstance(poke, dict) else []
        top_moves = [m.get('move') for m in moves_sorted[:4] if m.get('move') != 'Other']
        return {
            'item': top_item.get('item') if top_item else None,
            'ability': top_ability.get('ability') if top_ability else None,
            'nature_and_evs': f"{top_spread.get('nature')} ({top_spread.get('ev')})" if top_spread else None,
            'moves': top_moves
        }

    def _build_greedy_team(self, seed=None, team_size=6):
        """Build a team greedily from a seed list using the synergy matrix."""
        if seed is None:
            seed = []
        team = [s for s in seed if isinstance(s, str)]
        # candidates are those present in the synergy matrix index
        candidates = list(self.synergy_matrix.index) if not self.synergy_matrix.empty else []
        # if no candidates, fallback to raw data names
        if not candidates and 'name' in self.df.columns:
            candidates = list(self.df['name'].dropna().unique())

        while len(team) < team_size:
            scores = {}
            for c in candidates:
                if c in team:
                    continue
                score = 0.0
                for m in team:
                    try:
                        if m in self.synergy_matrix.index and c in self.synergy_matrix.columns:
                            score += float(self.synergy_matrix.at[m, c])
                        elif c in self.synergy_matrix.index and m in self.synergy_matrix.columns:
                            score += float(self.synergy_matrix.at[c, m])
                    except Exception:
                        score += 0.0
                scores[c] = score
            if not scores:
                break
            # choose candidate with highest score
            best = max(scores.items(), key=lambda x: x[1])[0]
            team.append(best)
        return team

    def recommend_teams(self, seeds=None, top_k=3, team_size=6):
        """Generate up to `top_k` distinct teams, ranked by average synergy (closer to 1 is better).

        Approach: build greedy teams from a set of seed starters (provided or derived from most-connected pokemon),
        deduplicate identical teams and return the top_k by synergy.
        """
        # derive candidate starters
        starters = []
        if seeds:
            starters = [s for s in seeds if isinstance(s, str)]
        # if no seeds given, pick top outgoing-weight pokemon
        if not starters:
            if not self.synergy_matrix.empty:
                totals = self.synergy_matrix.sum(axis=1)
                starters = list(totals.sort_values(ascending=False).head(20).index)
            elif 'name' in self.df.columns:
                starters = list(self.df['name'].dropna().unique())[:20]

        teams = []
        seen = set()
        for starter in starters:
            base = [starter]
            team = self._build_greedy_team(seed=base, team_size=team_size)
            key = tuple(team)
            if key in seen:
                continue
            seen.add(key)
            score = self.analyze_team_synergy(team).get('synergy_percent', 0.0)
            teams.append({'team': team, 'synergy_percent': score})
            if len(teams) >= top_k:
                break

        # if we still have fewer than top_k, try building from empty seed to diversify
        if len(teams) < top_k:
            team = self._build_greedy_team(seed=[], team_size=team_size)
            key = tuple(team)
            if key not in seen:
                score = self.analyze_team_synergy(team).get('synergy_percent', 0.0)
                teams.append({'team': team, 'synergy_percent': score})

        # sort descending by synergy_percent
        teams = sorted(teams, key=lambda x: x['synergy_percent'], reverse=True)
        return {'teams': teams[:top_k]}
