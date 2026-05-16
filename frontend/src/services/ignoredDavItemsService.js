import { api } from './api.js';

function extractError(res, body, fallback) {
  if (res.status === 401) return 'Sessão expirada. Faça login novamente.';
  if (res.status === 403) return 'Sem permissão para esta ação.';
  return body?.message || fallback;
}

export async function listIgnoredDavItems({ includeInactive = false } = {}) {
  const query = includeInactive ? '?includeInactive=true' : '';
  const res = await api.get(`/ignored-dav-items${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao listar regras'));
  return data;
}

// As mutações de regra agora devolvem { rule, reapplySummary } — o backend
// reaplica regras a todos os itens DAV/pedidos existentes após cada mutação.
// O caller pode mostrar o resumo ao ADMIN e recarregar as listas afetadas.
export async function createIgnoredDavItem({
  rawDescription,
  manufacturerName,
  matchType,
  reason,
}) {
  const res = await api.post('/ignored-dav-items', {
    rawDescription,
    manufacturerName,
    matchType,
    reason,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao criar regra'));
  return data;
}

export async function updateIgnoredDavItem(id, {
  rawDescription,
  manufacturerName,
  matchType,
  reason,
}) {
  const res = await api.put(`/ignored-dav-items/${id}`, {
    rawDescription,
    manufacturerName,
    matchType,
    reason,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao editar regra'));
  return data;
}

export async function setIgnoredDavItemActive(id, active) {
  const res = await api.patch(`/ignored-dav-items/${id}/status`, { active });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao alterar status da regra'));
  return data;
}

export async function deleteIgnoredDavItem(id) {
  const res = await api.delete(`/ignored-dav-items/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao apagar regra'));
  return data;
}

// Formata o resumo retornado por uma mutação para exibir como feedback.
// summary: { evaluated, hidden, unhidden, keptHidden, keptVisible, preservedManual }
export function formatReapplySummary(summary) {
  if (!summary) return null;
  if (summary.error) {
    return `Atenção: reaplicação automática falhou (${summary.error}). Estado pode estar inconsistente.`;
  }
  return `Regras reaplicadas: ${summary.evaluated} itens avaliados, ${summary.hidden} ocultados, ${summary.unhidden} desocultados.`;
}
