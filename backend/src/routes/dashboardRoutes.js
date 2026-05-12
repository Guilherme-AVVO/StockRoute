import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import { getDashboardStats } from '../../db/queries/stats.js';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getDashboardStats();
    res.json({
      ordersPending:      stats.orders_pending,
      ordersInProgress:   stats.orders_in_progress,
      ordersCompleted:    stats.orders_completed,
      ordersCancelled:    stats.orders_cancelled,
      totalProducts:      stats.total_products,
      activeIgnoredRules: stats.active_ignored_rules,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
