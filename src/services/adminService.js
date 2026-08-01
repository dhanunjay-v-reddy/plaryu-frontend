import api from './api';

export async function listUsers() {
  const response = await api.get('/admin/users');
  return response.data;
}

export async function verifyUser(userId) {
  const response = await api.post(`/admin/verify/${userId}`);
  return response.data;
}

export async function unverifyUser(userId) {
  const response = await api.post(`/admin/unverify/${userId}`);
  return response.data;
}

export async function seedDemoData(count) {
  const query = count ? `?count=${count}` : '';
  const response = await api.post(`/admin/seed-demo-data${query}`);
  return response.data;
}
