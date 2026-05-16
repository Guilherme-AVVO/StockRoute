import { api } from './api.js';

async function parseResponse(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || 'Não foi possível concluir a operação.');
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function listUsers() {
  const response = await api.get('/users');
  return parseResponse(response);
}

export async function getUser(id) {
  const response = await api.get(`/users/${id}`);
  return parseResponse(response);
}

export async function createUser(payload) {
  const response = await api.post('/users', payload);
  return parseResponse(response);
}

export async function updateUser(id, payload) {
  const response = await api.put(`/users/${id}`, payload);
  return parseResponse(response);
}

export async function setUserStatus(id, isActive) {
  const response = await api.patch(`/users/${id}/status`, { isActive });
  return parseResponse(response);
}
