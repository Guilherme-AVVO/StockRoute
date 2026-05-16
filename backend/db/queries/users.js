import sql from '../pool.js';

const publicUserFields = sql`
  id,
  name,
  email,
  role,
  is_active,
  created_at,
  updated_at
`;

// Retorna apenas os campos necessários para autenticação — nunca expõe password_hash para fora do service
export async function findUserByEmail(email) {
  const rows = await sql`
    SELECT id, name, email, password_hash, role, is_active
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listUsers({ search, role, status } = {}) {
  const pattern = search ? `%${search}%` : null;
  const isActive = status === 'active'
    ? true
    : status === 'inactive'
      ? false
      : null;

  return sql`
    SELECT ${publicUserFields}
    FROM users
    WHERE 1 = 1
      ${pattern ? sql`AND (name ILIKE ${pattern} OR email ILIKE ${pattern})` : sql``}
      ${role ? sql`AND role = ${role}` : sql``}
      ${isActive === null ? sql`` : sql`AND is_active = ${isActive}`}
    ORDER BY name ASC
  `;
}

export async function findUserById(id) {
  const rows = await sql`
    SELECT ${publicUserFields}
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findUserByEmailForAdmin(email) {
  const rows = await sql`
    SELECT ${publicUserFields}
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createUser({ name, email, passwordHash, role, isActive }) {
  const rows = await sql`
    INSERT INTO users (name, email, password_hash, role, is_active)
    VALUES (${name}, ${email}, ${passwordHash}, ${role}, ${isActive})
    RETURNING ${publicUserFields}
  `;
  return rows[0];
}

export async function updateUser(id, { name, email, role, isActive }) {
  const rows = await sql`
    UPDATE users
    SET name       = ${name},
        email      = ${email},
        role       = ${role},
        is_active  = ${isActive},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING ${publicUserFields}
  `;
  return rows[0] ?? null;
}

export async function updateUserStatus(id, isActive) {
  const rows = await sql`
    UPDATE users
    SET is_active = ${isActive},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING ${publicUserFields}
  `;
  return rows[0] ?? null;
}
