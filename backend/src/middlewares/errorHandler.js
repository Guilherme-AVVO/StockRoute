export function errorHandler(err, _req, res, _next) {
  // Erros lançados intencionalmente com { status, message }
  if (err.status && err.message) {
    return res.status(err.status).json({ message: err.message });
  }

  // Erros inesperados: loga no servidor, mas não expõe detalhes sensíveis ao cliente.
  console.error('[Server Error]', err.message ?? err);

  return res.status(500).json({ message: 'Erro interno do servidor' });
}
