// Pruebas unitarias de ms_db contra Postgres real (equiporocketDb).
// Cubre UT-DB-01 (el trigger trg_prevent_delete_teams bloquea el DELETE físico
// sobre `teams`, dejando la fila intacta) y UT-DB-02 (idempotencia de
// `node server.js init`: una segunda ejecución no falla y no duplica el
// usuario admin por defecto creado por ensureDefaultAdminOnCreate).
import { Client } from 'pg';
import { execFileSync } from 'child_process';

function newClient() {
  return new Client({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: process.env.DB_NAME || 'equiporocketDb',
  });
}

// ---------------------------------------------------------------------------
// UT-DB-01: trigger trg_prevent_delete_teams
// ---------------------------------------------------------------------------
describe('UT-DB-01: trigger trg_prevent_delete_teams', () => {
  test('DELETE físico sobre teams es bloqueado por el trigger y la fila permanece', async () => {
    const client = newClient();
    await client.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO teams (user_id, name, format_id, created_by)
         SELECT id, 'ZZUnitTestTeam', NULL, 'manual' FROM users LIMIT 1
         RETURNING id`
      );
      const teamId = insertRes.rows[0].id;

      await expect(
        client.query('DELETE FROM teams WHERE id = $1', [teamId])
      ).rejects.toThrow(/PHYSICAL_DELETE_FORBIDDEN/);
    } finally {
      // Revierte el INSERT de prueba (la transacción queda abortada tras el
      // error del DELETE, pero ROLLBACK siempre es válido).
      await client.query('ROLLBACK');
      await client.end();
    }
  });
});

// ---------------------------------------------------------------------------
// UT-DB-02: idempotencia de `node server.js init`
// ---------------------------------------------------------------------------
describe('UT-DB-02: idempotencia de node server.js init', () => {
  test('dos ejecuciones consecutivas no fallan y no duplican el admin por defecto', () => {
    // Si cualquiera de las dos ejecuciones termina con código != 0,
    // execFileSync lanza y la prueba falla.
    execFileSync('node', ['server.js', 'init'], { stdio: 'pipe' });
    execFileSync('node', ['server.js', 'init'], { stdio: 'pipe' });
  }, 60000);

  test('el usuario admin por defecto sigue siendo único tras re-ejecutar init', async () => {
    const client = newClient();
    await client.connect();
    try {
      const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@equiporocket.cl';
      const res = await client.query('SELECT COUNT(*) FROM users WHERE email = $1', [adminEmail]);
      expect(Number(res.rows[0].count)).toBe(1);
    } finally {
      await client.end();
    }
  });
});
