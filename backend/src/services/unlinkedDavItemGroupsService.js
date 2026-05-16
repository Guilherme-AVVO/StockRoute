// Service: aba "Não vinculados" agrupada por produto.
//
// Em vez de devolver um item por linha, agrupa itens iguais (mesmo produto
// não cadastrado vindo de pedidos diferentes) usando `buildUnlinkedItemGroupKey`.
// Ações sobre o grupo (cadastrar, vincular, ocultar) afetam TODOS os itens
// daquele grupo em uma única operação.

import sql from '../../db/pool.js';
import {
  listPendingUnlinkedDavItemsWithOrder,
  linkUnlinkedItemsBatch,
  markUnlinkedDavItemsHiddenBatch,
} from '../../db/queries/unlinkedDavItems.js';
import {
  findProductById,
  findProductBySku,
  createProduct,
} from '../../db/queries/products.js';
import { createOrderItem } from '../../db/queries/orders.js';
import { createIgnoredDavItem } from './ignoredDavItemsService.js';
import { buildUnlinkedItemGroupKey } from '../utils/unlinkedDavItemGroup.js';

const VALID_UNITS = ['UN', 'CX', 'SC', 'PC', 'CT', 'PR', 'M'];

// Constrói o DTO de cada grupo a partir das linhas agregadas.
function toGroupDto(groupKey, rows) {
  // Sample = primeiro item (mais antigo) — usado para pré-preenchimento.
  const sample = rows[0];
  const ordersMap = new Map();
  let totalQuantity = 0;
  for (const r of rows) {
    totalQuantity += Number(r.quantity ?? 0);
    // Combina múltiplos itens de um mesmo pedido (raro mas possível).
    const existing = ordersMap.get(r.order_id);
    if (existing) {
      existing.quantity += Number(r.quantity ?? 0);
    } else {
      ordersMap.set(r.order_id, {
        orderId:    r.order_id,
        davNumber:  r.dav_number,
        clientName: r.customer_name,
        quantity:   Number(r.quantity ?? 0),
      });
    }
  }
  return {
    groupKey,
    sampleItemId:          sample.id,
    manufacturerReference: sample.manufacturer_reference ?? null,
    manufacturerName:      sample.manufacturer_name ?? null,
    sku:                   sample.raw_sku ?? null,
    rawDescription:        sample.raw_description ?? null,
    unit:                  sample.unit ?? null,
    occurrences:           rows.length,
    totalQuantity,
    orders:                Array.from(ordersMap.values()),
    affectedOrdersCount:   ordersMap.size,
    itemIds:               rows.map((r) => r.id),
    createdAt:             sample.created_at,
  };
}

export async function listUnlinkedDavItemGroups() {
  const rows = await listPendingUnlinkedDavItemsWithOrder();
  const groups = new Map();
  for (const row of rows) {
    const key = buildUnlinkedItemGroupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Array.from(groups.entries()).map(([key, items]) => toGroupDto(key, items));
}

// Helper interno: para uma ação sobre um grupo, retorna os ids das linhas
// que pertencem a ele AGORA (recalcula via groupKey — não confia no client).
async function resolveGroupItemIds(groupKey) {
  const rows = await listPendingUnlinkedDavItemsWithOrder();
  const matching = rows.filter((r) => buildUnlinkedItemGroupKey(r) === groupKey);
  return { ids: matching.map((r) => r.id), rows: matching };
}

// Cadastra um produto novo a partir de um grupo e vincula todos os itens
// pendentes daquele grupo ao produto. Se já existir produto com mesmo SKU,
// devolve 409 com o id existente — mesma escolha do fluxo single-item original
// para evitar duplicata silenciosa de SKU.
export async function registerProductForGroup({ groupKey, productData, userId }) {
  if (!groupKey) throw { status: 400, message: 'groupKey é obrigatório' };

  const { ids, rows } = await resolveGroupItemIds(groupKey);
  if (ids.length === 0) {
    throw { status: 404, message: 'Grupo não encontrado ou já resolvido' };
  }

  const sku  = String(productData?.sku  ?? '').trim();
  const name = String(productData?.name ?? '').trim();
  const unit = String(productData?.unit ?? '').trim().toUpperCase();

  if (!sku)  throw { status: 400, message: 'SKU é obrigatório' };
  if (!name) throw { status: 400, message: 'Nome do produto é obrigatório' };
  if (!VALID_UNITS.includes(unit)) {
    throw { status: 400, message: `Unidade inválida. Use uma de: ${VALID_UNITS.join(', ')}` };
  }

  const existing = await findProductBySku(sku);
  if (existing) {
    throw {
      status: 409,
      message: `Já existe um produto com SKU "${sku}". Use "Vincular" para reaproveitar este produto.`,
      existingProductId: existing.id,
    };
  }

  const sample = rows[0];
  const manufacturerReference = productData.manufacturerReference ?? sample.manufacturer_reference ?? null;
  const manufacturerName      = productData.manufacturerName      ?? sample.manufacturer_name      ?? null;

  const product = await createProduct({
    sku,
    name,
    unit,
    imageUrl: productData.imageUrl ?? null,
    manufacturerReference,
    manufacturerName,
  });

  // Atualiza unlinked em lote + cria order_items para cada pedido afetado
  // (cada item DAV vira um order_item no respectivo pedido).
  const updated = await linkUnlinkedItemsBatch(ids, {
    productId:      product.id,
    resolutionNote: `Cadastrado a partir de grupo: ${product.sku}`,
    resolvedBy:     userId,
  });
  for (const u of updated) {
    await createOrderItem({
      orderId:   u.order_id,
      productId: product.id,
      quantity:  u.quantity,
    });
  }

  const affectedOrders = new Set(updated.map((u) => u.order_id));
  return {
    product,
    linkedItemsCount:    updated.length,
    affectedOrdersCount: affectedOrders.size,
  };
}

export async function linkGroupToExistingProduct({ groupKey, productId, userId }) {
  if (!groupKey)  throw { status: 400, message: 'groupKey é obrigatório' };
  if (!productId) throw { status: 400, message: 'productId é obrigatório' };

  const product = await findProductById(productId);
  if (!product) {
    throw { status: 404, message: 'Produto informado não existe no catálogo' };
  }

  const { ids } = await resolveGroupItemIds(groupKey);
  if (ids.length === 0) {
    throw { status: 404, message: 'Grupo não encontrado ou já resolvido' };
  }

  const updated = await linkUnlinkedItemsBatch(ids, {
    productId:      product.id,
    resolutionNote: `Vinculado ao produto existente: ${product.sku}`,
    resolvedBy:     userId,
  });
  for (const u of updated) {
    await createOrderItem({
      orderId:   u.order_id,
      productId: product.id,
      quantity:  u.quantity,
    });
  }

  const affectedOrders = new Set(updated.map((u) => u.order_id));
  return {
    product,
    linkedItemsCount:    updated.length,
    affectedOrdersCount: affectedOrders.size,
  };
}

// Oculta o grupo inteiro: marca todos os itens do grupo como HIDDEN manualmente
// E cria uma regra NAME_CONTAINS (pela descrição do sample) para que próximos
// DAVs sejam ocultados automaticamente.
//
// Ordem importa: marcamos como HIDDEN manual ANTES de criar a regra. Caso
// contrário, a reaplicação disparada por createIgnoredDavItem mudaria os
// itens para HIDDEN com hidden_manually=FALSE e o batch subsequente não
// encontraria os ids ainda em PENDING.
export async function hideGroup({ groupKey, reason, userId }) {
  if (!groupKey)                                throw { status: 400, message: 'groupKey é obrigatório' };
  if (!reason || !String(reason).trim())        throw { status: 400, message: 'Motivo é obrigatório' };

  const { ids, rows } = await resolveGroupItemIds(groupKey);
  if (ids.length === 0) {
    throw { status: 404, message: 'Grupo não encontrado ou já resolvido' };
  }
  const sample = rows[0];
  const resolutionNote = String(reason).trim();

  const updated = await markUnlinkedDavItemsHiddenBatch(ids, {
    ignoredRuleId:  null,
    resolutionNote,
    resolvedBy:     userId,
    hiddenManually: true,
  });

  // Depois cria a regra (a reaplicação já não toca nos itens — todos com
  // hidden_manually=TRUE são preservados).
  const { rule } = await createIgnoredDavItem({
    matchType:      'NAME_CONTAINS',
    rawDescription: sample.raw_description,
    reason:         resolutionNote,
    createdBy:      userId,
  });

  // Vincula a regra criada aos itens já ocultos (apenas audit/rastreio).
  if (updated.length > 0) {
    await sql`
      UPDATE unlinked_dav_items
      SET ignored_rule_id = ${rule.id}, updated_at = NOW()
      WHERE id IN ${sql(updated.map((u) => u.id))}
        AND ignored_rule_id IS NULL
    `;
  }

  const affectedOrders = new Set(updated.map((u) => u.order_id));
  return {
    rule,
    hiddenItemsCount:    updated.length,
    affectedOrdersCount: affectedOrders.size,
  };
}
