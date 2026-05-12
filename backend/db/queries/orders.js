import sql from '../pool.js';

// ============================================================
// Queries de pedidos (orders + order_items)
//
// Nota de design: product_id em order_items é NOT NULL.
// Apenas itens com produto cadastrado no catálogo são persistidos.
// Itens sem match são retornados no resumo do import mas não salvos.
// ============================================================

// Colunas de resumo reutilizadas em list e find
const orderSummaryFields = sql`
  o.id,
  o.order_number,
  o.customer_name,
  o.status,
  o.pdf_url,
  o.created_at,
  o.updated_at,
  COUNT(oi.id)::int                                              AS total_items,
  SUM(CASE WHEN oi.status = 'PICKED'  THEN 1 ELSE 0 END)::int  AS picked_items,
  SUM(CASE WHEN oi.status = 'MISSING' THEN 1 ELSE 0 END)::int  AS missing_items,
  SUM(CASE WHEN oi.status = 'PARTIAL' THEN 1 ELSE 0 END)::int  AS partial_items
`;

// Lista pedidos com filtros opcionais de status e/ou busca textual.
// Ordenação por created_at DESC (mais recente primeiro).
export async function listOrders({ status, search } = {}) {
  const pattern = search ? `%${search}%` : null;

  if (status && pattern) {
    return sql`
      SELECT ${orderSummaryFields}
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status = ${status}
        AND (o.order_number ILIKE ${pattern} OR o.customer_name ILIKE ${pattern})
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
  }

  if (status) {
    return sql`
      SELECT ${orderSummaryFields}
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status = ${status}
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
  }

  if (pattern) {
    return sql`
      SELECT ${orderSummaryFields}
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.order_number ILIKE ${pattern} OR o.customer_name ILIKE ${pattern}
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
  }

  return sql`
    SELECT ${orderSummaryFields}
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
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
export async function findOrderItems(orderId) {
  return sql`
    SELECT
      oi.id               AS id,
      oi.quantity,
      oi.picked_quantity,
      oi.missing_quantity,
      oi.status,
      oi.created_at,
      oi.updated_at,
      p.id                AS product_id,
      p.sku               AS product_sku,
      p.name              AS product_name,
      p.unit              AS product_unit,
      p.image_url         AS product_image_url
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ${orderId}
    ORDER BY p.name ASC
  `;
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

export async function updateOrderItem(itemId, { pickedQty, missingQty, status }) {
  const rows = await sql`
    UPDATE order_items
    SET picked_quantity  = ${pickedQty},
        missing_quantity = ${missingQty},
        status           = ${status},
        updated_at       = NOW()
    WHERE id = ${itemId}
    RETURNING
      id, order_id, product_id, quantity,
      picked_quantity, missing_quantity, status, updated_at
  `;
  return rows[0] ?? null;
}
