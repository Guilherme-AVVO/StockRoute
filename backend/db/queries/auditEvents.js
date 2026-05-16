import sql from '../pool.js';

// Queries da tabela audit_events. Append-only — não há UPDATE/DELETE.

const auditFields = sql`
  id,
  event_type,
  entity_type,
  entity_id,
  order_id,
  order_item_id,
  dav_number,
  client_name,
  user_id,
  responsible_name,
  responsible_role,
  status,
  title,
  description,
  evidence_type,
  evidence_url,
  metadata,
  created_at
`;

export async function createAuditEvent(data) {
  const rows = await sql`
    INSERT INTO audit_events (
      event_type, entity_type, entity_id,
      order_id, order_item_id, dav_number, client_name,
      user_id, responsible_name, responsible_role,
      status, title, description,
      evidence_type, evidence_url, metadata
    )
    VALUES (
      ${data.eventType},
      ${data.entityType ?? null},
      ${data.entityId ?? null},
      ${data.orderId ?? null},
      ${data.orderItemId ?? null},
      ${data.davNumber ?? null},
      ${data.clientName ?? null},
      ${data.userId ?? null},
      ${data.responsibleName ?? null},
      ${data.responsibleRole ?? null},
      ${data.status ?? null},
      ${data.title},
      ${data.description ?? null},
      ${data.evidenceType ?? null},
      ${data.evidenceUrl ?? null},
      ${sql.json(data.metadata ?? {})}
    )
    RETURNING ${auditFields}
  `;
  return rows[0];
}

export async function findAuditEventById(id) {
  const rows = await sql`
    SELECT ${auditFields} FROM audit_events WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

// Lista paginada com filtros opcionais.
// Aceita: search, eventType, status, davNumber, dateFrom, dateTo, onlyPending,
// page, limit. Retorna array de linhas — count separado via countAuditEvents.
//
// onlyPending: convenção operacional — eventos cujo status indica que ainda
// requer ação do ADMIN (Observação, Aguardando, Pendente, Erro).
const PENDING_STATUSES = sql`('Observação','Aguardando','Pendente','Erro')`;

function applyFilters(filters) {
  const {
    search    = null,
    eventType = null,
    status    = null,
    davNumber = null,
    userId    = null,
    dateFrom  = null,
    dateTo    = null,
    onlyPending = false,
  } = filters ?? {};

  const pattern = search ? `%${search}%` : null;

  // Monta cláusula AND única — postgres-js permite agrupar com fragments.
  return sql`
    WHERE 1 = 1
      ${eventType ? sql`AND event_type = ${eventType}` : sql``}
      ${status    ? sql`AND status     = ${status}`    : sql``}
      ${davNumber ? sql`AND dav_number = ${davNumber}` : sql``}
      ${userId    ? sql`AND user_id    = ${userId}`    : sql``}
      ${dateFrom  ? sql`AND created_at >= ${dateFrom}` : sql``}
      ${dateTo    ? sql`AND created_at <= ${dateTo}`   : sql``}
      ${onlyPending ? sql`AND status IN ${PENDING_STATUSES}` : sql``}
      ${pattern ? sql`AND (
            dav_number       ILIKE ${pattern}
         OR client_name      ILIKE ${pattern}
         OR responsible_name ILIKE ${pattern}
         OR title            ILIKE ${pattern}
         OR description      ILIKE ${pattern}
      )` : sql``}
  `;
}

export async function listAuditEvents(filters = {}) {
  const page  = Math.max(1, parseInt(filters.page  ?? 1, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(filters.limit ?? 20, 10) || 20));
  const offset = (page - 1) * limit;
  const where = applyFilters(filters);

  return sql`
    SELECT ${auditFields}
    FROM audit_events
    ${where}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export async function countAuditEvents(filters = {}) {
  const where = applyFilters(filters);
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM audit_events
    ${where}
  `;
  return rows[0].count;
}

// Resumo para os StatCards da tela Histórico. Reflete o estado real do banco
// — se nenhum evento foi gerado ainda, retorna zeros, não mock.
export async function getAuditSummary() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM orders WHERE status = 'COMPLETED')                              AS completed_orders,
      (SELECT COUNT(*)::int FROM audit_events WHERE status = 'Observação')                       AS orders_with_observation,
      (SELECT COUNT(*)::int FROM audit_events WHERE evidence_url IS NOT NULL)                    AS registered_photos,
      (SELECT COUNT(*)::int FROM audit_events WHERE responsible_role = 'ADMIN')                  AS admin_actions,
      (SELECT COUNT(*)::int FROM audit_events)                                                   AS total_events,
      (SELECT COUNT(*)::int FROM audit_events WHERE status IN ${PENDING_STATUSES})               AS pending_events
  `;
  return rows[0];
}
