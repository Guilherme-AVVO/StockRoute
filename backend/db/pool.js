// pool.js – Gerencia conexão ao PostgreSQL usando postgres
import 'dotenv/config';
import postgres from 'postgres';

function getSslConfig() {
  if (process.env.DB_SSL !== 'true') return false;
  if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
    return { rejectUnauthorized: false };
  }
  return 'require';
}

const commonOptions = {
  max:      20,
  idle_timeout:    30,
  connect_timeout: 2,
  ssl: getSslConfig(),
};

const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, commonOptions)
  : postgres({
      host:     process.env.DB_HOST,
      port:     process.env.DB_PORT,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ...commonOptions,
    });

// Teste de conexão ao iniciar o módulo
(async () => {
  try {
    await sql`SELECT 1`;
    console.log('[DB] Conexão OK');
  } catch (err) {
    console.error('[DB] Falha na conexão:', err.message);
    process.exit(1);
  }
})();

export default sql;
