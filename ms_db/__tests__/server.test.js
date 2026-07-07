/**
 * Pruebas unitarias de server.js (ms_db).
 * Mockea pg.Client, fs/promises y bcryptjs para no necesitar BD real.
 * Los tests de integración contra Postgres real están en tests/db.test.js.
 */
import { jest } from '@jest/globals';

// ── 1. Mocks — antes de importar server.js ──────────────────────────────────

// Mock de pg.Client
const mockConnect  = jest.fn().mockResolvedValue(undefined);
const mockEnd      = jest.fn().mockResolvedValue(undefined);
const mockQuery    = jest.fn();

const MockClient = jest.fn().mockImplementation(() => ({
  connect: mockConnect,
  query:   mockQuery,
  end:     mockEnd,
}));

await jest.unstable_mockModule('pg', () => ({
  Client: MockClient,
}));

// Mock de fs/promises (readFile y access)
const mockReadFile = jest.fn().mockResolvedValue('CREATE TABLE test (id SERIAL);\n');
const mockAccess   = jest.fn().mockResolvedValue(undefined);

await jest.unstable_mockModule('fs/promises', () => ({
  default: { readFile: mockReadFile, access: mockAccess },
  readFile: mockReadFile,
  access:   mockAccess,
}));

// Mock de bcryptjs (para ensureDefaultAdminOnCreate)
await jest.unstable_mockModule('bcryptjs', () => ({
  default: { hashSync: jest.fn().mockReturnValue('$2b$12$mockhashmockhashmockha') },
}));

// ── 2. Importar app después de mocks ────────────────────────────────────────

const { default: app } = await import('../server.js');
const { default: supertest } = await import('supertest');
const request = supertest(app);

// ── 3. Helpers ───────────────────────────────────────────────────────────────

/** Configura mockQuery para responder según el contenido SQL */
function setupQueryDefaults({
  dbExists = false,
  hasAdmin = false,
  hasUserEmail = false,
  mvFileExists = true,
  schemaError = null,
} = {}) {
  mockQuery.mockImplementation(async (sql, params) => {
    if (!sql) return { rows: [], rowCount: 0 };

    // createDatabaseIfNotExists: check if DB exists
    if (sql.includes('pg_database')) {
      return { rows: dbExists ? [{ '?column?': 1 }] : [], rowCount: dbExists ? 1 : 0 };
    }
    // ensureDefaultAdminOnCreate: check if admin exists
    if (sql.includes('is_admin = true')) {
      return { rows: hasAdmin ? [{ id: 1 }] : [], rowCount: hasAdmin ? 1 : 0 };
    }
    // ensureDefaultAdminOnCreate: check if email exists
    if (sql.includes('email = $1')) {
      return { rows: hasUserEmail ? [{ id: 2 }] : [], rowCount: hasUserEmail ? 1 : 0 };
    }
    // applyAdminMaterializedViews: REFRESH CONCURRENTLY
    if (sql.includes('REFRESH MATERIALIZED VIEW CONCURRENTLY')) {
      return { rows: [] };
    }
    // applyAdminMaterializedViews: REFRESH (fallback)
    if (sql.includes('REFRESH MATERIALIZED VIEW')) {
      return { rows: [] };
    }
    // Generic schema / MV statements: may throw if schemaError is set
    if (schemaError) throw schemaError;
    // Everything else: INSERT, CREATE, UPDATE...
    return { rows: [], rowCount: 0 };
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  // resetAllMocks clears MockClient.mockImplementation — restore it
  MockClient.mockImplementation(() => ({
    connect: mockConnect,
    query:   mockQuery,
    end:     mockEnd,
  }));
  mockConnect.mockResolvedValue(undefined);
  mockEnd.mockResolvedValue(undefined);
  mockReadFile.mockResolvedValue('CREATE TABLE test (id SERIAL PRIMARY KEY);\n');
  mockAccess.mockResolvedValue(undefined);
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /', () => {
  test('200 — devuelve nombre del servicio y DB', async () => {
    const res = await request.get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('ms_db');
    expect(res.body.db).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /init — base de datos creada por primera vez
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /init — DB nueva (se crea)', () => {
  test('200 — crea DB, aplica schema, aplica MV, crea admin', async () => {
    setupQueryDefaults({ dbExists: false, hasAdmin: false, hasUserEmail: false });
    const res = await request.post('/init');
    expect(res.status).toBe(200);
    expect(res.body.schema).toBe('applied');
    // La query CREATE DATABASE debe haberse llamado
    const sqlCalls = mockQuery.mock.calls.map(c => c[0]);
    expect(sqlCalls.some(s => s && s.includes('CREATE DATABASE'))).toBe(true);
  });

  test('200 — DB ya existe → no ejecuta CREATE DATABASE', async () => {
    setupQueryDefaults({ dbExists: true });
    const res = await request.post('/init');
    expect(res.status).toBe(200);
    const sqlCalls = mockQuery.mock.calls.map(c => c[0]);
    expect(sqlCalls.some(s => s && s.includes('CREATE DATABASE'))).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('200 — admin ya existe → no lo crea de nuevo', async () => {
    setupQueryDefaults({ dbExists: false, hasAdmin: true });
    const res = await request.post('/init');
    expect(res.status).toBe(200);
    const sqlCalls = mockQuery.mock.calls.map(c => c[0]);
    // No debe haber INSERT INTO users
    expect(sqlCalls.some(s => s && s.includes('INSERT INTO users'))).toBe(false);
  });

  test('200 — email admin ya existe → lo promueve a admin', async () => {
    setupQueryDefaults({ dbExists: false, hasAdmin: false, hasUserEmail: true });
    const res = await request.post('/init');
    expect(res.status).toBe(200);
    const sqlCalls = mockQuery.mock.calls.map(c => c[0]);
    expect(sqlCalls.some(s => s && s.includes('UPDATE users SET is_admin'))).toBe(true);
  });

  test('200 — el schema tiene objeto ya existente (42P07) → continúa sin fallar', async () => {
    let schemaCallCount = 0;
    mockQuery.mockImplementation(async (sql) => {
      if (!sql) return { rows: [], rowCount: 0 };
      if (sql.includes('pg_database')) return { rows: [], rowCount: 0 };
      if (sql.includes('CREATE DATABASE')) return { rows: [], rowCount: 0 };
      if (sql.includes('is_admin = true')) return { rows: [], rowCount: 0 };
      if (sql.includes('email = $1')) return { rows: [], rowCount: 0 };
      if (sql.includes('REFRESH')) return { rows: [] };
      // 1ª sentencia del schema → error "already exists"
      schemaCallCount++;
      if (schemaCallCount === 1) {
        const e = new Error('relation "test" already exists');
        e.code = '42P07';
        throw e;
      }
      return { rows: [], rowCount: 0 };
    });
    const res = await request.post('/init');
    expect(res.status).toBe(200);
  });

  test('500 — error real en schema → devuelve 500', async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (!sql) return { rows: [], rowCount: 0 };
      if (sql.includes('pg_database')) return { rows: [], rowCount: 0 };
      // Error real en la primera sentencia del schema
      throw new Error('syntax error at position 5');
    });
    const res = await request.post('/init');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /init — archivo de MV no existe
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /init — sin archivo de vistas materializadas admin', () => {
  test('200 — salta applyAdminMaterializedViews si no existe el archivo', async () => {
    setupQueryDefaults({ dbExists: true });
    mockAccess.mockRejectedValue(new Error('ENOENT'));
    const res = await request.post('/init');
    expect(res.status).toBe(200);
    // No debe haber llamadas REFRESH
    const sqlCalls = mockQuery.mock.calls.map(c => c[0]);
    expect(sqlCalls.some(s => s && s.includes('REFRESH'))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /init — REFRESH CONCURRENTLY falla → intenta sin CONCURRENTLY
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /init — fallback de REFRESH MATERIALIZED VIEW', () => {
  test('200 — si CONCURRENTLY falla, intenta REFRESH sin CONCURRENTLY', async () => {
    let refreshConcurrentlyCalled = false;
    mockQuery.mockImplementation(async (sql) => {
      if (!sql) return { rows: [], rowCount: 0 };
      if (sql.includes('pg_database')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      if (sql.includes('REFRESH MATERIALIZED VIEW CONCURRENTLY')) {
        refreshConcurrentlyCalled = true;
        throw new Error('cannot refresh concurrently without unique index');
      }
      if (sql.includes('REFRESH MATERIALIZED VIEW')) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    const res = await request.post('/init');
    expect(res.status).toBe(200);
    expect(refreshConcurrentlyCalled).toBe(true);
  });

  test('200 — si ambos REFRESH fallan, el warning no interrumpe el flujo', async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (!sql) return { rows: [], rowCount: 0 };
      if (sql.includes('pg_database')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      if (sql.includes('REFRESH')) throw new Error('view does not exist');
      return { rows: [], rowCount: 0 };
    });
    const res = await request.post('/init');
    expect(res.status).toBe(200);
  });
});
