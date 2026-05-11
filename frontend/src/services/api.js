const BASE_URL = import.meta.env.VITE_API_URL;

// Pega o token salvo na sessão do navegador; ele nunca é exibido na interface.
function getToken() {
  return sessionStorage.getItem('stockroute_token');
}

async function request(path, options = {}) {
  const token = getToken();

  // Todas as chamadas usam JSON e, quando existir sessão, enviam o Bearer token.
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Retorna o response para quem chamou lidar com status e body
  return response;
}

export const api = {
  get:    (path)       => request(path, { method: 'GET' }),
  post:   (path, body) => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)       => request(path, { method: 'DELETE' }),
};
