// Service frontend para itens DAV sem vínculo de produto.
import { api } from './api.js';

function extractError(res, body, fallback) {
  if (res.status === 401) return 'Sessão expirada. Faça login novamente.';
  if (res.status === 403) return 'Sem permissão para esta ação.';
  return body?.message || fallback;
}

// Lista itens não vinculados pendentes (status=PENDING por padrão).
export async function listUnlinkedDavItems({ status } = {}) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await api.get(`/unlinked-dav-items${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao listar itens não vinculados'));
  return data;
}

// --- Endpoints de grupos --------------------------------------------------

// Lista grupos de itens não vinculados (itens iguais em pedidos diferentes
// agrupados sob uma única entrada).
export async function listUnlinkedDavItemGroups() {
  const res = await api.get('/unlinked-dav-items/groups');
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao listar grupos não vinculados'));
  return data;
}

// Cadastra produto a partir de um grupo: cria produto + vincula todos
// os itens iguais em todos os pedidos.
export async function registerProductFromGroup({ groupKey, sku, name, unit, imageUrl, manufacturerReference, manufacturerName }) {
  const res = await api.post('/unlinked-dav-items/groups/register', {
    groupKey, sku, name, unit, imageUrl, manufacturerReference, manufacturerName,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(extractError(res, data, 'Erro ao cadastrar produto'));
    if (data?.existingProductId) err.existingProductId = data.existingProductId;
    throw err;
  }
  return data;
}

// Vincula todos os itens de um grupo a um produto já existente no catálogo.
export async function linkGroupToProduct({ groupKey, productId }) {
  const res = await api.post('/unlinked-dav-items/groups/link', { groupKey, productId });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao vincular grupo'));
  return data;
}

// Oculta o grupo inteiro: cria regra e marca todos os itens como HIDDEN.
export async function hideUnlinkedGroup({ groupKey, reason }) {
  const res = await api.post('/unlinked-dav-items/groups/hide', { groupKey, reason });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao ocultar grupo'));
  return data;
}
