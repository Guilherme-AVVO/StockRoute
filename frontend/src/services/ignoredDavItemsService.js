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
