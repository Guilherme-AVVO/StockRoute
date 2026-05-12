import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  listUnlinkedController,
  linkProductController,
  createProductController,
  hideUnlinkedController,
} from '../controllers/unlinkedDavItemsController.js';

const router = Router();

// Itens não vinculados são auditoria/resolução — área restrita ao ADMIN.
router.use(authMiddleware, requireRole('ADMIN'));

router.get   ('/',                   listUnlinkedController);
router.patch ('/:id/link-product',   linkProductController);
router.post  ('/:id/create-product', createProductController);
router.post  ('/:id/hide',           hideUnlinkedController);

export default router;
