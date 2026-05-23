// src/utils/showdownExport.js
// Genera el archivo .txt compatible con Pokemon Showdown y Pikalytics.
//
// Formato oficial Showdown:
// Nombre (Apodo) @ Item
// Ability: Habilidad
// Level: 100
// EVs: 252 Atk / 4 SpD / 252 Spe
// Nature Nature
// - Movimiento 1
// - Movimiento 2
// - Movimiento 3
// - Movimiento 4

/**
 * Capitaliza correctamente nombres con guion (p.ej. "mr-mime" → "Mr. Mime")
 */
const formatPokemonName = (name) => {
  const specials = {
    'mr-mime':        'Mr. Mime',
    'mr-rime':        'Mr. Rime',
    'mime-jr':        'Mime Jr.',
    'ho-oh':          'Ho-Oh',
    'porygon-z':      'Porygon-Z',
    'jangmo-o':       'Jangmo-o',
    'hakamo-o':       'Hakamo-o',
    'kommo-o':        'Kommo-o',
    'ting-lu':        'Ting-Lu',
    'chien-pao':      'Chien-Pao',
    'wo-chien':       'Wo-Chien',
    'chi-yu':         'Chi-Yu',
    'great-tusk':     'Great Tusk',
    'iron-treads':    'Iron Treads',
    'iron-bundle':    'Iron Bundle',
    'iron-hands':     'Iron Hands',
    'iron-jugulis':   'Iron Jugulis',
    'iron-moth':      'Iron Moth',
    'iron-thorns':    'Iron Thorns',
    'iron-valiant':   'Iron Valiant',
    'roaring-moon':   'Roaring Moon',
    'flutter-mane':   'Flutter Mane',
    'sandy-shocks':   'Sandy Shocks',
    'scream-tail':    'Scream Tail',
    'brute-bonnet':   'Brute Bonnet',
    'walking-wake':   'Walking Wake',
    'iron-leaves':    'Iron Leaves',
  };

  if (specials[name]) return specials[name];

  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
};

/**
 * Genera el bloque Showdown de un solo Pokémon.
 * Los campos que el usuario aún no puede configurar (moves, EVs, item)
 * se dejan en el formato estándar con valores placeholder,
 * listos para ser editados en Showdown o Pikalytics.
 *
 * @param {object} pokemon - Objeto de PokéAPI
 * @param {object} config  - Configuración personalizada opcional
 */
const pokemonToShowdown = (pokemon) => {
  const name     = formatPokemonName(pokemon.name || pokemon.species || pokemon.pokemon || 'MissingNo');
  const item     = pokemon.item || pokemon.item_name || '';
  const ability  = pokemon.ability || pokemon.ability_name || '';
  const level    = pokemon.level || 100;
  // nature: try spread/nature fields first, fallback to provided nature or 'Hardy'
  const nature   = pokemon.nature || pokemon.nature_name || (pokemon.spread && pokemon.spread.nature) || 'Hardy';
  // EVs: if explicit `evs` string provided, use it; else build from spread fields if available
  let evs = '';
  if (pokemon.evs) evs = pokemon.evs;
  else if (pokemon.spread) {
    const s = pokemon.spread;
    const parts = [];
    if (s.hp_evs) parts.push(`${s.hp_evs} HP`);
    if (s.attack_evs) parts.push(`${s.attack_evs} Atk`);
    if (s.defense_evs) parts.push(`${s.defense_evs} Def`);
    if (s.sp_attack_evs) parts.push(`${s.sp_attack_evs} SpA`);
    if (s.sp_defense_evs) parts.push(`${s.sp_defense_evs} SpD`);
    if (s.speed_evs) parts.push(`${s.speed_evs} Spe`);
    evs = parts.join(' / ');
  }
  const ivs      = pokemon.ivs || '';
  // moves may be array of strings or objects
  const movesArr = Array.isArray(pokemon.moves) ? pokemon.moves.map(m => (typeof m === 'string' ? m : (m?.name || m?.move || 'Movimiento pendiente'))) : [];
  const moves    = movesArr.length ? movesArr : ['', '', '', ''];
  const shiny    = !!pokemon.shiny;
  const gender   = pokemon.gender || '';
  const nickname = pokemon.nickname || pokemon.nick || '';

  const lines = [];

  // ── Línea 1: nombre (apodo) @ item ──────────────────────────────────────
  let header = nickname ? `${nickname} (${name})` : name;
  if (gender)   header += ` (${gender})`;
  if (item)     header += ` @ ${item}`;
  lines.push(header);

  // ── Ability ──────────────────────────────────────────────────────────────
  if (ability) lines.push(`Ability: ${ability}`);

  // ── Shiny ────────────────────────────────────────────────────────────────
  if (shiny) lines.push('Shiny: Yes');

  // ── Level ────────────────────────────────────────────────────────────────
  if (level !== 100) lines.push(`Level: ${level}`);

  // ── EVs ──────────────────────────────────────────────────────────────────
  if (evs) lines.push(`EVs: ${evs}`);

  // ── IVs (solo si no son todos 31) ────────────────────────────────────────
  if (ivs) lines.push(`IVs: ${ivs}`);

  // ── Nature ───────────────────────────────────────────────────────────────
  lines.push(`${nature} Nature`);

  // ── Movimientos ──────────────────────────────────────────────────────────
  const filledMoves = [...moves, '', '', '', ''].slice(0, 4);
  filledMoves.forEach(m => {
    lines.push(`- ${m || 'Movimiento pendiente'}`);
  });

  return lines.join('\n');
};

/**
 * Exporta un equipo completo al formato Showdown.
 * @param {object[]} team       - Array de hasta 6 Pokémon (objetos de PokéAPI)
 * @param {object}   teamMeta  - { name, format }
 * @returns {string}            - Texto listo para copiar/descargar
 */
export const exportTeamToShowdown = (team, teamMeta = {}) => {
  const pokemon = team.filter(Boolean);
  if (pokemon.length === 0) return '';

  const header = [
    `=== ${teamMeta.name || 'Mi Equipo'} ===`,
    teamMeta.format ? `Formato: ${teamMeta.format}` : '',
    `Exportado desde EquipoRocket.pk`,
    `Fecha: ${new Date().toLocaleDateString('es-CL')}`,
    '',
    '--- Importar en Showdown: Teambuilder → Import/Export ---',
    '',
  ].filter(Boolean).join('\n');

  const blocks = pokemon.map(pk => pokemonToShowdown(pk)).join('\n\n');

  return header + blocks + '\n';
};

/**
 * Dispara la descarga del archivo .txt en el navegador.
 * @param {string} content  - Texto a descargar
 * @param {string} filename - Nombre del archivo
 */
export const downloadTxt = (content, filename = 'equipo.txt') => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};