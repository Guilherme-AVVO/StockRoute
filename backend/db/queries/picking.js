import sql from '../pool.js';

// ============================================================
// Queries do fluxo do estoquista (picking).
//
// Convenções de status:
//   - orders.status     : PENDING | IN_PROGRESS | PICKING | COMPLETED | OBSERVATION | CANCELLED
//   - order_items.status: PENDING | PICKED | PARTIAL | MISSING
//
// "Disponíveis para o estoquista" são os pedidos que o ADMIN já publicou
// (status = IN_PROGRESS) e que ainda não foram pegos por ninguém
// (assigned_to IS NULL).
// ============================================================

// Lista pedidos publicados aguardando separação.
// Ordena por delivery_date (mais próxima primeiro) e cai para created_at quando
// a data de entrega não foi cadastrada (NULLS LAST).
export async function listAvailableOrdersForStockist() {
  return sql`
    SELECT
      o.id,
      o.order_number,
      o.customer_name,
      o.status,
      o.delivery_date,
      o.created_at,
      o.updated_at,
      (
        SELECT COUNT(*)::int
        FROM order_items oi
        WHERE oi.order_id = o.id
          AND oi.hidden = FALSE
      ) AS items_count
    FROM orders o
    WHERE o.status = 'IN_PROGRESS'
      AND o.assigned_to IS NULL
    ORDER BY o.delivery_date ASC NULLS LAST, o.created_at ASC
  `;
}

// Recupera um pedido pelo id, com responsável e timestamps de picking.
export async function findOrderForPickingById(orderId) {
  const rows = await sql`
    SELECT
      o.id,
      o.order_number,
      o.customer_name,
      o.status,
      o.pdf_url,
      o.delivery_date,
      o.assigned_to,
      o.started_at,
      o.finished_at,
      o.created_at,
      o.updated_at,
      u.name  AS assigned_name,
      u.email AS assigned_email
    FROM orders o
    LEFT JOIN users u ON u.id = o.assigned_to
    WHERE o.id = ${orderId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Pedido em separação (PICKING) atualmente atribuído a um estoquista.
// Garante a regra "1 pedido ativo por estoquista" no nível de aplicação,
// complementando o índice único parcial criado na migration 016.
export async function findActivePickingByUser(userId) {
  const rows = await sql`
    SELECT id, order_number, customer_name, status
    FROM orders
    WHERE assigned_to = ${userId}
      AND status = 'PICKING'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Inicia a separação: status IN_PROGRESS → PICKING e atribui ao estoquista.
// Bloqueia a transição se o pedido já tiver sido pego ou estiver fora de IN_PROGRESS.
export async function startPickingByUser(orderId, userId) {
  const rows = await sql`
    UPDATE orders
    SET status      = 'PICKING',
        assigned_to = ${userId},
        started_at  = NOW(),
        updated_at  = NOW()
    WHERE id = ${orderId}
      AND status = 'IN_PROGRESS'
      AND assigned_to IS NULL
    RETURNING
      id, order_number, customer_name, status,
      assigned_to, started_at, finished_at,
      delivery_date, created_at, updated_at
  `;
  return rows[0] ?? null;
}

// Lista itens visíveis (included = true) do pedido, com produto e flag de evidência.
export async function listPickingItems(orderId) {
  return sql`
    SELECT
      oi.id,
      oi.quantity,
      oi.picked_quantity,
      oi.missing_quantity,
      oi.status,
      oi.confirmation_photo_url,
      oi.collected_at,
      oi.not_found_reason,
      oi.not_found_notes,
      oi.created_at,
      oi.updated_at,
      p.id        AS product_id,
      p.sku       AS product_sku,
      p.name      AS product_name,
      p.unit      AS product_unit,
      p.image_url AS product_image_url,
      p.manufacturer_name      AS product_manufacturer_name,
      p.manufacturer_reference AS product_manufacturer_reference
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ${orderId}
      AND oi.hidden = FALSE
    ORDER BY p.name ASC
  `;
}

// Item individual com o pedido, usado para validar permissões e estado.
export async function findOrderItemForPicking(itemId) {
  const rows = await sql`
    SELECT
      oi.id,
      oi.order_id,
      oi.product_id,
      oi.quantity,
      oi.picked_quantity,
      oi.missing_quantity,
      oi.status,
      oi.confirmation_photo_url,
      oi.collected_at,
      oi.not_found_reason,
      oi.not_found_notes,
      oi.hidden,
      o.status      AS order_status,
      o.assigned_to AS order_assigned_to,
      o.order_number,
      o.customer_name
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = ${itemId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Marca um item como COLETADO (PICKED), gravando foto e timestamp.
// Quantidades são preservadas no formato compatível com a constraint
// picked_quantity + missing_quantity <= quantity.
export async function setItemCollected(itemId, { photoUrl, quantity }) {
  const rows = await sql`
    UPDATE order_items
    SET status                 = 'PICKED',
        picked_quantity        = ${quantity},
        missing_quantity       = 0,
        confirmation_photo_url = ${photoUrl},
        collected_at           = NOW(),
        not_found_reason       = NULL,
        not_found_notes        = NULL,
        updated_at             = NOW()
    WHERE id = ${itemId}
    RETURNING
      id, order_id, product_id, quantity,
      picked_quantity, missing_quantity, status,
      confirmation_photo_url, collected_at,
      not_found_reason, not_found_notes,
      updated_at
  `;
  return rows[0] ?? null;
}

// Marca um item como NÃO ENCONTRADO (MISSING), registrando motivo e nota.
// Limpa quantidades coletadas e foto/timestamp de coleta.
export async function setItemNotFound(itemId, { reason, notes, quantity }) {
  const rows = await sql`
    UPDATE order_items
    SET status                 = 'MISSING',
        picked_quantity        = 0,
        missing_quantity       = ${quantity},
        confirmation_photo_url = NULL,
        collected_at           = NULL,
        not_found_reason       = ${reason},
        not_found_notes        = ${notes ?? null},
        updated_at             = NOW()
    WHERE id = ${itemId}
    RETURNING
      id, order_id, product_id, quantity,
      picked_quantity, missing_quantity, status,
      confirmation_photo_url, collected_at,
      not_found_reason, not_found_notes,
      updated_at
  `;
  return rows[0] ?? null;
}

// Conta itens visíveis ainda PENDING (impede finalizar antes de processar todos).
export async function countPendingVisibleItems(orderId) {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM order_items
    WHERE order_id = ${orderId}
      AND hidden = FALSE
      AND status = 'PENDING'
  `;
  return rows[0]?.count ?? 0;
}

// Conta itens MISSING (define se o final será COMPLETED ou OBSERVATION).
export async function countMissingVisibleItems(orderId) {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM order_items
    WHERE order_id = ${orderId}
      AND hidden = FALSE
      AND status = 'MISSING'
  `;
  return rows[0]?.count ?? 0;
}

// Finaliza o pedido com o status calculado (COMPLETED ou OBSERVATION).
export async function finishOrder(orderId, finalStatus) {
  const rows = await sql`
    UPDATE orders
    SET status      = ${finalStatus},
        finished_at = NOW(),
        updated_at  = NOW()
    WHERE id = ${orderId}
    RETURNING
      id, order_number, customer_name, status,
      assigned_to, started_at, finished_at,
      delivery_date, created_at, updated_at
  `;
  return rows[0] ?? null;
}
