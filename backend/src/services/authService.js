import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByEmail } from '../../db/queries/users.js';

// TODO: a senha inicial do ADMIN (admin123) deve ser trocada no primeiro acesso (PP-05 da especificação).

export async function login(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    // Retorna a mesma mensagem genérica para não revelar se o e-mail existe
    throw { status: 401, message: 'Credenciais inválidas' };
  }

  // Compara a senha digitada com o hash bcrypt salvo no banco.
  // O hash completo nunca é retornado para o frontend.
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    throw { status: 401, message: 'Credenciais inválidas' };
  }

  // Incluímos `name` no payload para que o middleware de auditoria
  // consiga preencher responsible_name nos eventos sem uma query extra.
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  // O token só é assinado depois que a senha foi validada com sucesso.
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    algorithm: 'HS256',
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      // password_hash nunca é retornado
    },
  };
}
