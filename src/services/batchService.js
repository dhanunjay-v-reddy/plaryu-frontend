import api from './api';

export async function mintBatch(manufacturerId, { materialType, weightKg }) {
  const response = await api.post(`/batches/mint?manufacturerId=${manufacturerId}`, {
    materialType,
    weightKg,
  });
  return response.data;
}

export async function transferBatch({ batchId, toUserId }) {
  const response = await api.post('/batches/transfer', { batchId, toUserId });
  return response.data;
}

export async function getAllBatches() {
  const response = await api.get('/batches');
  return response.data;
}

export async function verifyBatch(batchId) {
  const response = await api.get(`/batches/${batchId}/verify`);
  return response.data;
}

export async function getBatchHistory(batchId) {
  const response = await api.get(`/batches/${batchId}/history`);
  return response.data;
}

export async function getGlobalLedger() {
  const response = await api.get('/batches/ledger');
  return response.data;
}
