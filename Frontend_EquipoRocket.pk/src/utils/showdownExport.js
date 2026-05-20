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
const pokemonToShowdown = (pokemon, config = {}) => {
  const name     = formatPokemonName(pokemon.name);
  const item     = config.item     || '';          // "@ Leftovers" o vacío
  const ability  = config.ability  || '';          // puede venir de la API
  const level    = config.level    || 100;
  const nature   = config.nature   || 'Hardy';     // naturaleza neutra por defecto
  const evs      = config.evs      || '';          // "252 HP / 4 Atk / 252 Spe"
  const ivs      = config.ivs      || '';
  const moves    = config.moves    || ['', '', '', ''];
  const shiny    = config.shiny    || false;
  const gender   = config.gender   || '';          // 'M', 'F' o ''
  const nickname = config.nickname || '';

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