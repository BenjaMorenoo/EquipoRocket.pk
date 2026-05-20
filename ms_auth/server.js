// server.js — Punto de entrada del microservicio auth
import app             from './src/app.js';
import { env }         from './src/config/env.js';
import { testConnection, pool } from './src/config/db.js';
import { logger }      from './src/utils/logger.js';

const start = async () => {
  // ── Verificar conexión a la base de datos ──────────────────────────────
  logger.info('Verificando conexión a PostgreSQL...');
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.error('❌ No se pudo conectar a PostgreSQL. Verifica DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD en .env');
    process.exit(1);
  }
  logger.info('✅ Conexión a PostgreSQL establecida.');

  // ── Levantar servidor ──────────────────────────────────────────────────
  const server = app.listen(env.port, () => {
    logger.info(`🚀 ${env.service} corriendo en http://localhost:${env.port}`);
    logger.info(`   Entorno: ${env.nodeEnv}`);
    logger.info(`   CORS:    ${env.cors.origin}`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} recibido. Cerrando servidor...`);
    server.close(async () => {
      await pool.end();
      logger.info('Servidor y pool de DB cerrados correctamente.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
  });
};

start();
