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

export async function createIgnoredDavItem({ rawSku, rawDescription, reason }) {
  const res = await api.post('/ignored-dav-items', { rawSku, rawDescription, reason });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao criar regra'));
  return data;
}

export async function deactivateIgnoredDavItem(id) {
  const res = await api.delete(`/ignored-dav-items/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao desativar regra'));
  return data;
}
