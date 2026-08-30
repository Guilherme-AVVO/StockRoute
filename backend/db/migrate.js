#!/usr/bin/env node
// Executa migrations e seeds contra o banco configurado em DATABASE_URL (ou vars DB_*).
// Uso:
//   node db/migrate.js            → só migrations
//   node db/migrate.js --seed     → migrations + seed
import 'dotenv/config';
import postgres from 'postgres';
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resetDemo = process.argv.includes('--demo-reset');
const runSeed = process.argv.includes('--seed') || resetDemo;

function getSslConfig() {
  if (process.env.DB_SSL !== 'true') return false;
  if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') return { rejectUnauthorized: false };
  return 'require';
}

const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: getSslConfig(), max: 1 })
  : postgres({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: getSslConfig(),
      max: 1,
    });

async function runFile(filePath, label) {
  const content = readFileSync(filePath, 'utf-8');
  console.log(`  → ${label}`);
  await sql.unsafe(content);
}

async function main() {
  console.log('[migrate] Conectando ao banco...');
  await sql`SELECT 1`;
  console.log('[migrate] Conexão OK\n');

  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  console.log(`[migrate] Rodando ${files.length} migration(s)...`);
  for (const file of files) {
    await runFile(join(migrationsDir, file), file);
  }
  console.log('[migrate] Migrations concluídas.\n');

  if (resetDemo) {
    // ponytail: reset global compartilhado; isolar por visitante se houver demos simultâneas.
    console.log('[migrate] Restaurando sandbox de demonstração...');
    await sql`
      TRUNCATE TABLE
        audit_events,
        picking_evidences,
        missing_items,
        unlinked_dav_items,
        order_items,
        orders,
        ignored_dav_items,
        products,
        users
      RESTART IDENTITY CASCADE
    `;

    const pickingUploads = join(__dirname, '..', 'uploads', 'picking');
    rmSync(pickingUploads, { recursive: true, force: true });
    mkdirSync(pickingUploads, { recursive: true });
    console.log('[migrate] Dados e uploads anteriores removidos.\n');
  }

  if (runSeed) {
    const seedsDir = join(__dirname, 'seeds');
    const seeds = readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
    console.log(`[migrate] Rodando ${seeds.length} seed(s)...`);
    for (const file of seeds) {
      await runFile(join(seedsDir, file), file);
    }
    console.log('[migrate] Seeds concluídas.');
  }

  await sql.end();
}

main().catch(err => {
  console.error('[migrate] ERRO:', err.message);
  process.exit(1);
});
