import 'dotenv/config';
import { validateEnv } from './utils/env.js';
validateEnv();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import authRoutes            from './routes/authRoutes.js';
import productRoutes         from './routes/productRoutes.js';
import ignoredDavItemsRoutes from './routes/ignoredDavItemsRoutes.js';
import orderRoutes           from './routes/orderRoutes.js';
import dashboardRoutes       from './routes/dashboardRoutes.js';
import unlinkedDavItemsRoutes from './routes/unlinkedDavItemsRoutes.js';
import auditRoutes            from './routes/auditRoutes.js';
import userRoutes             from './routes/userRoutes.js';
import pickingRoutes          from './routes/pickingRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Trust proxy — necessário quando o backend roda atrás de proxy/load balancer
// (Render, Railway, Fly, etc.) para que o express-rate-limit consiga ler o IP
// real do cliente em X-Forwarded-For. Usamos valor numérico (número de hops
// confiáveis) em vez de `true` para evitar spoofing do header.
//
// - TRUST_PROXY=1     → confia em 1 proxy à frente (padrão Render/Railway)
// - TRUST_PROXY=2+    → mais hops, se houver CDN extra
// - sem env, mas RENDER/RAILWAY/FLY/NODE_ENV=production → assume 1
// - sem env e dev local → não confia (default do Express)
//
// Detectamos a plataforma por variáveis que ela seta automaticamente,
// para não depender exclusivamente de NODE_ENV (que o Render às vezes
// não inicializa como 'production' por padrão).
const TRUST_PROXY = process.env.TRUST_PROXY;
const isBehindProxy =
     process.env.NODE_ENV === 'production'
  || process.env.RENDER              // setada automaticamente pelo Render
  || process.env.RAILWAY_ENVIRONMENT  // setada automaticamente pelo Railway
  || process.env.FLY_APP_NAME;        // setada automaticamente pelo Fly.io

if (TRUST_PROXY) {
  const trustProxyValue = Number.isNaN(Number(TRUST_PROXY))
    ? TRUST_PROXY
    : Number(TRUST_PROXY);
  app.set('trust proxy', trustProxyValue);
} else if (isBehindProxy) {
  app.set('trust proxy', 1);
}

// Headers de segurança HTTP
app.use(helmet());

function normalizeOrigin(origin) {
  return origin?.trim().replace(/\/$/, '');
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
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
    const isLocalViteOrigin = process.env.NODE_ENV !== 'production'
      && normalizedOrigin?.startsWith('http://localhost:517');

    if (
      allowedOrigins.includes(normalizedOrigin)
      || vercelPreviewPattern.test(normalizedOrigin)
      || isLocalViteOrigin
    ) {
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

// Arquivos enviados (fotos de coleta do picking) — público para o frontend
// conseguir exibir as evidências sem autenticação extra. Caminho relativo ao
// processo é convertido para absoluto pelo path.resolve.
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/auth',               authRoutes);
app.use('/products',           productRoutes);
app.use('/ignored-dav-items',  ignoredDavItemsRoutes);
app.use('/orders',             orderRoutes);
app.use('/dashboard',          dashboardRoutes);
app.use('/unlinked-dav-items', unlinkedDavItemsRoutes);
app.use('/audit-events',       auditRoutes);
app.use('/users',              userRoutes);
app.use('/stockist',           pickingRoutes);

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
