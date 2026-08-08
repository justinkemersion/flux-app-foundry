/**
 * Tenant + parent-ownership predicates used by the compatibility canary.
 * Encodes the same rules as RLS jwt.sub = user_id and 0006 parent checks.
 */

export type OwnedRow = { user_id: string };
export type ChildRow = OwnedRow & { record_id: string | null };
export type ParentRecord = OwnedRow & { id: string };

/** Tenant isolation: row belongs to the JWT subject. */
export function ownsRow(sub: string, row: OwnedRow): boolean {
  return row.user_id === sub;
}

/**
 * Child attach/read allowed only when the caller owns the child row AND
 * (when record_id is set) owns the parent record. Rejects cross-tenant attach.
 */
export function canAccessChild(
  sub: string,
  child: ChildRow,
  parent: ParentRecord | null,
): boolean {
  if (!ownsRow(sub, child)) return false;
  if (child.record_id == null) return true;
  if (!parent) return false;
  if (parent.id !== child.record_id) return false;
  return ownsRow(sub, parent);
}

/** Negative case helper: attaching a child to another tenant's parent. */
export function wouldCrossTenantAttach(
  sub: string,
  parent: ParentRecord,
): boolean {
  return parent.user_id !== sub;
}
