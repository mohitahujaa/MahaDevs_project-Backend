// src/services/hashService.js
import crypto from 'crypto';

// Generate SHA-256 from actual frontend input (id, trip_start, trip_end)
// Returns lowercase 64-hex string (no 0x prefix)
export function generateDTIDFromInput({ id, trip_start, trip_end }, salt = '') {
  const idPart = id ?? '';
  const startPart = trip_start ?? '';
  const endPart = trip_end ?? '';
  const payload = `${idPart}|${startPart}|${endPart}|${salt}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
