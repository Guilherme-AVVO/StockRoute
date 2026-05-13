// Middleware central de tratamento de erros.
// Converte erros conhecidos (de validação, banco, upload e parser) em HTTP status
// claros antes de cair no 500 genérico. Em dev, loga stack completo no servidor.

// Mapa de códigos do PostgreSQL (postgres.js / SQLSTATE) para HTTP + mensagem amigável.
// Sem isso, qualquer UUID inválido ou check constraint vira "Erro interno do servidor".
const PG_ERROR_MAP = {
  '22P02': { status: 400, message: 'Identificador ou valor com formato inválido' },           // invalid_text_representation (ex: UUID malformado)
  '23502': { status: 400, message: 'Campo obrigatório ausente' },                              // not_null_violation
  '23505': { status: 409, message: 'Já existe um registro com esses dados' },                  // unique_violation
  '23503': { status: 409, message: 'Recurso vinculado a outros registros e não pode ser modificado/excluído' }, // foreign_key_violation
  '23514': { status: 400, message: 'Valor não atende às regras de validação do banco' },       // check_violation
  '22001': { status: 400, message: 'Valor maior que o tamanho permitido' },                    // string_data_right_truncation
};

// Erros gerados pelo multer quando o upload é rejeitado.
function isMulterError(err) {
  return err?.name === 'MulterError' || err?.message === 'Apenas arquivos PDF são aceitos';
}

// Erros do pdf-parse — PDF corrompido, sem texto, etc.
function isPdfParseError(err) {
  return /invalid pdf structure|pdf|password|encrypted/i.test(err?.message ?? '');
}

export function errorHandler(err, req, res, _next) {
  // 1) Erros lançados intencionalmente com { status, message }
  if (err.status && err.message) {
    return res.status(err.status).json({ message: err.message });
  }

  // 2) Erros do PostgreSQL — UUID inválido, unique violation, FK violation, etc.
  if (err.code && PG_ERROR_MAP[err.code]) {
    const mapped = PG_ERROR_MAP[err.code];
    logServerError(err, req, mapped);
    return res.status(mapped.status).json({ message: mapped.message });
  }

  // 3) Erros do multer / fileFilter
  if (isMulterError(err)) {
    logServerError(err, req, { status: 400 });
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo excede o tamanho máximo permitido (10MB)'
      : err.message || 'Arquivo inválido';
    return res.status(400).json({ message: msg });
  }

  // 4) Erros do pdf-parse — PDF não lido / inválido
  if (isPdfParseError(err)) {
    logServerError(err, req, { status: 422 });
    return res.status(422).json({ message: 'PDF inválido ou ilegível. Verifique se o arquivo é um DAV válido.' });
  }

  // 5) Erros inesperados — loga detalhes para o servidor, mensagem genérica para o cliente.
  logServerError(err, req, { status: 500 });
  return res.status(500).json({ message: 'Erro interno do servidor' });
}

// Log estruturado: nome, mensagem, rota, método. Stack só em desenvolvimento.
// Não inclui token, senha, body completo nem variáveis de ambiente sensíveis.
function logServerError(err, req, { status }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const summary = {
    status,
    method: req?.method,
    path:   req?.originalUrl ?? req?.url,
    name:   err.name,
    code:   err.code,
    message: err.message,
  };
  console.error('[Server Error]', JSON.stringify(summary));
  if (isDev && err.stack) {
    console.error(err.stack);
  }
}
