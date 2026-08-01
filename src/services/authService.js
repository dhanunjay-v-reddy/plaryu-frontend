import api from './api';

export async function register({ name, email, password, role, orgName }) {
  const response = await api.post('/auth/register', { name, email, password, role, orgName });
  return response.data; // { token, userId, name, email, role }
}

export async function login({ email, password }) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}
