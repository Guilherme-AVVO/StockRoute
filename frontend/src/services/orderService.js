import { api } from './api.js';

function extractError(res, body, fallback) {
  if (res.status === 401) return 'Sessão expirada. Faça login novamente.';
  if (res.status === 403) return 'Sem permissão para esta ação.';
  return body?.message || fallback;
}

export async function importDav(file) {
  const form = new FormData();
  form.append('pdf', file);

  const token = sessionStorage.getItem('stockroute_token');
  const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao importar DAV'));
  return data;
}

export async function listOrders({ status, search } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString() ? `?${params}` : '';

  const res = await api.get(`/orders${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao listar pedidos'));
  return data;
}

export async function getOrder(id, { includeHidden = false } = {}) {
  const query = includeHidden ? '?includeHidden=true' : '';
  const res = await api.get(`/orders/${id}${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Pedido não encontrado'));
  return data;
}

export async function publishOrder(id) {
  const res = await api.put(`/orders/${id}/publish`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao publicar pedido'));
  return data;
}

// ADMIN registra que um item antes faltante foi encontrado/recebido.
// photoFile é obrigatório no backend; o multipart é montado aqui.
export async function resolveMissingItem(orderId, itemId, photoFile) {
  const form = new FormData();
  form.append('photoFile', photoFile);

  const token = sessionStorage.getItem('stockroute_token');
  const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/${orderId}/items/${itemId}/resolve-missing`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao resolver item faltante'));
  return data;
}

// ADMIN autoriza enviar o pedido OBSERVATION mesmo com itens MISSING.
// Pedido vira COMPLETED; itens MISSING continuam como tal (histórico).
export async function shipOrderWithMissing(orderId, { notes } = {}) {
  const res = await api.post(`/orders/${orderId}/ship-with-missing`, { notes });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao enviar pedido com pendência'));
  return data;
}
