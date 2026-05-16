// Service central de auditoria/histórico.
//
// Provê dois fluxos:
//   1. `logAuditEvent(data, { req })` — chamado dentro de services/controllers
//      quando uma ação relevante acontece. Nunca lança — falha em auditoria
//      não pode quebrar o fluxo principal.
//   2. `listAuditEventsPage`, `getAuditSummary` — consumidos pela tela Histórico.
//
// Eventos sem usuário autenticado (jobs internos, importação automática) são
// registrados como "Sistema" / "SYSTEM".

import {
  createAuditEvent  as createAuditEventQuery,
  findAuditEventById,
  listAuditEvents,
  countAuditEvents,
  getAuditSummary   as getAuditSummaryQuery,
} from '../../db/queries/auditEvents.js';

// Tipos canônicos de evento. Mantemos como constantes para que os pontos
// de chamada não usem string solta — facilita refatoração e busca.
export const AUDIT_EVENT_TYPES = Object.freeze({
  DAV_UPLOADED:                 'DAV_UPLOADED',
  DAV_IMPORTED:                 'DAV_IMPORTED',
  ORDER_CREATED:                'ORDER_CREATED',
  ORDER_REVIEW_STARTED:         'ORDER_REVIEW_STARTED',
  ORDER_PUBLISHED:              'ORDER_PUBLISHED',
  ORDER_STATUS_CHANGED:         'ORDER_STATUS_CHANGED',
  PRODUCT_CREATED:              'PRODUCT_CREATED',
  PRODUCT_UPDATED:              'PRODUCT_UPDATED',
  PRODUCT_DELETED:              'PRODUCT_DELETED',
  UNLINKED_ITEM_CREATED:        'UNLINKED_ITEM_CREATED',
  UNLINKED_ITEM_LINKED:         'UNLINKED_ITEM_LINKED',
  PRODUCT_CREATED_FROM_UNLINKED:'PRODUCT_CREATED_FROM_UNLINKED',
  HIDE_RULE_CREATED:            'HIDE_RULE_CREATED',
  HIDE_RULE_UPDATED:            'HIDE_RULE_UPDATED',
  HIDE_RULE_DELETED:            'HIDE_RULE_DELETED',
  HIDE_RULE_STATUS_CHANGED:     'HIDE_RULE_STATUS_CHANGED',
  ITEM_HIDDEN_BY_RULE:          'ITEM_HIDDEN_BY_RULE',
  ITEM_HIDDEN_MANUALLY:         'ITEM_HIDDEN_MANUALLY',
  ITEM_UNHIDDEN:                'ITEM_UNHIDDEN',
  PICKING_STARTED:              'PICKING_STARTED',
  PICKING_ITEM_COLLECTED:       'PICKING_ITEM_COLLECTED',
  PICKING_ITEM_NOT_FOUND:       'PICKING_ITEM_NOT_FOUND',
  PICKING_FINISHED:             'PICKING_FINISHED',
  USER_CREATED:                 'USER_CREATED',
  USER_UPDATED:                 'USER_UPDATED',
  USER_STATUS_CHANGED:          'USER_STATUS_CHANGED',
  SETTINGS_UPDATED:             'SETTINGS_UPDATED',
});

function extractResponsible(req) {
  if (!req?.user) {
    return { userId: null, responsibleName: 'Sistema', responsibleRole: 'SYSTEM' };
  }
  const u = req.user;
  return {
    userId:           u.id ?? null,
    responsibleName:  u.name ?? u.email ?? 'Sem nome',
    responsibleRole:  u.role ?? 'USER',
  };
}

// Sanitização defensiva — metadata nunca deve carregar chaves perigosas.
const FORBIDDEN_METADATA_KEYS = new Set([
  'password', 'passwordHash', 'password_hash',
  'token', 'jwt', 'jwtSecret', 'JWT_SECRET',
  'secret', 'databaseUrl', 'DATABASE_URL',
  'authorization',
]);

function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_METADATA_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

// Função central. Não lança — apenas loga warning se falhar, porque a
// auditoria nunca deve quebrar o fluxo principal.
export async function logAuditEvent(data, { req } = {}) {
  try {
    if (!data?.eventType) {
      console.warn('[auditService] evento sem eventType — ignorado');
      return null;
    }
    if (!data?.title) {
      console.warn(`[auditService] evento ${data.eventType} sem title — ignorado`);
      return null;
    }
    const responsible = data.userId
      ? { userId: data.userId, responsibleName: data.responsibleName, responsibleRole: data.responsibleRole }
      : extractResponsible(req);

    return await createAuditEventQuery({
      ...data,
      ...responsible,
      metadata: sanitizeMetadata(data.metadata),
    });
  } catch (err) {
    console.error('[auditService] Falha ao registrar evento:', err.message);
    return null;
  }
}

function toDto(row) {
  if (!row) return null;
  return {
    id:               row.id,
    eventType:        row.event_type,
    entityType:       row.entity_type,
    entityId:         row.entity_id,
    orderId:          row.order_id,
    orderItemId:      row.order_item_id,
    davNumber:        row.dav_number,
    clientName:       row.client_name,
    userId:           row.user_id,
    responsibleName:  row.responsible_name,
    responsibleRole:  row.responsible_role,
    status:           row.status,
    title:            row.title,
    description:      row.description,
    evidenceType:     row.evidence_type,
    evidenceUrl:      row.evidence_url,
    metadata:         row.metadata ?? {},
    createdAt:        row.created_at,
  };
}

export async function listAuditEventsPage(filters = {}) {
  const [items, total] = await Promise.all([
    listAuditEvents(filters),
    countAuditEvents(filters),
  ]);
  const page  = Math.max(1, parseInt(filters.page  ?? 1, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(filters.limit ?? 20, 10) || 20));
  return {
    items: items.map(toDto),
    total,
    page,
    limit,
  };
}

export async function getAuditEvent(id) {
  return toDto(await findAuditEventById(id));
}

export async function getAuditSummary() {
  const row = await getAuditSummaryQuery();
  return {
    completedOrders:        row.completed_orders        ?? 0,
    ordersWithObservation:  row.orders_with_observation ?? 0,
    registeredPhotos:       row.registered_photos       ?? 0,
    adminActions:           row.admin_actions           ?? 0,
    totalEvents:            row.total_events            ?? 0,
    pendingEvents:          row.pending_events          ?? 0,
  };
}
