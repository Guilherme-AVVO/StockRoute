import { Router } from 'express';
import { loginController, meController, adminTestController } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import { loginRateLimiter } from '../middlewares/loginRateLimiter.js';

const router = Router();

// Login é público, mas protegido por rate limit para reduzir força bruta.
router.post('/login', loginRateLimiter, loginController);
// Rotas abaixo exigem JWT válido no header Authorization.
router.get('/me', authMiddleware, meController);
router.get('/admin-test', authMiddleware, requireRole('ADMIN'), adminTestController);

export default router;
