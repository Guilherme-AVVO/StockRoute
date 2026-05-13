import { parseDav } from './davParserService.js';
import { shouldIgnoreDavItem } from './ignoredDavItemsService.js';
import {
  findProductBySku,
} from '../../db/queries/products.js';
import {
  listOrders,
  findOrderById,
  findOrderByNumber,
  findOrderItems,
  createOrder,
  updateOrderStatus,
  createOrderItem,
} from '../../db/queries/orders.js';
import { createUnlinkedDavItem } from '../../db/queries/unlinkedDavItems.js';
import { normalizeSku } from '../utils/normalizeDavItem.js';

// Tries exact SKU match then falls back to stripped leading zeros.
async function findProductForSku(rawSku) {
  const full = normalizeSku(rawSku);
  let product = await findProductBySku(full);
  if (!product) {
    const short = full.replace(/^0+/, '') || '0';
    if (short !== full) product = await findProductBySku(short);
  }
  return product;
}

function toOrderDto(row) {
  return {
    id:            row.id,
    orderNumber:   row.order_number,
    customerName:  row.customer_name,
    status:        row.status,
    pdfUrl:        row.pdf_url ?? null,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    totalItems:    row.total_items    ?? undefined,
    pickedItems:   row.picked_items   ?? undefined,
    missingItems:  row.missing_items  ?? undefined,
    partialItems:  row.partial_items  ?? undefined,
    unlinkedItems: row.unlinked_items ?? undefined,
  };
}

function toItemDto(row) {
  return {
    id:             row.id,
    quantity:       row.quantity,
    pickedQuantity: row.picked_quantity,
    missingQuantity: row.missing_quantity,
    status:         row.status,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
    product: {
      id:       row.product_id,
      sku:      row.product_sku,
      name:     row.product_name,
      unit:     row.product_unit,
      imageUrl: row.product_image_url ?? null,
    },
  };
}

export async function importDav(fileBuffer) {
  const { orderNumber, customerName, items } = await parseDav(fileBuffer);

  const existing = await findOrderByNumber(orderNumber);
  if (existing) {
    throw { status: 409, message: `DAV ${orderNumber} já foi importado (pedido #${existing.id})` };
  }

  const order = await createOrder({ orderNumber, customerName, pdfUrl: null });

  const counts = { found: 0, unlinked: 0, ignored: 0 };
  const unlinkedItems = [];

  for (const item of items) {
    const { ignored } = await shouldIgnoreDavItem({
      rawSku:         item.rawSku,
      rawDescription: item.rawDescription,
    });

    if (ignored) {
      counts.ignored++;
      continue;
    }

    const product = await findProductForSku(item.rawSku);

    if (!product) {
      // Persistimos em unlinked_dav_items para que o ADMIN consiga resolver depois.
      // Sem isso, o item desaparece após a resposta do import.
      const saved = await createUnlinkedDavItem({
        orderId:        order.id,
        rawSku:         item.rawSku,
        rawDescription: item.rawDescription,
        quantity:       item.quantity,
        unit:           item.unit,
      });
      counts.unlinked++;
      unlinkedItems.push({
        id:             saved.id,
        rawSku:         item.rawSku,
        rawDescription: item.rawDescription,
        quantity:       item.quantity,
        unit:           item.unit,
      });
      continue;
    }

    await createOrderItem({
      orderId:   order.id,
      productId: product.id,
      quantity:  item.quantity,
    });
    counts.found++;
  }

  return {
    orderId:      order.id,
    orderNumber,
    customerName,
    counts,
    unlinkedItems,
  };
}

export async function getOrders(filters) {
  const rows = await listOrders(filters);
  return rows.map(toOrderDto);
}

export async function getOrder(id) {
  const [order, items] = await Promise.all([
    findOrderById(id),
    findOrderItems(id),
  ]);
  if (!order) return null;

  return {
    ...toOrderDto(order),
    items: items.map(toItemDto),
  };
}

export async function publishOrder(id) {
  const order = await findOrderById(id);
  if (!order) throw { status: 404, message: 'Pedido não encontrado' };
  if (order.status !== 'PENDING') {
    throw { status: 409, message: `Pedido não pode ser publicado no estado atual: ${order.status}` };
  }
  const updated = await updateOrderStatus(id, 'IN_PROGRESS');
  return toOrderDto(updated);
}
