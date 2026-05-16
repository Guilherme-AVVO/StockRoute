// Service frontend para Histórico/Auditoria.
import { api } from './api.js';

function extractError(res, body, fallback) {
  if (res.status === 401) return 'Sessão expirada. Faça login novamente.';
  if (res.status === 403) return 'Sem permissão para esta ação.';
  return body?.message || fallback;
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, value instanceof Date ? value.toISOString() : String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function listAuditEvents(filters = {}) {
  const res = await api.get(`/audit-events${buildQuery(filters)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao listar eventos'));
  return data;
}

export async function getAuditSummary() {
  const res = await api.get('/audit-events/summary');
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao carregar resumo'));
  return data;
}

export async function getAuditEvent(id) {
  const res = await api.get(`/audit-events/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao carregar evento'));
  return data;
}

// Labels amigáveis para tipos de evento — preenchem o chip de filtro e a
// coluna "Evento" na tabela. Tipos desconhecidos caem no fallback.
export const EVENT_TYPE_LABELS = {
  DAV_UPLOADED:                 'Upload DAV',
  DAV_IMPORTED:                 'DAV importado',
  ORDER_CREATED:                'Pedido criado',
  ORDER_REVIEW_STARTED:         'Revisão iniciada',
  ORDER_PUBLISHED:              'Pedido publicado',
  ORDER_STATUS_CHANGED:         'Status alterado',
  PRODUCT_CREATED:              'Produto cadastrado',
  PRODUCT_UPDATED:              'Produto atualizado',
  PRODUCT_DELETED:              'Produto excluído',
  UNLINKED_ITEM_CREATED:        'Item DAV não vinculado',
  UNLINKED_ITEM_LINKED:         'Item DAV vinculado',
  PRODUCT_CREATED_FROM_UNLINKED:'Produto a partir de DAV',
  HIDE_RULE_CREATED:            'Regra criada',
  HIDE_RULE_UPDATED:            'Regra atualizada',
  HIDE_RULE_DELETED:            'Regra apagada',
  HIDE_RULE_STATUS_CHANGED:     'Regra ativada/desativada',
  ITEM_HIDDEN_BY_RULE:          'Item ocultado por regra',
  ITEM_HIDDEN_MANUALLY:         'Item ocultado manualmente',
  ITEM_UNHIDDEN:                'Item desocultado',
  PICKING_STARTED:              'Separação iniciada',
  PICKING_ITEM_COLLECTED:       'Item coletado',
  PICKING_ITEM_NOT_FOUND:       'Item não encontrado',
  PICKING_FINISHED:             'Separação concluída',
  USER_CREATED:                 'Usuário criado',
  USER_UPDATED:                 'Usuário atualizado',
  USER_STATUS_CHANGED:          'Status de usuário',
  SETTINGS_UPDATED:             'Configuração salva',
};

export function labelForEventType(type) {
  return EVENT_TYPE_LABELS[type] ?? type ?? 'Evento';
}

// Derivação visual: ação de coluna depende do tipo/status do evento.
// Mantemos a regra no frontend porque é só apresentação — a entidade real
// está no banco e cada label aponta para uma rota/aba existente.
export function deriveAction(event) {
  if (event?.status === 'Observação' || event?.status === 'Pendente') return 'Resolver';
  switch (event?.eventType) {
    case 'HIDE_RULE_CREATED':
    case 'HIDE_RULE_UPDATED':
    case 'HIDE_RULE_DELETED':
    case 'HIDE_RULE_STATUS_CHANGED':
    case 'ITEM_HIDDEN_BY_RULE':
      return 'Ver regra';
    case 'PRODUCT_CREATED':
    case 'PRODUCT_UPDATED':
    case 'PRODUCT_CREATED_FROM_UNLINKED':
      return 'Ver produto';
    default:
      return 'Ver detalhes';
  }
}
