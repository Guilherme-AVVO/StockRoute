import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  collectPhotoUpload,
  listAvailableOrdersController,
  startPickingController,
  getStockistOrderController,
  collectItemController,
  markItemNotFoundController,
  finishPickingController,
  getSummaryController,
  getMyActivePickingController,
} from '../controllers/pickingController.js';

// Rotas do fluxo do estoquista. ADMIN não acessa estas ações — para visão
// administrativa dos resumos existe a área /orders.
const router = Router();

router.use(authMiddleware, requireRole('ESTOQUISTA'));

router.get('/orders',                          listAvailableOrdersController);
router.get('/my-active',                       getMyActivePickingController);
router.post('/orders/:orderId/start',          startPickingController);
router.get('/orders/:orderId',                 getStockistOrderController);
router.get('/orders/:orderId/summary',         getSummaryController);
router.post('/orders/:orderId/finish',         finishPickingController);

router.post('/order-items/:itemId/collect',    collectPhotoUpload, collectItemController);
router.post('/order-items/:itemId/not-found',  markItemNotFoundController);

export default router;
