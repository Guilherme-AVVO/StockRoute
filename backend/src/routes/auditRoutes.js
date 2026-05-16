import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  listAuditEventsController,
  getAuditSummaryController,
  getAuditEventController,
} from '../controllers/auditController.js';

const router = Router();

// Histórico/auditoria é exclusivo do ADMIN.
router.use(authMiddleware, requireRole('ADMIN'));

// /summary vem antes de /:id para não capturar "summary" como id.
router.get('/summary', getAuditSummaryController);
router.get('/',        listAuditEventsController);
router.get('/:id',     getAuditEventController);

export default router;
