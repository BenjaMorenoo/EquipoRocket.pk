// src/utils/typeColors.js

export const TYPE_COLORS = {
  normal:   { bg: '#A8A878', text: '#fff', light: 'rgba(168,168,120,0.2)', border: 'rgba(168,168,120,0.5)' },
  fire:     { bg: '#F08030', text: '#fff', light: 'rgba(240,128,48,0.2)',  border: 'rgba(240,128,48,0.5)'  },
  water:    { bg: '#6890F0', text: '#fff', light: 'rgba(104,144,240,0.2)', border: 'rgba(104,144,240,0.5)' },
  electric: { bg: '#F8D030', text: '#222', light: 'rgba(248,208,48,0.2)',  border: 'rgba(248,208,48,0.5)'  },
  grass:    { bg: '#78C850', text: '#fff', light: 'rgba(120,200,80,0.2)',  border: 'rgba(120,200,80,0.5)'  },
  ice:      { bg: '#98D8D8', text: '#222', light: 'rgba(152,216,216,0.2)', border: 'rgba(152,216,216,0.5)' },
  fighting: { bg: '#C03028', text: '#fff', light: 'rgba(192,48,40,0.2)',   border: 'rgba(192,48,40,0.5)'   },
  poison:   { bg: '#A040A0', text: '#fff', light: 'rgba(160,64,160,0.2)',  border: 'rgba(160,64,160,0.5)'  },
  ground:   { bg: '#E0C068', text: '#222', light: 'rgba(224,192,104,0.2)', border: 'rgba(224,192,104,0.5)' },
  flying:   { bg: '#A890F0', text: '#fff', light: 'rgba(168,144,240,0.2)', border: 'rgba(168,144,240,0.5)' },
  psychic:  { bg: '#F85888', text: '#fff', light: 'rgba(248,88,136,0.2)',  border: 'rgba(248,88,136,0.5)'  },
  bug:      { bg: '#A8B820', text: '#fff', light: 'rgba(168,184,32,0.2)',  border: 'rgba(168,184,32,0.5)'  },
  rock:     { bg: '#B8A038', text: '#fff', light: 'rgba(184,160,56,0.2)',  border: 'rgba(184,160,56,0.5)'  },
  ghost:    { bg: '#705898', text: '#fff', light: 'rgba(112,88,152,0.2)',  border: 'rgba(112,88,152,0.5)'  },
  dragon:   { bg: '#7038F8', text: '#fff', light: 'rgba(112,56,248,0.2)',  border: 'rgba(112,56,248,0.5)'  },
  dark:     { bg: '#705848', text: '#fff', light: 'rgba(112,88,72,0.2)',   border: 'rgba(112,88,72,0.5)'   },
  steel:    { bg: '#B8B8D0', text: '#222', light: 'rgba(184,184,208,0.2)', border: 'rgba(184,184,208,0.5)' },
  fairy:    { bg: '#EE99AC', text: '#222', light: 'rgba(238,153,172,0.2)', border: 'rgba(238,153,172,0.5)' },
};

export const getTypeColor = (type) =>
  TYPE_COLORS[type?.toLowerCase()] || { bg: '#68A090', text: '#fff', light: 'rgba(104,160,144,0.2)', border: 'rgba(104,160,144,0.5)' };

// Simplified type chart (multiplier values)
// format: { attackingType: { defendingType: multiplier } }
const CHART = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export const ALL_TYPES = Object.keys(TYPE_COLORS);

/**
 * Calculate team's defensive weaknesses.
 * Returns { typeName: multiplier } for all 18 types.
 */
export const calculateTeamWeaknesses = (team) => {
  const weaknesses = {};
  ALL_TYPES.forEach((t) => (weaknesses[t] = 0));

  team.forEach((pokemon) => {
    if (!pokemon) return;
    const rawTypes = pokemon.types || [];
    const types = rawTypes.map((t) => (t?.type?.name || t?.name || String(t)).toLowerCase());

    ALL_TYPES.forEach((attackType) => {
      let mult = 1;
      types.forEach((defType) => {
        const row = CHART[attackType] || {};
        const val = row[defType];
        if (val !== undefined) mult *= val;
      });
      if (mult > 1)       weaknesses[attackType] += 1;
      else if (mult === 0) weaknesses[attackType] -= 1;
      else if (mult < 1)  weaknesses[attackType] -= 0.5;
    });
  });

  return weaknesses;
};

/**
 * Calculate team's offensive coverage.
 * Returns { typeName: count } how many defending types are covered (>=2x).
 */
export const calculateOffensiveCoverage = (team) => {
  const coverage = {};
  ALL_TYPES.forEach((t) => (coverage[t] = 0));

  team.forEach((pokemon) => {
    if (!pokemon) return;
    const rawTypes = pokemon.types || [];
    const types = rawTypes.map((t) => (t?.type?.name || t?.name || String(t)).toLowerCase());
    types.forEach((atkType) => {
      ALL_TYPES.forEach((defType) => {
        const row = CHART[atkType] || {};
        if ((row[defType] || 1) >= 2) coverage[defType] += 1;
      });
    });
  });

  return coverage;
};

export const STAT_COLORS = {
  hp:              '#22c55e',
  attack:          '#ef4444',
  defense:         '#3b82f6',
  'special-attack':  '#a855f7',
  'special-defense': '#06b6d4',
  speed:           '#f59e0b',
};

export const STAT_LABELS = {
  hp:              'HP',
  attack:          'Atk',
  defense:         'Def',
  'special-attack':  'SpA',
  'special-defense': 'SpD',
  speed:           'Vel',
};
