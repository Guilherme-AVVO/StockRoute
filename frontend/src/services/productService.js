import { api } from './api.js';

// Lê a mensagem de erro do corpo JSON da resposta, ou usa o fallback.
async function extractError(response, fallback) {
  let message = fallback;
  try {
    const data = await response.json();
    if (data.message) message = data.message;
  } catch {
    // corpo não é JSON válido; usa fallback
  }
  throw new Error(message);
}

export async function listProducts(search = '') {
  const path = search
    ? `/products?search=${encodeURIComponent(search)}`
    : '/products';

  let response;
  try {
    response = await api.get(path);
  } catch {
    throw new Error('Erro de rede. Verifique sua conexão.');
  }

  if (response.status === 401) throw new Error('Sessão expirada. Faça login novamente.');
  if (response.status === 403) throw new Error('Você não tem permissão para gerenciar produtos.');
  if (!response.ok) await extractError(response, 'Erro ao listar produtos.');
  return response.json();
}

export async function createProduct(data) {
  let response;
  try {
    response = await api.post('/products', {
      sku:                   data.sku,
      name:                  data.name,
      unit:                  data.unit,
      imageUrl:              data.imageUrl || null,
      manufacturerReference: data.manufacturerReference || null,
      manufacturerName:      data.manufacturerName || null,
    });
  } catch {
    throw new Error('Erro de rede. Verifique sua conexão.');
  }

  if (response.status === 401) throw new Error('Sessão expirada. Faça login novamente.');
  if (response.status === 403) throw new Error('Você não tem permissão para gerenciar produtos.');
  if (response.status === 409) await extractError(response, 'SKU já cadastrado.');
  if (!response.ok) await extractError(response, 'Erro ao criar produto.');
  return response.json();
}

export async function updateProduct(id, data) {
  let response;
  try {
    response = await api.put(`/products/${id}`, {
      sku:                   data.sku,
      name:                  data.name,
      unit:                  data.unit,
      imageUrl:              data.imageUrl || null,
      manufacturerReference: data.manufacturerReference || null,
      manufacturerName:      data.manufacturerName || null,
    });
  } catch {
    throw new Error('Erro de rede. Verifique sua conexão.');
  }

  if (response.status === 401) throw new Error('Sessão expirada. Faça login novamente.');
  if (response.status === 403) throw new Error('Você não tem permissão para gerenciar produtos.');
  if (response.status === 404) throw new Error('Produto não encontrado.');
  if (response.status === 409) await extractError(response, 'SKU já cadastrado.');
  if (!response.ok) await extractError(response, 'Erro ao atualizar produto.');
  return response.json();
}

export async function deleteProduct(id) {
  let response;
  try {
    response = await api.delete(`/products/${id}`);
  } catch {
    throw new Error('Erro de rede. Verifique sua conexão.');
  }

  if (response.status === 401) throw new Error('Sessão expirada. Faça login novamente.');
  if (response.status === 403) throw new Error('Você não tem permissão para gerenciar produtos.');
  if (response.status === 404) throw new Error('Produto não encontrado.');
  if (response.status === 409) await extractError(response, 'Produto possui histórico e não pode ser excluído.');
  if (!response.ok) await extractError(response, 'Erro ao excluir produto.');
  return response.json();
}
