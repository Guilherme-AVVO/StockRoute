import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  listIgnoredDavItemsController,
  createIgnoredDavItemController,
  updateIgnoredDavItemController,
  setIgnoredDavItemStatusController,
  deleteIgnoredDavItemController,
} from '../controllers/ignoredDavItemsController.js';

const router = Router();

// Gerenciamento de regras de ignorar DAV é exclusivo do ADMIN.
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/',       listIgnoredDavItemsController);
router.post('/',      createIgnoredDavItemController);
router.put('/:id',    updateIgnoredDavItemController);
router.patch('/:id/status', setIgnoredDavItemStatusController);

// DELETE faz soft delete para preservar auditoria de itens já ocultados.
router.delete('/:id', deleteIgnoredDavItemController);

export default router;
