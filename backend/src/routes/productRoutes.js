import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  listProductsController,
  getProductController,
  createProductController,
  updateProductController,
  deleteProductController,
} from '../controllers/productController.js';

const router = Router();

// Todas as rotas de produtos exigem sessão ADMIN válida.
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/',       listProductsController);
router.get('/:id',    getProductController);
router.post('/',      createProductController);
router.put('/:id',    updateProductController);
router.delete('/:id', deleteProductController);

export default router;
