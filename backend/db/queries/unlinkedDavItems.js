import sql from '../pool.js';

// ============================================================
// Queries de itens DAV sem vínculo com catálogo
// ============================================================

// Campos retornados em conjunto com dados do pedido de origem.
// manufacturer_reference / manufacturer_name vêm da migration 009.
// ignored_rule_id e rule_* vêm da migration 010 (rastreio do motivo da ocultação).
const unlinkedWithOrderFields = sql`
  u.id,
  u.order_id,
  u.raw_sku,
  u.raw_description,
  u.quantity,
  u.unit,
  u.manufacturer_reference,
  u.manufacturer_name,
  u.status,
  u.product_id,
  u.ignored_rule_id,
  u.hidden_manually,
  u.resolution_note,
  u.resolved_at,
  u.resolved_by,
  u.created_at,
  u.updated_at,
  o.order_number  AS dav_number,
  o.customer_name AS customer_name,
  r.match_type    AS rule_match_type,
  r.reason        AS rule_reason
`;

// Lista itens não vinculados — por padrão, somente PENDING.
// Passar status null retorna todos (útil para auditoria/histórico).
export async function listUnlinkedDavItems({ status = 'PENDING' } = {}) {
  if (status === null) {
    return sql`
      SELECT ${unlinkedWithOrderFields}
      FROM unlinked_dav_items u
      JOIN orders o ON o.id = u.order_id
      LEFT JOIN ignored_dav_items r ON r.id = u.ignored_rule_id
      ORDER BY u.created_at DESC
    `;
  }
  return sql`
    SELECT ${unlinkedWithOrderFields}
    FROM unlinked_dav_items u
    JOIN orders o ON o.id = u.order_id
    LEFT JOIN ignored_dav_items r ON r.id = u.ignored_rule_id
    WHERE u.status = ${status}
    ORDER BY u.created_at DESC
  `;
}

// Lista itens ocultos (status=HIDDEN) de um pedido específico.
// Usado pelo toggle "Mostrar itens ocultos" na tela de Revisão.
export async function listHiddenDavItemsByOrder(orderId) {
  return sql`
    SELECT ${unlinkedWithOrderFields}
    FROM unlinked_dav_items u
    JOIN orders o ON o.id = u.order_id
    LEFT JOIN ignored_dav_items r ON r.id = u.ignored_rule_id
    WHERE u.order_id = ${orderId} AND u.status = 'HIDDEN'
    ORDER BY u.created_at ASC
  `;
}

export async function findUnlinkedDavItemById(id) {
  const rows = await sql`
    SELECT ${unlinkedWithOrderFields}
    FROM unlinked_dav_items u
    JOIN orders o ON o.id = u.order_id
    LEFT JOIN ignored_dav_items r ON r.id = u.ignored_rule_id
    WHERE u.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Cria registro ao importar DAV — chamado pelo orderService.importDav.
// Pode ser PENDING (sem produto cadastrado) ou HIDDEN (ocultado por regra).
// Quando status='HIDDEN', ignoredRuleId rastreia qual regra aplicou.
export async function createUnlinkedDavItem({
  orderId, rawSku, rawDescription, quantity, unit,
  manufacturerReference, manufacturerName,
  status = 'PENDING',
  ignoredRuleId = null,
  resolutionNote = null,
  hiddenManually = false,
}) {
  const rows = await sql`
    INSERT INTO unlinked_dav_items (
      order_id, raw_sku, raw_description, quantity, unit,
      manufacturer_reference, manufacturer_name,
      status, ignored_rule_id, resolution_note, hidden_manually
    )
    VALUES (
      ${orderId}, ${rawSku ?? null}, ${rawDescription}, ${quantity}, ${unit ?? null},
      ${manufacturerReference ?? null}, ${manufacturerName ?? null},
      ${status}, ${ignoredRuleId}, ${resolutionNote}, ${hiddenManually}
    )
    RETURNING id, order_id, raw_sku, raw_description, quantity, unit,
              manufacturer_reference, manufacturer_name,
              status, ignored_rule_id, resolution_note, hidden_manually, created_at
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
    RETURNING id, order_id, raw_sku, raw_description, quantity, unit,
              manufacturer_reference, manufacturer_name,
              status, product_id, ignored_rule_id,
              resolution_note, resolved_at, resolved_by,
              created_at, updated_at
  `;
  return rows[0] ?? null;
}

export async function markUnlinkedDavItemHidden(id, { ignoredRuleId, resolutionNote, resolvedBy, hiddenManually = false }) {
  const rows = await sql`
    UPDATE unlinked_dav_items
    SET status          = 'HIDDEN',
        product_id      = NULL,
        ignored_rule_id = ${ignoredRuleId},
        resolution_note = ${resolutionNote},
        hidden_manually = ${hiddenManually},
        resolved_at     = NOW(),
        resolved_by     = ${resolvedBy},
        updated_at      = NOW()
    WHERE id = ${id}
    RETURNING id, order_id, raw_sku, raw_description, quantity, unit,
              manufacturer_reference, manufacturer_name,
              status, product_id, ignored_rule_id, hidden_manually,
              resolution_note, resolved_at, resolved_by,
              created_at, updated_at
  `;
  return rows[0] ?? null;
}

// Lista TODOS os unlinked_dav_items elegíveis para reaplicação:
// PENDING (podem virar HIDDEN se baterem regra)
// HIDDEN com hidden_manually=FALSE (podem voltar para PENDING se nenhuma regra bater)
// LINKED é ignorado — já foi resolvido criando order_item.
export async function listUnlinkedDavItemsForReapply() {
  return sql`
    SELECT
      u.id, u.order_id, u.raw_sku, u.raw_description, u.quantity, u.unit,
      u.manufacturer_reference, u.manufacturer_name,
      u.status, u.product_id, u.ignored_rule_id, u.hidden_manually,
      u.resolution_note
    FROM unlinked_dav_items u
    WHERE u.status = 'PENDING'
       OR (u.status = 'HIDDEN' AND u.hidden_manually = FALSE)
  `;
}

// Reaplicação: marca PENDING como HIDDEN por regra.
export async function markPendingAsHiddenByRule(id, { ignoredRuleId, resolutionNote }) {
  const rows = await sql`
    UPDATE unlinked_dav_items
    SET status          = 'HIDDEN',
        ignored_rule_id = ${ignoredRuleId},
        resolution_note = ${resolutionNote},
        hidden_manually = FALSE,
        updated_at      = NOW()
    WHERE id = ${id}
      AND status = 'PENDING'
    RETURNING id, status
  `;
  return rows[0] ?? null;
}

// Reaplicação: HIDDEN por regra que continua batendo (regra trocou de id).
export async function updateHiddenRuleBinding(id, { ignoredRuleId, resolutionNote }) {
  const rows = await sql`
    UPDATE unlinked_dav_items
    SET ignored_rule_id = ${ignoredRuleId},
        resolution_note = ${resolutionNote},
        updated_at      = NOW()
    WHERE id = ${id}
      AND status = 'HIDDEN'
      AND hidden_manually = FALSE
    RETURNING id, status, ignored_rule_id
  `;
  return rows[0] ?? null;
}

// Reaplicação: HIDDEN por regra que não bate mais → volta para PENDING.
// Não toca em itens marcados como hidden_manually.
export async function revertHiddenToPending(id) {
  const rows = await sql`
    UPDATE unlinked_dav_items
    SET status          = 'PENDING',
        ignored_rule_id = NULL,
        resolution_note = NULL,
        resolved_at     = NULL,
        resolved_by     = NULL,
        updated_at      = NOW()
    WHERE id = ${id}
      AND status = 'HIDDEN'
      AND hidden_manually = FALSE
    RETURNING id, status
  `;
  return rows[0] ?? null;
}

// Lista TODOS os itens não vinculados PENDING agrupados ainda em formato linha,
// para o service montar os grupos. Inclui dados do pedido para construir
// `orders` em cada grupo.
export async function listPendingUnlinkedDavItemsWithOrder() {
  return sql`
    SELECT
      u.id,
      u.order_id,
      u.raw_sku,
      u.raw_description,
      u.quantity,
      u.unit,
      u.manufacturer_reference,
      u.manufacturer_name,
      u.created_at,
      o.order_number  AS dav_number,
      o.customer_name AS customer_name
    FROM unlinked_dav_items u
    JOIN orders o ON o.id = u.order_id
    WHERE u.status = 'PENDING'
    ORDER BY u.created_at ASC
  `;
}

// Atualiza um conjunto de unlinked_dav_items para LINKED apontando ao produto.
// Usado por linkGroupToProduct / registerProductForGroup.
export async function linkUnlinkedItemsBatch(ids, { productId, resolutionNote, resolvedBy }) {
  if (!ids || ids.length === 0) return [];
  const rows = await sql`
    UPDATE unlinked_dav_items
    SET status          = 'LINKED',
        product_id      = ${productId},
        resolution_note = ${resolutionNote},
        resolved_at     = NOW(),
        resolved_by     = ${resolvedBy},
        updated_at      = NOW()
    WHERE id IN ${sql(ids)}
      AND status = 'PENDING'
    RETURNING id, order_id, quantity
  `;
  return rows;
}

// Marca um lote inteiro como HIDDEN — usado por hideGroup quando o ADMIN
// decide ocultar todos os itens do grupo em uma só operação.
export async function markUnlinkedDavItemsHiddenBatch(ids, { ignoredRuleId, resolutionNote, resolvedBy, hiddenManually }) {
  if (!ids || ids.length === 0) return [];
  const rows = await sql`
    UPDATE unlinked_dav_items
    SET status          = 'HIDDEN',
        product_id      = NULL,
        ignored_rule_id = ${ignoredRuleId},
        resolution_note = ${resolutionNote},
        hidden_manually = ${hiddenManually ?? false},
        resolved_at     = NOW(),
        resolved_by     = ${resolvedBy},
        updated_at      = NOW()
    WHERE id IN ${sql(ids)}
      AND status = 'PENDING'
    RETURNING id, order_id
  `;
  return rows;
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
