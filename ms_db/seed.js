/**
 * seed.js — Poblar equiporocketDb con datos de demostración
 * Uso: node seed.js
 * Dentro del contenedor: docker compose exec ms_db node seed.js
 *
 * REQUISITO: ms_carga_api debe haberse ejecutado antes para que la tabla
 * pokemon tenga datos. El seed usa los IDs que ya existan en esa tabla.
 *
 * Inserta ~90 usuarios, ~220 equipos, ~120 simulaciones y ~90 feedbacks
 * distribuidos en los últimos 12 meses para que todos los gráficos del
 * panel de administración muestren datos realistas.
 *
 * Es seguro ejecutarlo solo una vez. Si ya hay ≥10 usuarios normales
 * el script termina sin hacer nada (la BD ya fue sembrada).
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const TARGET_DB = process.env.DB_NAME || 'equiporocketDb';

// ─────────────────────────────────────────────────────────────────────────────
// Datos de demostración
// ─────────────────────────────────────────────────────────────────────────────

// country_ids válidos agrupados por region_id (coinciden con schema.sql)
const REGION_COUNTRIES = {
  1: [1,2,3,4,5,6,7,8,9,10,11,12,16,17,19,20],
  2: [21,22],
  3: [23,32,35,40,47,48,49,52,53],
  4: [55,56,59,61,63,64],
  5: [67,68,74],
  6: [75,76],
};

// Distribución de regiones: [region_id, peso%]
const REGION_WEIGHTS = [[1,38],[2,18],[3,24],[4,12],[5,4],[6,4]];

const NAME_PARTS = [
  'Ash','Brock','Misty','Dawn','May','Gary','Red','Blue','Gold','Silver',
  'Lucas','Lyra','Ethan','Brendan','Rosa','Nate','Calem','Serena','Elio',
  'Selene','Victor','Gloria','Rei','Florian','Juliana','Nemona','Penny',
  'Arven','Hop','Sonia','Bede','Marnie','Leon','Hau','Lillie','Gladion',
  'Kukui','Lana','Mallow','Kiawe','Sophocles','Olivia','Nanu','Hapu',
  'Guzma','Plumeria','Colress','Grimsley','Shauntal','Iris','Drayden',
  'Elesa','Skyla','Clay','Burgh','Roxie','Cheren','Bianca','Hilbert',
];

const TEAM_NAMES = [
  'Equipo Fuego','Team Dragon','Viento y Trueno','Las Sombras',
  'Cascada Azul','Roca Sólida','Veneno Verde','Cielo Libre',
  'Fantasmas del Norte','Hielo Eterno','Fuerza Bruta','Velocidad Pura',
  'La Defensa','Ataque Total','Balance VGC','Hyper Offense',
  'Bulky Offense','Rain Team','Sun Warriors','Trick Room',
  'Sandstorm Squad','Steel Wall','Fairy Garden','Ghost Protocol',
  'Dark Side','Bug Swarm','Ground Zero','Flying Squad',
  'Water Works','Electric Surge','Grassy Terrain','Misty Fog',
];

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

const ri   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[ri(0, arr.length - 1)];

function pickRegion() {
  const n = ri(1, 100);
  let cum = 0;
  for (const [rid, w] of REGION_WEIGHTS) {
    cum += w;
    if (n <= cum) return rid;
  }
  return 1;
}

// Fecha aleatoria con sesgo hacia meses recientes (curva de crecimiento)
function randGrowthDate(start, end) {
  const t = Math.pow(Math.random(), 0.65);
  return new Date(start.getTime() + t * (end.getTime() - start.getTime()));
}

function randDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pgTs(d) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  const client = new Client({
    host:     process.env.PGHOST     || 'localhost',
    port:     process.env.PGPORT     ? Number(process.env.PGPORT) : 5432,
    user:     process.env.PGUSER     || 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: TARGET_DB,
  });

  await client.connect();
  console.log(`Conectado a "${TARGET_DB}"`);

  try {
    // ── Guardia: no sembrar si ya hay datos de usuarios normales
    const userCheck = await client.query(
      "SELECT COUNT(*) AS c FROM users WHERE is_admin = false"
    );
    if (parseInt(userCheck.rows[0].c) >= 10) {
      console.log(
        `ℹ La base ya tiene ${userCheck.rows[0].c} usuarios normales — seed omitido.\n` +
        `  Para sembrar desde cero: reinicia la BD con "npm run init-db" primero.`
      );
      return;
    }

    // ── Guardia: verificar que existan Pokémon (cargados por ms_carga_api)
    const pkmnCheck = await client.query('SELECT id FROM pokemon LIMIT 1');
    if (pkmnCheck.rowCount === 0) {
      console.error(
        '✗ La tabla pokemon está vacía.\n' +
        '  Ejecuta ms_carga_api primero para cargar los datos de Pokémon:\n' +
        '    docker compose exec ms_carga_api curl -X POST http://localhost:8000/load'
      );
      process.exit(1);
    }

    // Cargar todos los IDs de Pokémon disponibles
    const pkmnRows = await client.query('SELECT id FROM pokemon');
    const pkmnIds  = pkmnRows.rows.map(r => r.id);
    console.log(`  Pokémon disponibles en BD: ${pkmnIds.length}`);

    await client.query('BEGIN');

    // ── 1. Usuarios ───────────────────────────────────────────────────────
    console.log('→ Usuarios...');
    const SEED_START = new Date('2025-07-01');
    const SEED_END   = new Date('2026-07-04');
    const USER_COUNT = 90;

    const userRecords    = [];
    const takenUsernames = new Set();

    for (let i = 0; i < USER_COUNT; i++) {
      let username;
      do {
        username = `${pick(NAME_PARTS)}${pick(NAME_PARTS)}${ri(10, 9999)}`;
      } while (takenUsernames.has(username));
      takenUsernames.add(username);

      const email     = `${username.toLowerCase()}@demo.pk`;
      const regionId  = pickRegion();
      const countryId = pick(REGION_COUNTRIES[regionId]);
      const regDate   = randGrowthDate(SEED_START, SEED_END);

      // Edad 14-38 al momento del registro
      const age      = ri(14, 38);
      const birthYr  = regDate.getFullYear() - age;
      const fechaNac = `${birthYr}-${String(ri(1,12)).padStart(2,'0')}-${String(ri(1,28)).padStart(2,'0')}`;
      const isActive = Math.random() > 0.08; // 92% activos

      const res = await client.query(
        `INSERT INTO users
           (username, email, password_hash, region_id, country_id, fecha_nac, is_admin, is_active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,false,$7,$8)
         RETURNING id`,
        [
          username,
          email,
          '$2b$12$seedseedseedseedseedse.seedhashseedhashseedha',
          regionId,
          countryId,
          fechaNac,
          isActive,
          pgTs(regDate),
        ]
      );
      userRecords.push({ id: res.rows[0].id, regionId, regDate });
    }

    // ── 2. Equipos + team_pokemon ─────────────────────────────────────────
    console.log('→ Equipos...');
    const TEAM_COUNT  = 220;
    const teamRecords = [];

    for (let i = 0; i < TEAM_COUNT; i++) {
      const user      = pick(userRecords);
      const createdBy = Math.random() < 0.38 ? 'ai' : 'manual';
      const teamDate  = randDate(
        new Date(Math.max(user.regDate.getTime(), SEED_START.getTime())),
        SEED_END
      );
      const winRate      = (35 + Math.random() * 55).toFixed(2);
      const synergyScore = (40 + Math.random() * 55).toFixed(2);
      const name         = `${pick(TEAM_NAMES)} ${ri(1,99)}`;

      const res = await client.query(
        `INSERT INTO teams
           (user_id, name, synergy_score, win_rate, created_by, created_at, active)
         VALUES ($1,$2,$3,$4,$5,$6,true)
         RETURNING id`,
        [user.id, name, synergyScore, winRate, createdBy, pgTs(teamDate)]
      );
      const teamId = res.rows[0].id;
      teamRecords.push({ id: teamId, userId: user.id, teamDate, createdBy });

      // Pokémon del equipo: 3-6 slots sin repetir
      const slotCount = ri(3, 6);
      const usedPkmn  = new Set();
      for (let slot = 1; slot <= slotCount; slot++) {
        let pkmnId;
        let tries = 0;
        do { pkmnId = pick(pkmnIds); tries++; }
        while (usedPkmn.has(pkmnId) && tries < 15);
        usedPkmn.add(pkmnId);

        await client.query(
          'INSERT INTO team_pokemon (team_id, pokemon_id, slot) VALUES ($1,$2,$3)',
          [teamId, pkmnId, slot]
        );
      }
    }

    // ── 3. Simulaciones de batalla ────────────────────────────────────────
    console.log('→ Simulaciones...');
    const SIM_COUNT = 120;

    for (let i = 0; i < SIM_COUNT; i++) {
      const userRec    = pick(userRecords);
      const teamA      = pick(teamRecords);
      const otherTeams = teamRecords.filter(t => t.id !== teamA.id);
      const teamB      = pick(otherTeams);

      const simDate     = randDate(
        new Date(Math.max(teamA.teamDate.getTime(), teamB.teamDate.getTime(), SEED_START.getTime())),
        SEED_END
      );
      const probA       = 30 + Math.random() * 40;
      const probB       = 100 - probA;
      const winnerId    = Math.random() < probA / 100 ? teamA.id : teamB.id;
      const scoreA      = ri(0, 6);
      const scoreB      = ri(0, 6);
      const simCount    = pick([100, 200, 500, 1000]);
      const durationMs  = ri(600, 12000);
      const completedAt = new Date(simDate.getTime() + durationMs);

      await client.query(
        `INSERT INTO battle_simulations
           (user_id, team_a_id, team_b_id, winner_team_id,
            team_a_score, team_b_score,
            team_a_win_probability, team_b_win_probability,
            simulation_count, simulation_type,
            created_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'montecarlo',$10,$11)`,
        [
          userRec.id,
          teamA.id, teamB.id, winnerId,
          scoreA, scoreB,
          probA.toFixed(2), probB.toFixed(2),
          simCount,
          pgTs(simDate),
          pgTs(completedAt),
        ]
      );
    }

    // ── 4. Feedback de equipos ────────────────────────────────────────────
    console.log('→ Feedback...');
    const FB_COUNT = 90;

    for (let i = 0; i < FB_COUNT; i++) {
      const team   = pick(teamRecords);
      const fbDate = randDate(
        new Date(Math.max(team.teamDate.getTime(), SEED_START.getTime())),
        SEED_END
      );

      await client.query(
        `INSERT INTO team_feedback
           (team_id, user_id, wins, loses, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [team.id, team.userId, ri(0, 30), ri(0, 20), team.createdBy, pgTs(fbDate)]
      );
    }

    await client.query('COMMIT');

    console.log('\n✓ Seed completado exitosamente:');
    console.log(`  • ${USER_COUNT} usuarios (jul 2025 → jul 2026, distribución por región)`);
    console.log(`  • ${TEAM_COUNT} equipos (~38% IA, ~62% manual, 3-6 Pokémon c/u)`);
    console.log(`  • ${SIM_COUNT} simulaciones Monte Carlo con ganador y duración`);
    console.log(`  • ${FB_COUNT} registros de feedback`);
    console.log('\n  Refresca las vistas materializadas para actualizar los gráficos:');
    console.log('  docker compose exec ms_db npm run init-db');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch(err => {
  console.error('\n✗ Seed falló:', err.message || err);
  process.exit(1);
});
