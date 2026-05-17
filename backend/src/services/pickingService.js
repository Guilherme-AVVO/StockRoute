// ============================================================
// Service de picking do estoquista.
//
// Centraliza as regras de negócio descritas na especificação:
//   - apenas pedidos publicados (IN_PROGRESS) e não atribuídos podem ser iniciados;
//   - 1 pedido EM_SEPARACAO por estoquista (409 quando já existe outro ativo);
//   - somente o estoquista atribuído pode coletar / marcar não-encontrado / finalizar;
//   - finalizar exige todos os itens visíveis processados;
//   - status final calculado: COMPLETED se tudo foi coletado, OBSERVATION
//     se algum item ficou como NÃO ENCONTRADO.
//
// Status interno → label exibido no frontend (mapeamento canônico):
//   IN_PROGRESS  → AGUARDANDO
//   PICKING      → EM_SEPARACAO
//   COMPLETED    → CONCLUIDO
//   OBSERVATION  → OBSERVACAO
// ============================================================

import {
  listAvailableOrdersForStockist,
  findOrderForPickingById,
  findActivePickingByUser,
  startPickingByUser,
  listPickingItems,
  findOrderItemForPicking,
  setItemCollected,
  setItemNotFound,
  countPendingVisibleItems,
  countMissingVisibleItems,
  finishOrder,
} from '../../db/queries/picking.js';

export const STOCKIST_STATUS_LABELS = Object.freeze({
  IN_PROGRESS: 'AGUARDANDO',
  PICKING:     'EM_SEPARACAO',
  COMPLETED:   'CONCLUIDO',
  OBSERVATION: 'OBSERVACAO',
});

export const ITEM_STATUS_LABELS = Object.freeze({
  PENDING: 'PENDENTE',
  PICKED:  'COLETADO',
  MISSING: 'NAO_ENCONTRADO',
  PARTIAL: 'PARCIAL',
});

// Motivos válidos para "Não encontrado". OUTRO exige nota.
export const NOT_FOUND_REASONS = Object.freeze([
  'Falta no estoque',
  'Produto danificado',
  'Divergência de código',
  'Produto em local incorreto',
  'Outro',
]);

function urgencyLabelFor(deliveryDate) {
  if (!deliveryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deliveryDate);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return `Atrasado ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Entrega hoje';
  if (diffDays <= 2) return `Entrega em ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  return `Entrega em ${diffDays} dias`;
}

function toAvailableOrderDto(row, { userId } = {}) {
  const isMine = row.status === 'PICKING' && row.assigned_to === userId;
  return {
    id:            row.id,
    davNumber:     row.order_number,
    clientName:    row.customer_name,
    deliveryDate:  row.delivery_date,
    status:        STOCKIST_STATUS_LABELS[row.status] ?? row.status,
    rawStatus:     row.status,
    itemsCount:    row.items_count ?? 0,
    createdAt:     row.created_at,
    startedAt:     row.started_at ?? null,
    isMine,
    urgencyLabel:  urgencyLabelFor(row.delivery_date),
  };
}

function toPickingItemDto(row) {
  return {
    id:                     row.id,
    productId:              row.product_id,
    sku:                    row.product_sku,
    productName:            row.product_name,
    unit:                   row.product_unit,
    manufacturerName:       row.product_manufacturer_name ?? null,
    manufacturerReference:  row.product_manufacturer_reference ?? null,
    productPhotoUrl:        row.product_image_url ?? null,
    confirmationPhotoUrl:   row.confirmation_photo_url ?? null,
    quantity:               row.quantity,
    pickedQuantity:         row.picked_quantity,
    missingQuantity:        row.missing_quantity,
    status:                 ITEM_STATUS_LABELS[row.status] ?? row.status,
    rawStatus:              row.status,
    collectedAt:            row.collected_at,
    reason:                 row.not_found_reason ?? null,
    notes:                  row.not_found_notes ?? null,
    createdAt:              row.created_at,
    updatedAt:              row.updated_at,
  };
}

function toOrderDto(row) {
  return {
    id:           row.id,
    davNumber:    row.order_number,
    clientName:   row.customer_name,
    deliveryDate: row.delivery_date,
    status:       STOCKIST_STATUS_LABELS[row.status] ?? row.status,
    rawStatus:    row.status,
    assignedTo:   row.assigned_to ?? null,
    assignedName: row.assigned_name ?? null,
    startedAt:    row.started_at ?? null,
    finishedAt:   row.finished_at ?? null,
    pdfUrl:       row.pdf_url ?? null,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

export async function listAvailableOrders({ userId } = {}) {
  const rows = await listAvailableOrdersForStockist(userId);
  return rows.map((row) => toAvailableOrderDto(row, { userId }));
}

// Inicia separação de um pedido específico para o estoquista logado.
// 404: pedido inexistente
// 409: estoquista já tem outro pedido ativo OU pedido não está mais AGUARDANDO
export async function startPicking({ orderId, userId }) {
  const existing = await findActivePickingByUser(userId);
  if (existing) {
    // Caso especial: clicou no MESMO pedido que já está em separação.
    // Não é conflito — apenas retoma normalmente.
    if (existing.id === orderId) {
      return getOrderWithProgress(orderId);
    }
    throw {
      status: 409,
      message: `Você já possui o pedido ${existing.order_number} em separação. Finalize-o antes de iniciar outro.`,
      data: {
        activeOrderId:     existing.id,
        activeOrderNumber: existing.order_number,
        activeClientName:  existing.customer_name,
      },
    };
  }

  const order = await findOrderForPickingById(orderId);
  if (!order) {
    throw { status: 404, message: 'Pedido não encontrado' };
  }

  const updated = await startPickingByUser(orderId, userId);
  if (!updated) {
    throw {
      status: 409,
      message: 'Pedido não está mais disponível para separação.',
    };
  }
  return getOrderWithProgress(orderId);
}

function computeProgress(itemsDto) {
  const total          = itemsDto.length;
  const collected      = itemsDto.filter((it) => it.rawStatus === 'PICKED').length;
  const notFound       = itemsDto.filter((it) => it.rawStatus === 'MISSING').length;
  const pending        = itemsDto.filter((it) => it.rawStatus === 'PENDING').length;
  const processed      = collected + notFound;
  const pct            = total === 0 ? 0 : Math.round((processed / total) * 100);
  return { total, collected, notFound, pending, processed, pct };
}

async function getOrderWithProgress(orderId) {
  const order = await findOrderForPickingById(orderId);
  if (!order) return null;
  const items = (await listPickingItems(orderId)).map(toPickingItemDto);
  return {
    ...toOrderDto(order),
    items,
    progress: computeProgress(items),
  };
}

// Carrega o pedido garantindo que pertence ao estoquista logado.
// 404 quando inexistente; 403 quando assinado a outro usuário.
export async function getOrderForStockist({ orderId, user }) {
  const order = await findOrderForPickingById(orderId);
  if (!order) {
    throw { status: 404, message: 'Pedido não encontrado' };
  }
  // ADMIN não acessa o fluxo do estoquista por estas rotas — bloqueado pela
  // requireRole('ESTOQUISTA'). Aqui só validamos a posse do estoquista.
  if (order.assigned_to && order.assigned_to !== user.id) {
    throw { status: 403, message: 'Pedido atribuído a outro estoquista.' };
  }
  return getOrderWithProgress(orderId);
}

async function loadEditableItem({ itemId, user }) {
  const item = await findOrderItemForPicking(itemId);
  if (!item)              throw { status: 404, message: 'Item não encontrado' };
  if (item.hidden)        throw { status: 400, message: 'Item está oculto e não pode ser processado.' };
  if (item.order_status !== 'PICKING') {
    throw { status: 400, message: 'Pedido não está em separação.' };
  }
  if (item.order_assigned_to !== user.id) {
    throw { status: 403, message: 'Pedido atribuído a outro estoquista.' };
  }
  return item;
}

export async function collectItem({ itemId, user, photoUrl }) {
  if (!photoUrl) {
    throw { status: 400, message: 'Foto obrigatória para confirmar coleta.' };
  }
  const item = await loadEditableItem({ itemId, user });
  const updated = await setItemCollected(itemId, {
    photoUrl,
    quantity: item.quantity,
  });
  return { item: updated, order: item };
}

export async function markItemNotFound({ itemId, user, reason, notes }) {
  if (!reason || typeof reason !== 'string') {
    throw { status: 400, message: 'Motivo obrigatório.' };
  }
  if (!NOT_FOUND_REASONS.includes(reason)) {
    throw { status: 400, message: 'Motivo inválido.' };
  }
  if (reason === 'Outro' && (!notes || notes.trim().length === 0)) {
    throw { status: 400, message: 'Observação obrigatória quando o motivo é "Outro".' };
  }
  const item = await loadEditableItem({ itemId, user });
  const updated = await setItemNotFound(itemId, {
    reason,
    notes: notes?.trim() || null,
    quantity: item.quantity,
  });
  return { item: updated, order: item };
}

export async function finishPicking({ orderId, user }) {
  const order = await findOrderForPickingById(orderId);
  if (!order)                              throw { status: 404, message: 'Pedido não encontrado' };
  if (order.status !== 'PICKING')          throw { status: 400, message: 'Pedido não está em separação.' };
  if (order.assigned_to !== user.id)       throw { status: 403, message: 'Pedido atribuído a outro estoquista.' };

  const pending = await countPendingVisibleItems(orderId);
  if (pending > 0) {
    throw {
      status: 400,
      message: `Não é possível finalizar: ${pending} item(ns) ainda pendente(s).`,
      data: { pending },
    };
  }

  const missingCount = await countMissingVisibleItems(orderId);
  const finalStatus  = missingCount > 0 ? 'OBSERVATION' : 'COMPLETED';
  await finishOrder(orderId, finalStatus);
  return getSummary(orderId);
}

// Resumo final agregado para a tela de Resumo do estoquista.
export async function getSummary(orderId) {
  const order = await findOrderForPickingById(orderId);
  if (!order) return null;
  const items = (await listPickingItems(orderId)).map(toPickingItemDto);
  const progress = computeProgress(items);

  const startedAt  = order.started_at  ? new Date(order.started_at)  : null;
  const finishedAt = order.finished_at ? new Date(order.finished_at) : null;
  const durationMs = startedAt && finishedAt ? finishedAt - startedAt : null;

  const photos = items
    .filter((it) => it.rawStatus === 'PICKED' && it.confirmationPhotoUrl)
    .map((it) => ({
      itemId:    it.id,
      sku:       it.sku,
      productName: it.productName,
      quantity:  it.quantity,
      unit:      it.unit,
      url:       it.confirmationPhotoUrl,
      capturedAt: it.collectedAt,
    }));

  const reasons = items
    .filter((it) => it.rawStatus === 'MISSING')
    .map((it) => ({
      itemId:               it.id,
      sku:                  it.sku,
      productName:          it.productName,
      quantity:             it.quantity,
      unit:                 it.unit,
      manufacturerName:     it.manufacturerName,
      manufacturerReference: it.manufacturerReference,
      reason:               it.reason,
      notes:                it.notes,
    }));

  return {
    order:          toOrderDto(order),
    progress,
    totalItems:     progress.total,
    collectedItems: progress.collected,
    notFoundItems:  progress.notFound,
    pendingItems:   progress.pending,
    startedAt:      order.started_at,
    finishedAt:     order.finished_at,
    durationMs,
    photos,
    reasons,
    finalStatus:    STOCKIST_STATUS_LABELS[order.status] ?? order.status,
    rawFinalStatus: order.status,
    items,
  };
}
