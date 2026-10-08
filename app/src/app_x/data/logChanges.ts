const logFields = new Set(["user_id", "concert_id", "notes", "supporting_artist_ids", "removed", "ticket_status", "seen_set_ids"]);

// Inspect raw data so fields added by a newer schema cannot be discarded.
export function isDefaultLog(data: Record<string, unknown>): boolean {
  return Object.keys(data).every((key) => logFields.has(key))
    && (data.notes === undefined || data.notes === "")
    && (data.removed === undefined || data.removed === false)
    && (data.ticket_status === undefined || data.ticket_status === "")
    && (data.seen_set_ids === undefined || (Array.isArray(data.seen_set_ids) && data.seen_set_ids.length === 0))
    && (data.supporting_artist_ids === undefined
      || (Array.isArray(data.supporting_artist_ids) && data.supporting_artist_ids.length === 0));
}
