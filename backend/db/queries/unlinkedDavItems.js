import sql from '../pool.js';

// ============================================================
// Queries de itens DAV sem vínculo com catálogo
// ============================================================

// Campos retornados em conjunto com dados do pedido de origem.
const unlinkedWithOrderFields = sql`
  u.id,
  u.order_id,
  u.raw_sku,
  u.raw_description,
  u.quantity,
  u.unit,
  u.status,
  u.product_id,
  u.resolution_note,
  u.resolved_at,
  u.resolved_by,
  u.created_at,
  u.updated_at,
  o.order_number  AS dav_number,
  o.customer_name AS customer_name
`;

// Lista itens não vinculados — por padrão, somente PENDING.
// Passar status null retorna todos (útil para auditoria/histórico).
export async function listUnlinkedDavItems({ status = 'PENDING' } = {}) {
  if (status === null) {
    return sql`
      SELECT ${unlinkedWithOrderFields}
      FROM unlinked_dav_items u
      JOIN orders o ON o.id = u.order_id
      ORDER BY u.created_at DESC
    `;
  }
  return sql`
    SELECT ${unlinkedWithOrderFields}
    FROM unlinked_dav_items u
    JOIN orders o ON o.id = u.order_id
    WHERE u.status = ${status}
    ORDER BY u.created_at DESC
  `;
}

export async function findUnlinkedDavItemById(id) {
  const rows = await sql`
    SELECT ${unlinkedWithOrderFields}
    FROM unlinked_dav_items u
    JOIN orders o ON o.id = u.order_id
    WHERE u.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Cria registro ao importar DAV — chamado pelo orderService.importDav
// quando o item extraído não tem produto correspondente no catálogo.
export async function createUnlinkedDavItem({ orderId, rawSku, rawDescription, quantity, unit }) {
  const rows = await sql`
    INSERT INTO unlinked_dav_items (order_id, raw_sku, raw_description, quantity, unit)
    VALUES (${orderId}, ${rawSku ?? null}, ${rawDescription}, ${quantity}, ${unit ?? null})
    RETURNING id, order_id, raw_sku, raw_description, quantity, unit, status, created_at
  `;
  return rows[0];
}

// Atualiza status do item — usado por linkToProduct, registerAsProduct e hide.
// productId pode ser null quando estado for HIDDEN.
export async function updateUnlinkedDavItemStatus(id, { status, productId = null, resolutionNote = null, resolvedBy }) {
  const rows = await sql`
    UPDATE unlinked_dav_items
    SET status          = ${status},
        product_id      = ${productId},
        resolution_note = ${resolutionNote},
        resolved_at     = NOW(),
        resolved_by     = ${resolvedBy},
        updated_at      = NOW()
    WHERE id = ${id}
    RETURNING id, order_id, raw_sku, raw_description, quantity, unit, status, product_id,
              resolution_note, resolved_at, resolved_by, created_at, updated_at
  `;
  return rows[0] ?? null;
}

// Conta itens não vinculados pendentes — útil para dashboard.
export async function countPendingUnlinkedDavItems() {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM unlinked_dav_items
    WHERE status = 'PENDING'
  `;
  return rows[0].count;
}
