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

export async function getOrder(id) {
  const res = await api.get(`/orders/${id}`);
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
