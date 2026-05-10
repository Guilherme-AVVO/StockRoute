// Valida variáveis obrigatórias ao iniciar. Chamado no topo do server.js, após dotenv.
const required = [
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
];

const dbRequired = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
];

export function validateEnv() {
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Erro: ${key} não foi definido no .env`);
      process.exit(1);
    }
  }

  // Em produção, Railway/Render geralmente fornecem DATABASE_URL.
  // Em desenvolvimento local, o projeto pode continuar usando DB_HOST/DB_PORT/etc.
  if (!process.env.DATABASE_URL) {
    for (const key of dbRequired) {
      if (!process.env[key]) {
        console.error(`Erro: ${key} não foi definido no .env`);
        process.exit(1);
      }
    }
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error('Erro: JWT_SECRET deve ter pelo menos 32 caracteres');
    process.exit(1);
  }
}
