"use server";

import { z } from "zod";
import { requireSessionSub } from "@/lib/flux/auth";
import {
  addTag,
  createRecord,
  removeTag,
  updateRecord,
} from "@/lib/flux/records";
import { logActivity } from "@/lib/flux/activity";
import { actionError, type ActionResult } from "@/lib/actions/result";
import type { RecordRow, RecordTagRow } from "@/lib/flux/types";

const recordSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

const idSchema = z.string().uuid();

export async function createRecordAction(
  input: z.infer<typeof recordSchema>,
): Promise<ActionResult<RecordRow>> {
  try {
    const sub = await requireSessionSub();
    const parsed = recordSchema.parse(input);
    const row = await createRecord(sub, parsed);
    await logActivity(sub, {
      entity_type: "record",
      entity_id: row.id,
      action: "created",
      metadata: { title: row.title },
    });
    return { ok: true, data: row };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateRecordAction(
  id: string,
  input: z.infer<typeof recordSchema>,
): Promise<ActionResult<RecordRow>> {
  try {
    const sub = await requireSessionSub();
    const recordId = idSchema.parse(id);
    const parsed = recordSchema.parse(input);
    const patch =
      parsed.status === "archived"
        ? { ...parsed, archived_at: new Date().toISOString() }
        : parsed;
    const row = await updateRecord(sub, recordId, patch);
    await logActivity(sub, {
      entity_type: "record",
      entity_id: row.id,
      action: "updated",
    });
    return { ok: true, data: row };
  } catch (e) {
    return actionError(e);
  }
}

export async function archiveRecordAction(id: string): Promise<ActionResult<RecordRow>> {
  try {
    const sub = await requireSessionSub();
    const recordId = idSchema.parse(id);
    const row = await updateRecord(sub, recordId, {
      status: "archived",
      archived_at: new Date().toISOString(),
    });
    await logActivity(sub, {
      entity_type: "record",
      entity_id: row.id,
      action: "archived",
    });
    return { ok: true, data: row };
  } catch (e) {
    return actionError(e);
  }
}

const tagSchema = z.object({ tag: z.string().min(1).max(50) });

export async function addTagAction(
  recordId: string,
  input: z.infer<typeof tagSchema>,
): Promise<ActionResult<RecordTagRow>> {
  try {
    const sub = await requireSessionSub();
    const parentId = idSchema.parse(recordId);
    const { tag } = tagSchema.parse(input);
    const row = await addTag(sub, parentId, tag);
    await logActivity(sub, {
      entity_type: "record_tag",
      entity_id: row.id,
      action: "tagged",
      metadata: { tag },
    });
    return { ok: true, data: row };
  } catch (e) {
    return actionError(e);
  }
}

export async function removeTagAction(tagId: string): Promise<ActionResult> {
  try {
    const sub = await requireSessionSub();
    const id = idSchema.parse(tagId);
    await removeTag(sub, id);
    await logActivity(sub, {
      entity_type: "record_tag",
      entity_id: id,
      action: "untagged",
    });
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
