import { login } from '../services/authService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginController(req, res, next) {
  try {
    const { email, password } = req.body ?? {};

    // Validação básica antes de chamar o service evita consultas desnecessárias.
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'E-mail é obrigatório' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'E-mail inválido' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Senha é obrigatória' });
    }

    const result = await login(email.trim().toLowerCase(), password);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export function meController(req, res) {
  // req.user é preenchido pelo authMiddleware
  return res.json({ user: req.user });
}

export function adminTestController(_req, res) {
  return res.json({ message: 'Acesso ADMIN autorizado' });
}
