import rateLimit from 'express-rate-limit';

// Limita tentativas de login por IP sem remover a mensagem genérica de credenciais.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // janela de 15 minutos
  max: 5,                    // máximo 5 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: 'Muitas tentativas de login. Tente novamente mais tarde.' });
  },
});
