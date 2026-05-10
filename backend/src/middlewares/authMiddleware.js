import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Rotas protegidas devem receber Authorization: Bearer <token>.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }

  const token = authHeader.slice(7);

  try {
    // Valida assinatura, issuer e audience antes de liberar req.user.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      algorithms: ['HS256'],
    });

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    // Não loga o token — pode conter dados do usuário
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}
