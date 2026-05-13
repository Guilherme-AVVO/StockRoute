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

// Vincula item DAV a um produto existente do catálogo.
export async function linkUnlinkedItemToProduct(itemId, productId) {
  const res = await api.patch(`/unlinked-dav-items/${itemId}/link-product`, { productId });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao vincular item ao produto'));
  return data;
}

// Cria novo produto a partir do item DAV.
export async function createProductFromUnlinkedItem(itemId, { sku, name, unit, imageUrl, manufacturerReference, manufacturerName }) {
  const res = await api.post(`/unlinked-dav-items/${itemId}/create-product`, {
    sku, name, unit, imageUrl, manufacturerReference, manufacturerName,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(extractError(res, data, 'Erro ao cadastrar produto'));
    if (data?.existingProductId) err.existingProductId = data.existingProductId;
    throw err;
  }
  return data;
}

// Oculta item não vinculado — cria regra em ignored_dav_items.
export async function hideUnlinkedItem(itemId, reason) {
  const res = await api.post(`/unlinked-dav-items/${itemId}/hide`, { reason });
  const data = await res.json();
  if (!res.ok) throw new Error(extractError(res, data, 'Erro ao ocultar item'));
  return data;
}
