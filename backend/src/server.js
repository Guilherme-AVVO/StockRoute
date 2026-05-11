import 'dotenv/config';
import { validateEnv } from './utils/env.js';
validateEnv();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Headers de segurança HTTP
app.use(helmet());

function normalizeOrigin(origin) {
  return origin?.trim().replace(/\/$/, '');
}

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',')
    : []),
]
  .map(normalizeOrigin)
  .filter(Boolean);

// Aceita qualquer preview deploy do projeto na Vercel (stock-route-*.vercel.app)
const vercelPreviewPattern = /^https:\/\/stock-route[a-z0-9-]*\.vercel\.app$/;

// CORS restrito às origens configuradas — não use '*' com credentials.
app.use(cors({
  origin: (origin, callback) => {
    // Requisições sem Origin vêm de curl, Postman ou health checks.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalizedOrigin) || vercelPreviewPattern.test(normalizedOrigin)) {
      return callback(null, true);
    }

    console.error(`[Server Error] Origem não permitida pelo CORS: ${origin}`);
    return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Health check — sem autenticação
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API StockRoute funcionando' });
});

app.use('/auth', authRoutes);

// 404 para rotas inexistentes
app.use((_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Tratamento centralizado de erros — deve ser o último middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] API rodando na porta ${PORT}`);
});
