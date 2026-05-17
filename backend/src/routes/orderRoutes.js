import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  pdfUpload,
  importDavController,
  listOrdersController,
  getOrderController,
  publishOrderController,
  adminResolveMissingUpload,
  adminResolveMissingItemController,
  adminShipOrderWithMissingController,
} from '../controllers/orderController.js';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

router.post('/import',        pdfUpload, importDavController);
router.get('/',                          listOrdersController);
router.get('/:id',                       getOrderController);
router.put('/:id/publish',               publishOrderController);

// Resolução de pendências em pedidos OBSERVATION (ADMIN).
router.post('/:orderId/items/:itemId/resolve-missing',
  adminResolveMissingUpload,
  adminResolveMissingItemController);
router.post('/:orderId/ship-with-missing',
  adminShipOrderWithMissingController);

export default router;
