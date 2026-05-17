import sql from '../pool.js';

// ============================================================
// Queries de pedidos (orders + order_items)
//
// Nota de design: product_id em order_items é NOT NULL.
// Apenas itens com produto cadastrado no catálogo são persistidos.
// Itens sem match são retornados no resumo do import mas não salvos.
// ============================================================

// Lista pedidos com filtros opcionais de status e/ou busca textual.
// Ordenação por created_at DESC (mais recente primeiro).
//
// Subqueries para contagens evitam que o LEFT JOIN com unlinked_dav_items
// multiplique linhas e quebre o COUNT de order_items.
export async function listOrders({ status, search } = {}) {
  const pattern = search ? `%${search}%` : null;

  if (status && pattern) {
    return sql`
      SELECT
        o.id, o.order_number, o.customer_name, o.status, o.pdf_url,
        o.created_at, o.updated_at,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE)               AS total_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'PICKED')  AS picked_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'MISSING') AS missing_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'PARTIAL') AS partial_items,
        (SELECT COUNT(*)::int FROM unlinked_dav_items u WHERE u.order_id = o.id AND u.status = 'PENDING')        AS unlinked_items
      FROM orders o
      WHERE o.status = ${status}
        AND (o.order_number ILIKE ${pattern} OR o.customer_name ILIKE ${pattern})
      ORDER BY o.created_at DESC
    `;
  }

  if (status) {
    return sql`
      SELECT
        o.id, o.order_number, o.customer_name, o.status, o.pdf_url,
        o.created_at, o.updated_at,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE)               AS total_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'PICKED')  AS picked_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'MISSING') AS missing_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'PARTIAL') AS partial_items,
        (SELECT COUNT(*)::int FROM unlinked_dav_items u WHERE u.order_id = o.id AND u.status = 'PENDING')        AS unlinked_items
      FROM orders o
      WHERE o.status = ${status}
      ORDER BY o.created_at DESC
    `;
  }

  if (pattern) {
    return sql`
      SELECT
        o.id, o.order_number, o.customer_name, o.status, o.pdf_url,
        o.created_at, o.updated_at,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE)               AS total_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'PICKED')  AS picked_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'MISSING') AS missing_items,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.hidden = FALSE AND oi.status = 'PARTIAL') AS partial_items,
        (SELECT COUNT(*)::int FROM unlinked_dav_items u WHERE u.order_id = o.id AND u.status = 'PENDING')        AS unlinked_items
      FROM orders o
      WHERE o.order_number ILIKE ${pattern} OR o.customer_name ILIKE ${pattern}
      ORDER BY o.created_at DESC
    `;
  }

  return sql`
    SELECT
      o.id, o.order_number, o.customer_name, o.status, o.pdf_url,
      o.created_at, o.updated_at,
      (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id)                                      AS total_items,
      (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.status = 'PICKED')             AS picked_items,
      (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.status = 'MISSING')            AS missing_items,
      (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.status = 'PARTIAL')            AS partial_items,
      (SELECT COUNT(*)::int FROM unlinked_dav_items u WHERE u.order_id = o.id AND u.status = 'PENDING')        AS unlinked_items
    FROM orders o
    ORDER BY o.created_at DESC
  `;
}

// Retorna o cabeçalho do pedido (sem itens).
export async function findOrderById(id) {
  const rows = await sql`
    SELECT
      o.id,
      o.order_number,
      o.customer_name,
      o.status,
      o.pdf_url,
      o.created_at,
      o.updated_at
    FROM orders o
    WHERE o.id = ${id}
  `;
  return rows[0] ?? null;
}

// Usado para evitar importar o mesmo DAV duas vezes.
export async function findOrderByNumber(orderNumber) {
  const rows = await sql`
    SELECT id, order_number, status
    FROM orders
    WHERE order_number = ${orderNumber}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Retorna itens do pedido com dados do produto vinculado, ordenados por nome.
// Itens ocultos por regra (hidden = TRUE) ficam de fora da revisão/picking —
// para listá-los use findHiddenOrderItems.
export async function findOrderItems(orderId) {
  return sql`
    SELECT
      oi.id               AS id,
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
      p.id                AS product_id,
      p.sku               AS product_sku,
      p.name              AS product_name,
      p.unit              AS product_unit,
      p.image_url         AS product_image_url,
      p.manufacturer_name      AS product_manufacturer_name,
      p.manufacturer_reference AS product_manufacturer_reference
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ${orderId}
      AND oi.hidden = FALSE
    ORDER BY p.name ASC
  `;
}

// Lista TODOS os order_items ocultos por regra, agregados por pedido.
// Usado pela aba "Ocultos" (admin), unindo com unlinked_dav_items hidden.
export async function listAllHiddenOrderItems() {
  return sql`
    SELECT
      oi.id,
      oi.order_id,
      oi.quantity,
      oi.hidden,
      oi.ignored_rule_id,
      oi.hide_reason,
      oi.created_at,
      oi.updated_at,
      p.id                AS product_id,
      p.sku               AS product_sku,
      p.name              AS product_name,
      p.unit              AS product_unit,
      p.manufacturer_reference AS product_manufacturer_reference,
      p.manufacturer_name      AS product_manufacturer_name,
      o.order_number       AS dav_number,
      o.customer_name      AS customer_name,
      r.match_type         AS rule_match_type,
      r.reason             AS rule_reason
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o   ON o.id = oi.order_id
    LEFT JOIN ignored_dav_items r ON r.id = oi.ignored_rule_id
    WHERE oi.hidden = TRUE
    ORDER BY oi.updated_at DESC
  `;
}

// Itens do pedido ocultos por regra (não vão para picking).
// Usado pelo toggle "Mostrar itens ocultos" na tela de Revisão.
export async function findHiddenOrderItems(orderId) {
  return sql`
    SELECT
      oi.id               AS id,
      oi.quantity,
      oi.picked_quantity,
      oi.missing_quantity,
      oi.status,
      oi.hidden,
      oi.ignored_rule_id,
      oi.hide_reason,
      oi.created_at,
      oi.updated_at,
      p.id                AS product_id,
      p.sku               AS product_sku,
      p.name              AS product_name,
      p.unit              AS product_unit,
      p.image_url         AS product_image_url,
      p.manufacturer_reference AS product_manufacturer_reference,
      p.manufacturer_name      AS product_manufacturer_name,
      r.match_type        AS rule_match_type,
      r.reason            AS rule_reason
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN ignored_dav_items r ON r.id = oi.ignored_rule_id
    WHERE oi.order_id = ${orderId}
      AND oi.hidden = TRUE
    ORDER BY p.name ASC
  `;
}

// Lista TODOS os order_items (ocultos e não) com dados de produto para reaplicação.
// Inclui campos de fabricante/nome do produto necessários para matching contra regras.
export async function listAllOrderItemsForReapply() {
  return sql`
    SELECT
      oi.id,
      oi.order_id,
      oi.product_id,
      oi.hidden,
      oi.ignored_rule_id,
      p.name                   AS product_name,
      p.sku                    AS product_sku,
      p.manufacturer_reference AS manufacturer_reference,
      p.manufacturer_name      AS manufacturer_name
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
  `;
}

// Marca um order_item como oculto por regra.
export async function setOrderItemHidden(itemId, { ignoredRuleId, hideReason }) {
  const rows = await sql`
    UPDATE order_items
    SET hidden          = TRUE,
        ignored_rule_id = ${ignoredRuleId ?? null},
        hide_reason     = ${hideReason ?? null},
        updated_at      = NOW()
    WHERE id = ${itemId}
    RETURNING id, order_id, hidden, ignored_rule_id, hide_reason
  `;
  return rows[0] ?? null;
}

// Remove a ocultação por regra de um order_item — volta para a revisão/picking.
export async function clearOrderItemHidden(itemId) {
  const rows = await sql`
    UPDATE order_items
    SET hidden          = FALSE,
        ignored_rule_id = NULL,
        hide_reason     = NULL,
        updated_at      = NOW()
    WHERE id = ${itemId}
    RETURNING id, order_id, hidden
  `;
  return rows[0] ?? null;
}

export async function createOrder({ orderNumber, customerName, pdfUrl }) {
  const rows = await sql`
    INSERT INTO orders (order_number, customer_name, pdf_url)
    VALUES (${orderNumber}, ${customerName}, ${pdfUrl ?? null})
    RETURNING id, order_number, customer_name, status, pdf_url, created_at, updated_at
  `;
  return rows[0];
}

export async function updateOrderStatus(id, status) {
  const rows = await sql`
    UPDATE orders
    SET status     = ${status},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, order_number, customer_name, status, pdf_url, created_at, updated_at
  `;
  return rows[0] ?? null;
}

export async function createOrderItem({ orderId, productId, quantity }) {
  const rows = await sql`
    INSERT INTO order_items (order_id, product_id, quantity)
    VALUES (${orderId}, ${productId}, ${quantity})
    RETURNING
      id, order_id, product_id, quantity,
      picked_quantity, missing_quantity, status,
      created_at, updated_at
  `;
  return rows[0];
}
