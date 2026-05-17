import { parseDav } from './davParserService.js';
import { shouldIgnoreDavItem } from './ignoredDavItemsService.js';
import {
  findProductBySku,
  findProductByManufacturerReference,
} from '../../db/queries/products.js';
import {
  listOrders,
  findOrderById,
  findOrderByNumber,
  findOrderItems,
  findHiddenOrderItems,
  createOrder,
  updateOrderStatus,
  createOrderItem,
} from '../../db/queries/orders.js';
import { createUnlinkedDavItem, listHiddenDavItemsByOrder } from '../../db/queries/unlinkedDavItems.js';
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

// Match prioritário do item DAV → produto cadastrado.
// Ordem: 1) manufacturer_reference + manufacturer_name (mais preciso)
//        2) manufacturer_reference sozinha
//        3) SKU interno do DAV (fallback histórico)
// Descrição NÃO é usada como match automático (apenas como referência visual).
async function findProductForDavItem(item) {
  if (item.manufacturerReference) {
    const byRef = await findProductByManufacturerReference(
      item.manufacturerReference,
      item.manufacturerName,
    );
    if (byRef) return byRef;
  }
  return findProductForSku(item.rawSku);
}

async function resolveDavItemRouting(item) {
  const ignored = await shouldIgnoreDavItem({
    rawSku:                item.rawSku,
    rawDescription:        item.rawDescription,
    manufacturerReference: item.manufacturerReference,
    manufacturerName:      item.manufacturerName,
  });

  if (ignored.ignored) {
    return {
      route:         'HIDDEN',
      productId:     null,
      ignoredRuleId: ignored.ruleId,
      ignoredReason: ignored.reason,
      matchType:     ignored.matchType,
      matchedValue:  ignored.matchedValue,
      status:        'HIDDEN',
    };
  }

  const product = await findProductForDavItem(item);
  if (product) {
    const productNameIgnored = await shouldIgnoreDavItem({
      rawSku:                item.rawSku,
      rawDescription:        item.rawDescription,
      productName:           product.name,
      manufacturerReference: item.manufacturerReference,
      manufacturerName:      item.manufacturerName ?? product.manufacturer_name,
    });

    if (productNameIgnored.ignored) {
      return {
        route:         'HIDDEN',
        productId:     null,
        ignoredRuleId: productNameIgnored.ruleId,
        ignoredReason: productNameIgnored.reason,
        matchType:     productNameIgnored.matchType,
        matchedValue:  productNameIgnored.matchedValue,
        status:        'HIDDEN',
      };
    }

    return {
      route:         'LINKED',
      productId:     product.id,
      product,
      ignoredRuleId: null,
      ignoredReason: null,
      status:        'PENDING',
    };
  }

  return {
    route:         'UNLINKED',
    productId:     null,
    ignoredRuleId: null,
    ignoredReason: null,
    status:        'PENDING',
  };
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
    confirmationPhotoUrl: row.confirmation_photo_url ?? null,
    collectedAt:    row.collected_at ?? null,
    notFoundReason: row.not_found_reason ?? null,
    notFoundNotes:  row.not_found_notes ?? null,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
    product: {
      id:       row.product_id,
      sku:      row.product_sku,
      name:     row.product_name,
      unit:     row.product_unit,
      imageUrl: row.product_image_url ?? null,
      manufacturerName:      row.product_manufacturer_name ?? null,
      manufacturerReference: row.product_manufacturer_reference ?? null,
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

  // Roteamento do item DAV (ordem importa):
  //   1) Regra de ocultação ativa? → unlinked_dav_items status=HIDDEN
  //      (NÃO vai para order_items mesmo se houver produto cadastrado)
  //   2) Produto cadastrado encontrado? → order_items (vai para revisão/picking)
  //   3) Sem regra nem produto? → unlinked_dav_items status=PENDING
  for (const item of items) {
    const routing = await resolveDavItemRouting(item);

    if (routing.route === 'HIDDEN') {
      // Persiste como HIDDEN para auditoria e para o toggle "Mostrar itens ocultos"
      // conseguir exibir esses itens junto da revisão.
      await createUnlinkedDavItem({
        orderId:               order.id,
        rawSku:                item.rawSku,
        rawDescription:        item.rawDescription,
        quantity:              item.quantity,
        unit:                  item.unit,
        manufacturerReference: item.manufacturerReference,
        manufacturerName:      item.manufacturerName,
        status:                'HIDDEN',
        ignoredRuleId:         routing.ignoredRuleId,
        resolutionNote:        routing.ignoredReason,
      });
      counts.ignored++;
      continue;
    }

    if (routing.route === 'UNLINKED') {
      const saved = await createUnlinkedDavItem({
        orderId:               order.id,
        rawSku:                item.rawSku,
        rawDescription:        item.rawDescription,
        quantity:              item.quantity,
        unit:                  item.unit,
        manufacturerReference: item.manufacturerReference,
        manufacturerName:      item.manufacturerName,
      });
      counts.unlinked++;
      unlinkedItems.push({
        id:                    saved.id,
        rawSku:                item.rawSku,
        rawDescription:        item.rawDescription,
        quantity:              item.quantity,
        unit:                  item.unit,
        manufacturerReference: item.manufacturerReference,
        manufacturerName:      item.manufacturerName,
      });
      continue;
    }

    await createOrderItem({
      orderId:   order.id,
      productId: routing.productId,
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

// Converte uma linha de unlinked_dav_items (HIDDEN) para o formato exibido na Revisão.
function toHiddenItemDto(row) {
  return {
    id:                    row.id,
    quantity:              row.quantity,
    unit:                  row.unit,
    rawSku:                row.raw_sku,
    rawDescription:        row.raw_description,
    manufacturerReference: row.manufacturer_reference ?? null,
    manufacturerName:      row.manufacturer_name ?? null,
    status:                'HIDDEN',
    ignoredRuleId:         row.ignored_rule_id ?? null,
    ignoredReason:         row.resolution_note ?? row.rule_reason ?? null,
    ruleMatchType:         row.rule_match_type ?? null,
    createdAt:             row.created_at,
  };
}

// Converte um order_item oculto por regra para o mesmo formato exibido em hiddenItems.
function toHiddenOrderItemDto(row) {
  return {
    id:                    row.id,
    quantity:              row.quantity,
    unit:                  row.product_unit,
    rawSku:                row.product_sku,
    rawDescription:        row.product_name,
    manufacturerReference: row.product_manufacturer_reference ?? null,
    manufacturerName:      row.product_manufacturer_name ?? null,
    status:                'HIDDEN',
    ignoredRuleId:         row.ignored_rule_id ?? null,
    ignoredReason:         row.hide_reason ?? row.rule_reason ?? null,
    ruleMatchType:         row.rule_match_type ?? null,
    createdAt:             row.created_at,
    source:                'order_item',
  };
}

export async function getOrder(id, { includeHidden = false } = {}) {
  const [order, items, hiddenUnlinked, hiddenOrderItems] = await Promise.all([
    findOrderById(id),
    findOrderItems(id),
    includeHidden ? listHiddenDavItemsByOrder(id) : Promise.resolve([]),
    includeHidden ? findHiddenOrderItems(id)      : Promise.resolve([]),
  ]);
  if (!order) return null;

  return {
    ...toOrderDto(order),
    items: items.map(toItemDto),
    hiddenItems: [
      ...hiddenUnlinked.map(toHiddenItemDto),
      ...hiddenOrderItems.map(toHiddenOrderItemDto),
    ],
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
