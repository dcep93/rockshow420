import type { LogPatch } from '../../data/tableActions';
export async function saveLog(uid: string, concertId: string, patch: LogPatch) {
  window.dispatchEvent(new CustomEvent('fixture-save', { detail: { uid, concertId, patch } }));
}
