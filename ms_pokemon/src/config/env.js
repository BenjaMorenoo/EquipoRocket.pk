export const env = {
  db: {
    host: process.env.PGHOST || 'postgres',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.DB_NAME || process.env.PGDATABASE || 'equiporocketDb',
    max: 5,
  },
};
