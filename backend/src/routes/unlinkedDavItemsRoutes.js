import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  listUnlinkedController,
  linkProductController,
  createProductController,
  hideUnlinkedController,
  listUnlinkedGroupsController,
  registerGroupController,
  linkGroupController,
  hideGroupController,
} from '../controllers/unlinkedDavItemsController.js';

const router = Router();

// Itens não vinculados são auditoria/resolução — área restrita ao ADMIN.
router.use(authMiddleware, requireRole('ADMIN'));

// Rotas de grupos vêm ANTES das rotas com :id para não capturar "groups"
// como id em listUnlinkedController.
router.get   ('/groups',          listUnlinkedGroupsController);
router.post  ('/groups/register', registerGroupController);
router.post  ('/groups/link',     linkGroupController);
router.post  ('/groups/hide',     hideGroupController);

router.get   ('/',                   listUnlinkedController);
router.patch ('/:id/link-product',   linkProductController);
router.post  ('/:id/create-product', createProductController);
router.post  ('/:id/hide',           hideUnlinkedController);

export default router;
