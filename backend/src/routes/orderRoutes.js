import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  pdfUpload,
  importDavController,
  listOrdersController,
  getOrderController,
  publishOrderController,
} from '../controllers/orderController.js';

const router = Router();

router.use(authMiddleware, requireRole('ADMIN'));

router.post('/import',        pdfUpload, importDavController);
router.get('/',                          listOrdersController);
router.get('/:id',                       getOrderController);
router.put('/:id/publish',               publishOrderController);

export default router;
