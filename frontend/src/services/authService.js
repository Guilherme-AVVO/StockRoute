import { api } from './api.js';

const TOKEN_KEY = 'stockroute_token';
const USER_KEY = 'stockroute_user';

export async function login(email, password) {
  let response;
  try {
    // O backend espera exatamente email/password no corpo do POST /auth/login.
    response = await api.post('/auth/login', { email, password });
  } catch {
    // fetch lança erro apenas quando não consegue conectar (rede, backend desligado)
    throw new Error('network');
  }

  if (response.status === 429) {
    throw new Error('rate_limit');
  }
  if (response.status === 401) {
    throw new Error('invalid_credentials');
  }
  if (response.status === 403) {
    throw new Error('inactive_user');
  }
  if (!response.ok) {
    throw new Error('unexpected');
  }

  const data = await response.json();

  // Salva token e usuário — sem senha, sem hash
  sessionStorage.setItem(TOKEN_KEY, data.token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data;
}

export async function getMe() {
  let response;
  try {
    // Confirma com o backend se o token salvo ainda é válido.
    response = await api.get('/auth/me');
  } catch {
    throw new Error('network');
  }

  if (response.status === 401) {
    throw new Error('unauthorized');
  }
  if (!response.ok) {
    throw new Error('unexpected');
  }

  return response.json();
}

// Remove qualquer dado local da sessão sem chamar o backend.
export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getSavedUser() {
  const raw = sessionStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getSavedToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
