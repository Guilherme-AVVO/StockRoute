import bcrypt from 'bcrypt';
import {
  createUser as createUserQuery,
  findUserByEmailForAdmin,
  findUserById,
  listUsers as listUsersQuery,
  updateUser as updateUserQuery,
  updateUserStatus as updateUserStatusQuery,
} from '../../db/queries/users.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(['ADMIN', 'ESTOQUISTA']);
const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name ?? '').trim();
}

function validateRole(role) {
  if (!VALID_ROLES.has(role)) {
    throw { status: 400, message: 'Papel de usuário inválido.' };
  }
}

function toDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    lastAccessAt: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseIsActive(value, defaultValue = true) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'boolean') {
    throw { status: 400, message: 'Status ativo deve ser booleano.' };
  }
  return value;
}

async function assertUniqueEmail(email, currentUserId = null) {
  const existing = await findUserByEmailForAdmin(email);
  if (existing && existing.id !== currentUserId) {
    throw { status: 409, message: 'Já existe um usuário com este e-mail.' };
  }
}

export async function listUsers(filters = {}) {
  const role = filters.role ? String(filters.role).trim().toUpperCase() : null;
  if (role) validateRole(role);

  const status = filters.status ? String(filters.status).trim().toLowerCase() : null;
  if (status && !['active', 'inactive'].includes(status)) {
    throw { status: 400, message: 'Status de usuário inválido.' };
  }

  const rows = await listUsersQuery({
    search: String(filters.search ?? '').trim() || null,
    role,
    status,
  });
  return rows.map(toDto);
}

export async function getUser(id) {
  const user = await findUserById(id);
  if (!user) throw { status: 404, message: 'Usuário não encontrado.' };
  return toDto(user);
}

export async function createUser(data) {
  const name = normalizeName(data?.name);
  const email = normalizeEmail(data?.email);
  const password = data?.password;
  const role = String(data?.role ?? '').trim().toUpperCase();
  const isActive = parseIsActive(data?.isActive, true);

  if (!name) throw { status: 400, message: 'Nome é obrigatório.' };
  if (!email) throw { status: 400, message: 'E-mail é obrigatório.' };
  if (!EMAIL_REGEX.test(email)) throw { status: 400, message: 'E-mail inválido.' };
  if (!password || typeof password !== 'string') throw { status: 400, message: 'Senha é obrigatória.' };
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw { status: 400, message: 'Senha deve ter pelo menos 8 caracteres.' };
  }
  validateRole(role);
  await assertUniqueEmail(email);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await createUserQuery({ name, email, passwordHash, role, isActive });
  return toDto(user);
}

export async function updateUser(id, data) {
  const current = await findUserById(id);
  if (!current) throw { status: 404, message: 'Usuário não encontrado.' };

  const name = normalizeName(data?.name);
  const email = normalizeEmail(data?.email);
  const role = String(data?.role ?? '').trim().toUpperCase();
  const isActive = parseIsActive(data?.isActive, current.is_active);

  if (!name) throw { status: 400, message: 'Nome é obrigatório.' };
  if (!email) throw { status: 400, message: 'E-mail é obrigatório.' };
  if (!EMAIL_REGEX.test(email)) throw { status: 400, message: 'E-mail inválido.' };
  validateRole(role);
  await assertUniqueEmail(email, id);

  const user = await updateUserQuery(id, { name, email, role, isActive });
  return toDto(user);
}

export async function setUserStatus(id, isActive, actorId) {
  if (typeof isActive !== 'boolean') {
    throw { status: 400, message: 'Status ativo deve ser booleano.' };
  }
  if (id === actorId && isActive === false) {
    throw { status: 400, message: 'Você não pode desativar seu próprio usuário.' };
  }

  const user = await updateUserStatusQuery(id, isActive);
  if (!user) throw { status: 404, message: 'Usuário não encontrado.' };
  return toDto(user);
}
