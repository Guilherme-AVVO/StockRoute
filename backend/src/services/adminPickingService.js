// ============================================================
// Service de resolução de pendências do picking pelo ADMIN.
//
// Cobre dois fluxos após um pedido ter terminado como OBSERVATION
// (com itens MISSING):
//
//   1. resolveMissingItem(itemId, photoUrl): produto chegou no estoque;
//      ADMIN registra coleta (com foto obrigatória) e, se todos os
//      itens MISSING do pedido viraram PICKED, o pedido vira COMPLETED.
//
//   2. shipOrderWithMissing(orderId, notes): ADMIN aceita enviar o
//      pedido mesmo com item faltando. Status vira COMPLETED e os itens
//      MISSING continuam como tal no histórico (auditoria registra quem
//      autorizou e a justificativa).
// ============================================================

import {
  findOrderForPickingById,
  findOrderItemForPicking,
  setItemCollected,
  countMissingVisibleItems,
  countPendingVisibleItems,
  finishOrder,
} from '../../db/queries/picking.js';

export async function resolveMissingItemByAdmin({ orderId, itemId, photoUrl }) {
  if (!photoUrl) {
    throw { status: 400, message: 'Foto obrigatória para registrar a coleta do item.' };
  }

  const item = await findOrderItemForPicking(itemId);
  if (!item) throw { status: 404, message: 'Item não encontrado' };
  if (item.order_id !== orderId) {
    throw { status: 400, message: 'Item não pertence a este pedido.' };
  }
  if (item.hidden) {
    throw { status: 400, message: 'Item está oculto e não pode ser processado.' };
  }
  if (item.status !== 'MISSING') {
    throw { status: 400, message: 'Apenas itens marcados como não encontrados podem ser resolvidos.' };
  }

  const order = await findOrderForPickingById(orderId);
  if (!order) throw { status: 404, message: 'Pedido não encontrado' };
  if (order.status !== 'OBSERVATION') {
    throw { status: 400, message: 'Pedido não está em observação.' };
  }

  const updatedItem = await setItemCollected(itemId, {
    photoUrl,
    quantity: item.quantity,
  });

  // Se ainda houver pendências (PENDING ou MISSING), o pedido continua
  // OBSERVATION. Quando todos viraram PICKED, fechamos como COMPLETED.
  const stillMissing = await countMissingVisibleItems(orderId);
  const stillPending = await countPendingVisibleItems(orderId);
  let orderAfter = order;
  let promoted   = false;
  if (stillMissing === 0 && stillPending === 0) {
    orderAfter = await finishOrder(orderId, 'COMPLETED');
    promoted   = true;
  }

  return {
    item:      updatedItem,
    itemMeta:  { productName: item.product_name, productSku: item.product_sku, orderNumber: order.order_number, clientName: order.customer_name },
    order:     orderAfter,
    promoted,
    remainingMissing: stillMissing,
  };
}

export async function shipOrderWithMissing({ orderId, notes }) {
  const order = await findOrderForPickingById(orderId);
  if (!order) throw { status: 404, message: 'Pedido não encontrado' };
  if (order.status !== 'OBSERVATION') {
    throw { status: 400, message: 'Apenas pedidos em observação podem ser enviados com pendência.' };
  }

  const missingCount = await countMissingVisibleItems(orderId);
  if (missingCount === 0) {
    throw { status: 400, message: 'Pedido não possui itens faltantes.' };
  }

  const updated = await finishOrder(orderId, 'COMPLETED');
  return {
    order:        updated,
    missingCount,
    notes:        notes?.trim() || null,
    orderMeta:    { orderNumber: order.order_number, clientName: order.customer_name },
  };
}
