/**
 * Protected mutation pattern for the canary: session → validate → mutate.
 * Uses the same actionError sanitizer as production server actions.
 */
import { actionError, type ActionResult } from "@/lib/actions/result";
import { requireSessionSub, type SessionLike } from "./session";
import { recordInputSchema } from "./validation";
import { archiveRecord, unarchiveRecord, type Archiveable } from "./archive";
import {
  canAccessChild,
  wouldCrossTenantAttach,
  type ChildRow,
  type ParentRecord,
} from "./ownership";

export async function createRecordMutation(
  session: SessionLike,
  input: unknown,
): Promise<ActionResult<{ title: string; user_id: string }>> {
  try {
    const sub = requireSessionSub(session);
    const parsed = recordInputSchema.parse(input);
    return { ok: true, data: { title: parsed.title, user_id: sub } };
  } catch (e) {
    return actionError(e);
  }
}

export async function archiveMutation(
  session: SessionLike,
  row: Archiveable,
): Promise<ActionResult<Archiveable>> {
  try {
    requireSessionSub(session);
    return { ok: true, data: archiveRecord(row) };
  } catch (e) {
    return actionError(e);
  }
}

export async function unarchiveMutation(
  session: SessionLike,
  row: Archiveable,
): Promise<ActionResult<Archiveable>> {
  try {
    requireSessionSub(session);
    return { ok: true, data: unarchiveRecord(row) };
  } catch (e) {
    return actionError(e);
  }
}

/** Negative: refuse attaching a child to another tenant's parent. */
export function attachChildGuard(
  sub: string,
  child: ChildRow,
  parent: ParentRecord,
): ActionResult {
  if (
    wouldCrossTenantAttach(sub, parent) ||
    !canAccessChild(sub, child, parent)
  ) {
    return { ok: false, error: "Forbidden: parent ownership required" };
  }
  return { ok: true };
}
