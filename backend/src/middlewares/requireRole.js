// Uso: requireRole('ADMIN') ou requireRole('ADMIN', 'ESTOQUISTA')
export function requireRole(...roles) {
  return (req, res, next) => {
    // Este middleware deve vir depois do authMiddleware, que preenche req.user.
    if (!req.user) {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Você não tem permissão para acessar este recurso' });
    }
    next();
  };
}
