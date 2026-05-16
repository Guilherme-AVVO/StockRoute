import * as productService from '../services/productService.js';
import { logAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditService.js';

export async function listProductsController(req, res, next) {
  try {
    const { search } = req.query;
    const products = await productService.listProducts({ search });
    return res.json(products);
  } catch (err) {
    next(err);
  }
}

export async function getProductController(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    return res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function createProductController(req, res, next) {
  try {
    const product = await productService.createProduct(req.body ?? {});
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.PRODUCT_CREATED,
      entityType:  'product',
      entityId:    product.id,
      status:      'Concluído',
      title:       'Produto cadastrado',
      description: `Produto "${product.name}" (SKU ${product.sku}) foi cadastrado no catálogo.`,
      metadata:    { sku: product.sku, name: product.name, unit: product.unit },
    }, { req });
    return res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function updateProductController(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body ?? {});
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.PRODUCT_UPDATED,
      entityType:  'product',
      entityId:    product.id,
      status:      'Concluído',
      title:       'Produto atualizado',
      description: `Produto "${product.name}" (SKU ${product.sku}) foi editado.`,
      metadata:    { sku: product.sku, name: product.name },
    }, { req });
    return res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function deleteProductController(req, res, next) {
  try {
    const result = await productService.deleteProduct(req.params.id);
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.PRODUCT_DELETED,
      entityType:  'product',
      entityId:    result.id,
      status:      'Concluído',
      title:       'Produto excluído',
      description: `Produto removido do catálogo (id ${result.id}).`,
    }, { req });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
