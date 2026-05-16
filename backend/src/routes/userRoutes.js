import { Router } from 'express';
import {
  createUserController,
  getUserController,
  listUsersController,
  setUserStatusController,
  updateUserController,
} from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// CRUD administrativo de usuários: somente ADMIN autenticado.
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/', listUsersController);
router.get('/:id', getUserController);
router.post('/', createUserController);
router.put('/:id', updateUserController);
router.patch('/:id/status', setUserStatusController);

export default router;
