import sql from '../pool.js';

// Retorna apenas os campos necessários para autenticação — nunca expõe password_hash para fora do service
export async function findUserByEmail(email) {
  const rows = await sql`
    SELECT id, name, email, password_hash, role
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
