import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validators, passwordStrength } from '../utils/validators';
import {
  TYPE_COLORS,
  ALL_TYPES,
  getTypeColor,
  calculateTeamWeaknesses,
  calculateOffensiveCoverage,
  STAT_COLORS,
  STAT_LABELS,
} from '../utils/typeColors';
import { exportTeamToShowdown, downloadTxt } from '../utils/showdownExport';
import { REGIONS, COUNTRIES_BY_REGION, MONTHS } from '../utils/regions';

// ─── validators ──────────────────────────────────────────────────────────────

describe('validators.username', () => {
  it('accepts a valid username', () => {
    expect(validators.username('PokeTrainer')).toBeNull();
  });
  it('rejects empty string', () => {
    expect(validators.username('')).toBeTruthy();
    expect(validators.username('   ')).toBeTruthy();
  });
  it('rejects null/undefined', () => {
    expect(validators.username(null)).toBeTruthy();
    expect(validators.username(undefined)).toBeTruthy();
  });
  it('rejects names longer than 50 chars', () => {
    expect(validators.username('a'.repeat(51))).toBeTruthy();
  });
  it('accepts exactly 50 chars', () => {
    expect(validators.username('a'.repeat(50))).toBeNull();
  });
});

describe('validators.email', () => {
  it('accepts valid email', () => {
    expect(validators.email('user@example.com')).toBeNull();
    expect(validators.email('admin@test.cl')).toBeNull();
  });
  it('rejects empty', () => {
    expect(validators.email('')).toBeTruthy();
    expect(validators.email('   ')).toBeTruthy();
    expect(validators.email(null)).toBeTruthy();
  });
  it('rejects email without @', () => {
    expect(validators.email('nodomain.com')).toBeTruthy();
  });
  it('rejects email without domain dot', () => {
    expect(validators.email('user@nodot')).toBeTruthy();
  });
  it('rejects email with spaces', () => {
    expect(validators.email('user @example.com')).toBeTruthy();
  });
});

describe('validators.password', () => {
  it('accepts strong password', () => {
    expect(validators.password('Secure1!')).toBeNull();
    expect(validators.password('MyPass1@')).toBeNull();
  });
  it('rejects null/empty', () => {
    expect(validators.password(null)).toBeTruthy();
    expect(validators.password('')).toBeTruthy();
  });
  it('rejects less than 8 chars', () => {
    expect(validators.password('Short1!')).toBeTruthy();
  });
  it('rejects no uppercase', () => {
    expect(validators.password('alllower1!')).toBeTruthy();
  });
  it('rejects no number', () => {
    expect(validators.password('NoNumber!')).toBeTruthy();
  });
  it('rejects no special char', () => {
    expect(validators.password('NoSpecial1')).toBeTruthy();
  });
});

describe('validators.confirmPassword', () => {
  it('accepts matching passwords', () => {
    expect(validators.confirmPassword('MyPass1!', 'MyPass1!')).toBeNull();
  });
  it('rejects empty confirm', () => {
    expect(validators.confirmPassword('', 'MyPass1!')).toBeTruthy();
    expect(validators.confirmPassword(null, 'MyPass1!')).toBeTruthy();
  });
  it('rejects mismatched passwords', () => {
    expect(validators.confirmPassword('Different1!', 'MyPass1!')).toBeTruthy();
  });
});

describe('validators.region', () => {
  it('accepts truthy value', () => {
    expect(validators.region('Latinoamerica')).toBeNull();
    expect(validators.region(1)).toBeNull();
  });
  it('rejects null/empty', () => {
    expect(validators.region(null)).toBeTruthy();
    expect(validators.region('')).toBeTruthy();
    expect(validators.region(undefined)).toBeTruthy();
  });
});

describe('validators.country', () => {
  it('accepts truthy value', () => {
    expect(validators.country('Chile')).toBeNull();
  });
  it('rejects null/empty', () => {
    expect(validators.country(null)).toBeTruthy();
    expect(validators.country('')).toBeTruthy();
  });
});

describe('validators.fechaNac', () => {
  it('accepts valid adult date', () => {
    expect(validators.fechaNac({ day: '15', month: '6', year: '2000' })).toBeNull();
  });
  it('rejects missing fields', () => {
    expect(validators.fechaNac({ day: '', month: '6', year: '2000' })).toBeTruthy();
    expect(validators.fechaNac({ day: '15', month: '', year: '2000' })).toBeTruthy();
    expect(validators.fechaNac({ day: '15', month: '6', year: '' })).toBeTruthy();
  });
  it('rejects invalid date (Feb 30)', () => {
    expect(validators.fechaNac({ day: '30', month: '2', year: '2000' })).toBeTruthy();
  });
  it('rejects age < 5', () => {
    const y = new Date().getFullYear() - 2;
    expect(validators.fechaNac({ day: '1', month: '1', year: String(y) })).toBeTruthy();
  });
  it('rejects age > 120', () => {
    expect(validators.fechaNac({ day: '1', month: '1', year: '1880' })).toBeTruthy();
  });
});

describe('passwordStrength', () => {
  it('returns score 0 for empty', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength(null).score).toBe(0);
  });
  it('returns score 1 for only length', () => {
    const result = passwordStrength('abcdefgh');
    expect(result.score).toBe(1);
    expect(result.label).toBeTruthy();
  });
  it('returns score 4 for all criteria', () => {
    const result = passwordStrength('Secure1!');
    expect(result.score).toBe(4);
    expect(result.color).toBe('#22c55e');
  });
  it('returns score 2 for length + uppercase', () => {
    const result = passwordStrength('Abcdefgh');
    expect(result.score).toBe(2);
  });
  it('returns score 3 for length + uppercase + digit', () => {
    const result = passwordStrength('Abcdefg1');
    expect(result.score).toBe(3);
  });
});

// ─── typeColors ───────────────────────────────────────────────────────────────

describe('TYPE_COLORS', () => {
  it('has exactly 18 types', () => {
    expect(Object.keys(TYPE_COLORS)).toHaveLength(18);
  });
  it('each entry has bg, text, light, border', () => {
    Object.values(TYPE_COLORS).forEach((c) => {
      expect(c).toHaveProperty('bg');
      expect(c).toHaveProperty('text');
      expect(c).toHaveProperty('light');
      expect(c).toHaveProperty('border');
    });
  });
});

describe('ALL_TYPES', () => {
  it('has 18 entries matching TYPE_COLORS keys', () => {
    expect(ALL_TYPES).toHaveLength(18);
    ALL_TYPES.forEach((t) => expect(TYPE_COLORS).toHaveProperty(t));
  });
});

describe('getTypeColor', () => {
  it('returns correct color for known type', () => {
    expect(getTypeColor('fire').bg).toBe('#F08030');
    expect(getTypeColor('water').bg).toBe('#6890F0');
  });
  it('is case-insensitive', () => {
    expect(getTypeColor('FIRE')).toEqual(getTypeColor('fire'));
    expect(getTypeColor('Water')).toEqual(getTypeColor('water'));
  });
  it('returns fallback for unknown type', () => {
    const fallback = getTypeColor('unknown_type_xyz');
    expect(fallback).toHaveProperty('bg');
    expect(fallback.bg).toBe('#68A090');
  });
  it('handles null/undefined gracefully', () => {
    expect(getTypeColor(null)).toHaveProperty('bg');
    expect(getTypeColor(undefined)).toHaveProperty('bg');
  });
});

describe('calculateTeamWeaknesses', () => {
  it('returns all zeros for empty team', () => {
    const result = calculateTeamWeaknesses([]);
    ALL_TYPES.forEach((t) => expect(result[t]).toBe(0));
  });

  it('returns all zeros for team of nulls', () => {
    const result = calculateTeamWeaknesses([null, null]);
    ALL_TYPES.forEach((t) => expect(result[t]).toBe(0));
  });

  it('fire type is weak to water', () => {
    const firePokemon = { types: [{ type: { name: 'fire' } }] };
    const result = calculateTeamWeaknesses([firePokemon]);
    expect(result['water']).toBeGreaterThan(0);
  });

  it('fire type resists grass', () => {
    const firePokemon = { types: [{ type: { name: 'fire' } }] };
    const result = calculateTeamWeaknesses([firePokemon]);
    expect(result['grass']).toBeLessThan(0);
  });

  it('ghost type is immune to normal (counted as -1)', () => {
    const ghostPokemon = { types: [{ type: { name: 'ghost' } }] };
    const result = calculateTeamWeaknesses([ghostPokemon]);
    expect(result['normal']).toBe(-1);
  });

  it('accumulates across multiple pokemon', () => {
    const fireP = { types: [{ type: { name: 'fire' } }] };
    const result = calculateTeamWeaknesses([fireP, fireP]);
    expect(result['water']).toBe(2);
  });
});

describe('calculateOffensiveCoverage', () => {
  it('returns all zeros for empty team', () => {
    const result = calculateOffensiveCoverage([]);
    ALL_TYPES.forEach((t) => expect(result[t]).toBe(0));
  });

  it('fire type covers grass, ice, bug, steel', () => {
    const firePokemon = { types: [{ type: { name: 'fire' } }] };
    const result = calculateOffensiveCoverage([firePokemon]);
    expect(result['grass']).toBeGreaterThan(0);
    expect(result['ice']).toBeGreaterThan(0);
    expect(result['bug']).toBeGreaterThan(0);
    expect(result['steel']).toBeGreaterThan(0);
  });

  it('skips null pokemon', () => {
    const result = calculateOffensiveCoverage([null]);
    ALL_TYPES.forEach((t) => expect(result[t]).toBe(0));
  });
});

describe('STAT_COLORS and STAT_LABELS', () => {
  it('has all 6 stats', () => {
    const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    stats.forEach((s) => {
      expect(STAT_COLORS).toHaveProperty(s);
      expect(STAT_LABELS).toHaveProperty(s);
    });
  });
});

// ─── showdownExport ───────────────────────────────────────────────────────────

describe('exportTeamToShowdown', () => {
  it('returns empty string for empty team', () => {
    expect(exportTeamToShowdown([])).toBe('');
    expect(exportTeamToShowdown([null, null])).toBe('');
  });

  it('generates header with team name', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu' }], { name: 'Mi Equipo' });
    expect(output).toContain('=== Mi Equipo ===');
  });

  it('uses default team name when not provided', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu' }]);
    expect(output).toContain('Mi Equipo');
  });

  it('includes format when provided', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu' }], { format: 'VGC 2024' });
    expect(output).toContain('Formato: VGC 2024');
  });

  it('capitalizes simple pokemon name', () => {
    const output = exportTeamToShowdown([{ name: 'charizard' }]);
    expect(output).toContain('Charizard');
  });

  it('handles special names like mr-mime', () => {
    const output = exportTeamToShowdown([{ name: 'mr-mime' }]);
    expect(output).toContain('Mr. Mime');
  });

  it('handles porygon-z special name', () => {
    const output = exportTeamToShowdown([{ name: 'porygon-z' }]);
    expect(output).toContain('Porygon-Z');
  });

  it('includes item when provided', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', item: 'Choice Specs' }]);
    expect(output).toContain('@ Choice Specs');
  });

  it('includes ability when provided', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', ability: 'Static' }]);
    expect(output).toContain('Ability: Static');
  });

  it('includes moves as strings', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', moves: ['Thunderbolt', 'Quick Attack'] }]);
    expect(output).toContain('- Thunderbolt');
    expect(output).toContain('- Quick Attack');
  });

  it('includes moves as objects with name property', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', moves: [{ name: 'Thunderbolt' }] }]);
    expect(output).toContain('- Thunderbolt');
  });

  it('fills empty moves with placeholder', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu' }]);
    expect(output).toContain('- Movimiento pendiente');
  });

  it('includes shiny when true', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', shiny: true }]);
    expect(output).toContain('Shiny: Yes');
  });

  it('omits shiny line when false', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', shiny: false }]);
    expect(output).not.toContain('Shiny');
  });

  it('includes level when not 100', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', level: 50 }]);
    expect(output).toContain('Level: 50');
  });

  it('omits level when 100', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', level: 100 }]);
    expect(output).not.toContain('Level:');
  });

  it('includes EVs string directly', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', evs: '252 Atk / 4 SpD / 252 Spe' }]);
    expect(output).toContain('EVs: 252 Atk / 4 SpD / 252 Spe');
  });

  it('builds EVs from spread object', () => {
    const output = exportTeamToShowdown([{
      name: 'pikachu',
      spread: { hp_evs: 4, attack_evs: 252, speed_evs: 252, nature: 'Jolly' },
    }]);
    expect(output).toContain('EVs: 4 HP / 252 Atk / 252 Spe');
    expect(output).toContain('Jolly Nature');
  });

  it('includes IVs when provided', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', ivs: '0 Atk' }]);
    expect(output).toContain('IVs: 0 Atk');
  });

  it('uses Hardy nature as default', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu' }]);
    expect(output).toContain('Hardy Nature');
  });

  it('uses nickname in header', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', nickname: 'Sparky' }]);
    expect(output).toContain('Sparky (Pikachu)');
  });

  it('uses gender when provided', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', gender: 'M' }]);
    expect(output).toContain('(M)');
  });

  it('uses item_name fallback', () => {
    const output = exportTeamToShowdown([{ name: 'pikachu', item_name: 'Life Orb' }]);
    expect(output).toContain('@ Life Orb');
  });

  it('handles multiple pokemon with blank separator', () => {
    const output = exportTeamToShowdown([
      { name: 'pikachu' },
      { name: 'charizard' },
    ]);
    expect(output).toContain('Pikachu');
    expect(output).toContain('Charizard');
  });

  it('uses MissingNo when name is absent', () => {
    const output = exportTeamToShowdown([{}]);
    expect(output).toContain('MissingNo');
  });

  it('uses species field as name fallback', () => {
    const output = exportTeamToShowdown([{ species: 'bulbasaur' }]);
    expect(output).toContain('Bulbasaur');
  });
});

describe('downloadTxt', () => {
  let createObjectURLSpy;
  let revokeObjectURLSpy;
  let appendChildSpy;
  let removeChildSpy;
  let clickSpy;

  beforeEach(() => {
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    clickSpy = vi.fn();

    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;

    const mockAnchor = {
      href: '',
      download: '',
      click: clickSpy,
      style: {},
    };
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob and triggers download', () => {
    downloadTxt('Hello World', 'test.txt');
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('uses default filename when not provided', () => {
    const mockAnchor = { href: '', download: '', click: clickSpy };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    downloadTxt('content');
    expect(mockAnchor.download).toBe('equipo.txt');
  });
});

// ─── regions ──────────────────────────────────────────────────────────────────

describe('REGIONS', () => {
  it('is an array with at least 1 region', () => {
    expect(Array.isArray(REGIONS)).toBe(true);
    expect(REGIONS.length).toBeGreaterThan(0);
  });
  it('each region has id and name', () => {
    REGIONS.forEach((r) => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('name');
    });
  });
});

describe('COUNTRIES_BY_REGION', () => {
  it('is an object keyed by region id', () => {
    expect(typeof COUNTRIES_BY_REGION).toBe('object');
    REGIONS.forEach((r) => {
      expect(COUNTRIES_BY_REGION).toHaveProperty(String(r.id));
    });
  });
  it('each entry is an array of countries with id and name', () => {
    Object.values(COUNTRIES_BY_REGION).forEach((countries) => {
      expect(Array.isArray(countries)).toBe(true);
      countries.forEach((c) => {
        expect(c).toHaveProperty('id');
        expect(c).toHaveProperty('name');
      });
    });
  });
});

describe('MONTHS', () => {
  it('has exactly 12 months', () => {
    expect(MONTHS).toHaveLength(12);
  });
  it('each month has v and label', () => {
    MONTHS.forEach((m) => {
      expect(m).toHaveProperty('v');
      expect(m).toHaveProperty('label');
    });
  });
});
