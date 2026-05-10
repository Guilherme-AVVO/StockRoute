// pool.js – Gerencia conexão ao PostgreSQL usando postgres
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max:      20,
  idle_timeout:    30,
  connect_timeout: 2,
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
