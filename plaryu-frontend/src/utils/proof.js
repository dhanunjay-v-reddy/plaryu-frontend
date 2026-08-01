// Computes a SHA-256 hash of a File in-browser (no upload needed for this to
// work) using the native SubtleCrypto API. The hash is what actually gets
// sent to the backend and folded into the certificate's hash — binding the
// photo evidence to the ledger without needing file storage infrastructure.
export async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Wraps the browser geolocation API in a promise; resolves to null if the
// user denies permission or it's unavailable, rather than throwing.
export function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}
