import * as productService from '../services/productService.js';

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
    return res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function updateProductController(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body ?? {});
    return res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function deleteProductController(req, res, next) {
  try {
    const result = await productService.deleteProduct(req.params.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
