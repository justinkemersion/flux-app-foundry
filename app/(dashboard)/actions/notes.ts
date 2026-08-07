"use server";

import { z } from "zod";
import { requireSessionSub } from "@/lib/flux/auth";
import { createNote, updateNote } from "@/lib/flux/notes";
import { logActivity } from "@/lib/flux/activity";
import { actionError, type ActionResult } from "@/lib/actions/result";
import type { NoteRow } from "@/lib/flux/types";

const noteSchema = z.object({
  body: z.string().min(1).max(50000),
  record_id: z.string().uuid().optional(),
});

const idSchema = z.string().uuid();

export async function createNoteAction(
  input: z.infer<typeof noteSchema>,
): Promise<ActionResult<NoteRow>> {
  try {
    const sub = await requireSessionSub();
    const parsed = noteSchema.parse(input);
    const row = await createNote(sub, parsed);
    await logActivity(sub, {
      entity_type: "note",
      entity_id: row.id,
      action: "created",
    });
    return { ok: true, data: row };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateNoteAction(
  id: string,
  body: string,
): Promise<ActionResult<NoteRow>> {
  try {
    const sub = await requireSessionSub();
    const noteId = idSchema.parse(id);
    const parsed = noteSchema.parse({ body });
    const row = await updateNote(sub, noteId, parsed.body);
    await logActivity(sub, {
      entity_type: "note",
      entity_id: row.id,
      action: "updated",
    });
    return { ok: true, data: row };
  } catch (e) {
    return actionError(e);
  }
}
