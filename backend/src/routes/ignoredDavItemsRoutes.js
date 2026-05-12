import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  listIgnoredDavItemsController,
  createIgnoredDavItemController,
  deactivateIgnoredDavItemController,
} from '../controllers/ignoredDavItemsController.js';

const router = Router();

// Gerenciamento de regras de ignorar DAV é exclusivo do ADMIN.
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/',       listIgnoredDavItemsController);
router.post('/',      createIgnoredDavItemController);

// DELETE desativa a regra sem apagar o histórico (soft delete via active=false).
router.delete('/:id', deactivateIgnoredDavItemController);

export default router;
