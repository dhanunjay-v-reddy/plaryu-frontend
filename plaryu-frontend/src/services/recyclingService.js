import api from './api';

export async function closeRecyclingLoop(recyclerId, { batchId, weightProcessedKg, proofPhotoHash, latitude, longitude }) {
  const response = await api.post(`/recycling/close?recyclerId=${recyclerId}`, {
    batchId,
    weightProcessedKg,
    proofPhotoHash,
    latitude,
    longitude,
  });
  return response.data;
}

export async function getAllRecyclingRecords() {
  const response = await api.get('/recycling');
  return response.data;
}
