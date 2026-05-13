// Service: itens DAV sem vínculo com produto.
// Coordena: listagem, vinculação a produto existente, cadastro rápido de produto
// a partir do item DAV e ocultação no picking (via ignored_dav_items).
import {
  listUnlinkedDavItems as listUnlinkedQuery,
  findUnlinkedDavItemById,
  updateUnlinkedDavItemStatus,
} from '../../db/queries/unlinkedDavItems.js';
import {
  findProductById,
  findProductBySku,
  createProduct,
} from '../../db/queries/products.js';
import { createOrderItem } from '../../db/queries/orders.js';
import { createIgnoredDavItem } from './ignoredDavItemsService.js';

const VALID_UNITS = ['UN', 'CX', 'SC', 'PC', 'CT', 'PR', 'M'];

// Converte snake_case do banco para camelCase do frontend.
function toDto(row) {
  return {
    id:                    row.id,
    orderId:               row.order_id,
    davNumber:             row.dav_number,
    customerName:          row.customer_name,
    rawSku:                row.raw_sku,
    rawDescription:        row.raw_description,
    quantity:              row.quantity,
    unit:                  row.unit,
    manufacturerReference: row.manufacturer_reference ?? null,
    manufacturerName:      row.manufacturer_name ?? null,
    status:                row.status,
    productId:             row.product_id ?? null,
    resolutionNote:        row.resolution_note ?? null,
    resolvedAt:            row.resolved_at ?? null,
    resolvedBy:            row.resolved_by ?? null,
    createdAt:             row.created_at,
    updatedAt:             row.updated_at,
  };
}

export async function getUnlinkedDavItems({ status = 'PENDING' } = {}) {
  const rows = await listUnlinkedQuery({ status });
  return rows.map(toDto);
}

// Vincula item DAV a um produto existente no catálogo.
export async function linkToExistingProduct(itemId, productId, userId) {
  const item = await findUnlinkedDavItemById(itemId);
  if (!item) {
    throw { status: 404, message: 'Item não vinculado não encontrado' };
  }
  if (item.status !== 'PENDING') {
    throw { status: 409, message: `Item já foi resolvido (status: ${item.status})` };
  }

  const product = await findProductById(productId);
  if (!product) {
    throw { status: 404, message: 'Produto informado não existe no catálogo' };
  }

  // Insere o item no pedido — sem isso, o item resolvido nunca chegaria
  // à lista do estoquista quando o pedido fosse publicado.
  await createOrderItem({
    orderId:   item.order_id,
    productId: product.id,
    quantity:  item.quantity,
  });

  const updated = await updateUnlinkedDavItemStatus(itemId, {
    status:         'LINKED',
    productId:      product.id,
    resolutionNote: `Vinculado ao produto existente: ${product.sku}`,
    resolvedBy:     userId,
  });

  return { item: toDto({ ...updated, dav_number: item.dav_number, customer_name: item.customer_name }), product };
}

// Cria produto novo no catálogo a partir do item DAV e marca como resolvido.
// Se já existe produto com mesmo SKU, devolve 409 — para evitar duplicata silenciosa
// (o ADMIN deve usar "Vincular" nesse caso).
export async function registerAsNewProduct(itemId, productData, userId) {
  const item = await findUnlinkedDavItemById(itemId);
  if (!item) {
    throw { status: 404, message: 'Item não vinculado não encontrado' };
  }
  if (item.status !== 'PENDING') {
    throw { status: 409, message: `Item já foi resolvido (status: ${item.status})` };
  }

  const sku  = String(productData.sku  ?? '').trim();
  const name = String(productData.name ?? '').trim();
  const unit = String(productData.unit ?? '').trim().toUpperCase();

  if (!sku)  throw { status: 400, message: 'SKU é obrigatório' };
  if (!name) throw { status: 400, message: 'Nome do produto é obrigatório' };
  if (!VALID_UNITS.includes(unit)) {
    throw { status: 400, message: `Unidade inválida. Use uma de: ${VALID_UNITS.join(', ')}` };
  }

  const existing = await findProductBySku(sku);
  if (existing) {
    throw {
      status: 409,
      message: `Já existe um produto com SKU "${sku}". Use a ação "Vincular" para reaproveitar.`,
      existingProductId: existing.id,
    };
  }

  // Reaproveita referência/fabricante do item DAV quando o ADMIN não os edita.
  const manufacturerReference = productData.manufacturerReference ?? item.manufacturer_reference ?? null;
  const manufacturerName      = productData.manufacturerName      ?? item.manufacturer_name      ?? null;

  const product = await createProduct({
    sku,
    name,
    unit,
    imageUrl: productData.imageUrl ?? null,
    manufacturerReference,
    manufacturerName,
  });

  // Insere o item no pedido para que o picking enxergue após publicação.
  await createOrderItem({
    orderId:   item.order_id,
    productId: product.id,
    quantity:  item.quantity,
  });

  const updated = await updateUnlinkedDavItemStatus(itemId, {
    status:         'LINKED',
    productId:      product.id,
    resolutionNote: `Cadastrado como novo produto: ${product.sku}`,
    resolvedBy:     userId,
  });

  return { item: toDto({ ...updated, dav_number: item.dav_number, customer_name: item.customer_name }), product };
}

// Oculta o item: cria regra em ignored_dav_items e marca status=HIDDEN.
// Em próximos DAVs, o item não cai mais aqui — vai direto para "ignorado".
export async function hideUnlinkedItem(itemId, reason, userId) {
  const item = await findUnlinkedDavItemById(itemId);
  if (!item) {
    throw { status: 404, message: 'Item não vinculado não encontrado' };
  }
  if (item.status !== 'PENDING') {
    throw { status: 409, message: `Item já foi resolvido (status: ${item.status})` };
  }
  if (!reason || !String(reason).trim()) {
    throw { status: 400, message: 'Motivo da ocultação é obrigatório' };
  }

  await createIgnoredDavItem({
    rawSku:         item.raw_sku,
    rawDescription: item.raw_description,
    reason:         String(reason).trim(),
    createdBy:      userId,
  });

  const updated = await updateUnlinkedDavItemStatus(itemId, {
    status:         'HIDDEN',
    productId:      null,
    resolutionNote: String(reason).trim(),
    resolvedBy:     userId,
  });

  return toDto({ ...updated, dav_number: item.dav_number, customer_name: item.customer_name });
}
