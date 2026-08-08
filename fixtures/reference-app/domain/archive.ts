/**
 * Archive / unarchive lifecycle for the compatibility canary.
 * Matches records.status check constraint + archived_at stamping in actions.
 */

export type RecordStatus = "draft" | "active" | "archived";

export type Archiveable = {
  status: RecordStatus;
  archived_at: string | null;
};

export function archiveRecord(
  row: Archiveable,
  at: string = new Date().toISOString(),
): Archiveable {
  void row;
  return { status: "archived", archived_at: at };
}

/** Unarchive returns to active and clears archived_at (via update, not a dedicated action). */
export function unarchiveRecord(row: Archiveable): Archiveable {
  void row;
  return { status: "active", archived_at: null };
}

export function isArchived(row: Archiveable): boolean {
  return row.status === "archived";
}
