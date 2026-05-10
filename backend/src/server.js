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

// CORS restrito à origem configurada — não deixe '*' em produção
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
