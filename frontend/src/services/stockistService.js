// ============================================================
// Service do fluxo do estoquista (picking).
//
// Usa fetch nativo + token Bearer (mesmo padrão de api.js).
// Não usa Axios. Para upload de foto, monta FormData manualmente —
// nunca seta Content-Type quando enviando multipart.
// ============================================================

const BASE_URL  = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'stockroute_token';

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

// Centraliza tratamento de erro com mensagem amigável.
// Lança Error padrão com .status e .data anexados para o caller decidir UI.
async function handleResponse(response) {
  let body = null;
  try { body = await response.json(); } catch { /* corpo vazio */ }
  if (response.ok) return body;

  const error = new Error(body?.message || `HTTP ${response.status}`);
  error.status = response.status;
  error.data   = body;
  throw error;
}

function jsonHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authOnlyHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Converte caminhos relativos (/uploads/...) em URLs absolutas usando VITE_API_URL.
// URLs já absolutas (http(s)://) são retornadas como vieram.
export function resolveAssetUrl(maybeUrl) {
  if (!maybeUrl) return null;
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  if (maybeUrl.startsWith('/')) return `${BASE_URL}${maybeUrl}`;
  return maybeUrl;
}

// 1. Lista pedidos AGUARDANDO separação (publicados e não atribuídos).
export async function listAvailableOrders() {
  const response = await fetch(`${BASE_URL}/stockist/orders`, {
    headers: authOnlyHeaders(),
  });
  return handleResponse(response);
}

// 2. Inicia a separação de um pedido.
// Pode lançar erro com status=409 e error.data.activeOrderId quando o
// estoquista já tiver outro pedido em separação.
export async function startPicking(orderId) {
  const response = await fetch(`${BASE_URL}/stockist/orders/${orderId}/start`, {
    method: 'POST',
    headers: authOnlyHeaders(),
  });
  return handleResponse(response);
}

// 3. Carrega o pedido em separação (com itens, progresso e dados do estoquista).
export async function getPickingOrder(orderId) {
  const response = await fetch(`${BASE_URL}/stockist/orders/${orderId}`, {
    headers: authOnlyHeaders(),
  });
  return handleResponse(response);
}

// 4. Coleta um item enviando a foto obrigatória (multipart/form-data).
export async function collectItem(itemId, photoFile) {
  const form = new FormData();
  form.append('photoFile', photoFile);
  // Importante: NÃO setamos Content-Type em multipart — o browser inclui o boundary.
  const response = await fetch(`${BASE_URL}/stockist/order-items/${itemId}/collect`, {
    method: 'POST',
    headers: authOnlyHeaders(),
    body: form,
  });
  return handleResponse(response);
}

// 5. Marca item como não encontrado.
// reason é obrigatório; notes é obrigatório quando reason = 'Outro'.
export async function markItemNotFound(itemId, { reason, notes }) {
  const response = await fetch(`${BASE_URL}/stockist/order-items/${itemId}/not-found`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ reason, notes }),
  });
  return handleResponse(response);
}

// 6. Finaliza o pedido. Backend calcula CONCLUIDO ou OBSERVACAO.
export async function finishPicking(orderId) {
  const response = await fetch(`${BASE_URL}/stockist/orders/${orderId}/finish`, {
    method: 'POST',
    headers: authOnlyHeaders(),
  });
  return handleResponse(response);
}

// 7. Resumo final do pedido (para a tela StockistOrderSummary).
export async function getOrderSummary(orderId) {
  const response = await fetch(`${BASE_URL}/stockist/orders/${orderId}/summary`, {
    headers: authOnlyHeaders(),
  });
  return handleResponse(response);
}

// Auxiliar: pedido EM_SEPARACAO atualmente do estoquista logado, se houver.
// Usado para retomar a tela ao reabrir o app.
export async function getMyActivePicking() {
  const response = await fetch(`${BASE_URL}/stockist/my-active`, {
    headers: authOnlyHeaders(),
  });
  return handleResponse(response);
}
