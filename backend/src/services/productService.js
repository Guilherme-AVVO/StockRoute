import {
  listProducts    as listProductsQuery,
  findProductById,
  findProductBySku,
  createProduct   as createProductQuery,
  updateProduct   as updateProductQuery,
  deleteProduct   as deleteProductQuery,
} from '../../db/queries/products.js';

const ALLOWED_UNITS = ['UN', 'CX', 'SC', 'PC', 'CT', 'PR', 'M'];

// Converte linha do banco (snake_case) para objeto camelCase para o frontend.
function toDto(row) {
  return {
    id:        row.id,
    sku:       row.sku,
    name:      row.name,
    unit:      row.unit,
    imageUrl:  row.image_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validate({ sku, name, unit }) {
  if (!sku || typeof sku !== 'string' || sku.trim() === '') {
    throw { status: 400, message: 'SKU é obrigatório' };
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw { status: 400, message: 'Nome é obrigatório' };
  }
  if (name.trim().length > 150) {
    throw { status: 400, message: 'Nome deve ter no máximo 150 caracteres' };
  }
  if (!unit || !ALLOWED_UNITS.includes(unit)) {
    throw { status: 400, message: `Unidade inválida. Use: ${ALLOWED_UNITS.join(', ')}` };
  }
}

export async function listProducts({ search } = {}) {
  const rows = await listProductsQuery({ search: search?.trim() || undefined });
  return rows.map(toDto);
}

export async function getProductById(id) {
  const row = await findProductById(id);
  if (!row) throw { status: 404, message: 'Produto não encontrado' };
  return toDto(row);
}

export async function createProduct(data) {
  const sku      = data.sku?.trim()      ?? '';
  const name     = data.name?.trim()     ?? '';
  const unit     = data.unit             ?? '';
  const imageUrl = data.imageUrl?.trim() || null;

  validate({ sku, name, unit });

  const existing = await findProductBySku(sku);
  if (existing) throw { status: 409, message: 'SKU já cadastrado' };

  const row = await createProductQuery({ sku, name, unit, imageUrl });
  return toDto(row);
}

export async function updateProduct(id, data) {
  const sku      = data.sku?.trim()      ?? '';
  const name     = data.name?.trim()     ?? '';
  const unit     = data.unit             ?? '';
  const imageUrl = data.imageUrl?.trim() || null;

  validate({ sku, name, unit });

  // Verifica se outro produto já ocupa este SKU.
  const existing = await findProductBySku(sku);
  if (existing && existing.id !== id) {
    throw { status: 409, message: 'SKU já cadastrado' };
  }

  const row = await updateProductQuery(id, { sku, name, unit, imageUrl });
  if (!row) throw { status: 404, message: 'Produto não encontrado' };
  return toDto(row);
}

export async function deleteProduct(id) {
  try {
    const row = await deleteProductQuery(id);
    if (!row) throw { status: 404, message: 'Produto não encontrado' };
    return { id: row.id };
  } catch (err) {
    // Código PostgreSQL 23503 = foreign_key_violation
    if (err.code === '23503') {
      throw { status: 409, message: 'Produto possui histórico e não pode ser excluído.' };
    }
    throw err;
  }
}
