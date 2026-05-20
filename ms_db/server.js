import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DB = process.env.PGDEFAULTDB || 'postgres';
const TARGET_DB = process.env.DB_NAME || 'equiporocketDb';

const app = express();
app.use(express.json());

async function createDatabaseIfNotExists() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: DEFAULT_DB,
  });

  await client.connect();
  try {
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TARGET_DB]);
    if (res.rowCount > 0) {
      return { created: false, message: `Database ${TARGET_DB} already exists` };
    }
    await client.query(`CREATE DATABASE "${TARGET_DB}"`);
    return { created: true, message: `Database ${TARGET_DB} created` };
  } finally {
    await client.end();
  }
}

async function applySchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: TARGET_DB,
  });

  await client.connect();
  try {
    // Split on semicolons and run each non-empty statement. Keep semicolon when executing.
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      // Append semicolon back for clarity
      const toExec = stmt.endsWith(';') ? stmt : stmt + ';';
      try {
        await client.query(toExec);
      } catch (err) {
        // If a statement fails, throw with context
        throw new Error(`Error executing statement: ${err.message}\nStatement: ${toExec.substring(0,200)}`);
      }
    }

    return { applied: true };
  } finally {
    await client.end();
  }
}

app.post('/init', async (req, res) => {
  try {
    const result = await createDatabaseIfNotExists();
    // Siempre intentamos aplicar el esquema/seed; las sentencias en schema.sql
    // son idempotentes (ON CONFLICT DO NOTHING), por lo que es seguro ejecutarlas
    // aunque la base de datos ya exista.
    await applySchema();
    return res.status(200).json({ message: result.message, schema: 'applied' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.json({ service: 'ms_db', db: TARGET_DB }));

const port = process.env.PORT ? Number(process.env.PORT) : 4002;
if (process.argv[2] === 'init') {
  // Run init once and exit
  (async () => {
    try {
      console.log('Initializing database...');
      const result = await createDatabaseIfNotExists();
      console.log(result.message);
      // Aplicar esquema siempre: las sentencias son idempotentes
      await applySchema();
      console.log('Schema applied');
      process.exit(0);
    } catch (err) {
      console.error('Init failed:', err.message);
      process.exit(1);
    }
  })();
} else {
  app.listen(port, () => console.log(`ms_db listening on port ${port}`));
}

export default app;
