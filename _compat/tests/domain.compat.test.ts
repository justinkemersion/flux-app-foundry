import { describe, expect, it } from "vitest";
import { requireSessionSub, isAuthenticated } from "../reference-app/domain/session";
import {
  archiveRecord,
  unarchiveRecord,
  isArchived,
} from "../reference-app/domain/archive";
import {
  createRecordMutation,
  archiveMutation,
  unarchiveMutation,
} from "../reference-app/domain/actions";
import {
  recordInputSchema,
  tagInputSchema,
  noteInputSchema,
  idSchema,
} from "../reference-app/domain/validation";
import {
  PUBLIC_ROUTES,
  requiresSession,
  routeAccess,
} from "../reference-app/domain/public-routes";
import { UnauthorizedError } from "@/lib/flux/errors";

describe("compat domain: session boundary", () => {
  it("fail-closed without session", () => {
    expect(() => requireSessionSub(null)).toThrow(UnauthorizedError);
    expect(isAuthenticated(null)).toBe(false);
  });

  it("returns sub when authenticated", () => {
    expect(requireSessionSub({ user: { id: "sub-1" } })).toBe("sub-1");
  });
});

describe("compat domain: archive lifecycle", () => {
  it("archive stamps status and archived_at; unarchive clears", () => {
    const archived = archiveRecord(
      { status: "active", archived_at: null },
      "2026-08-07T00:00:00.000Z",
    );
    expect(isArchived(archived)).toBe(true);
    expect(archived.archived_at).toBe("2026-08-07T00:00:00.000Z");
    const live = unarchiveRecord(archived);
    expect(live).toEqual({ status: "active", archived_at: null });
  });
});

describe("compat domain: protected mutations + validation", () => {
  it("rejects unauthenticated create", async () => {
    const result = await createRecordMutation(null, { title: "x" });
    expect(result).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("rejects invalid title", async () => {
    const result = await createRecordMutation(
      { user: { id: "u1" } },
      { title: "" },
    );
    expect(result.ok).toBe(false);
  });

  it("creates when session + validation pass", async () => {
    const result = await createRecordMutation(
      { user: { id: "u1" } },
      { title: "Note" },
    );
    expect(result).toEqual({
      ok: true,
      data: { title: "Note", user_id: "u1" },
    });
  });

  it("archive/unarchive mutations require session", async () => {
    const row = { status: "active" as const, archived_at: null };
    expect(await archiveMutation(null, row)).toEqual({
      ok: false,
      error: "Unauthorized",
    });
    const archived = await archiveMutation({ user: { id: "u1" } }, row);
    expect(archived.ok).toBe(true);
    if (archived.ok) {
      const restored = await unarchiveMutation({ user: { id: "u1" } }, archived.data!);
      expect(restored).toEqual({
        ok: true,
        data: { status: "active", archived_at: null },
      });
    }
  });

  it("validation schemas match baseline shapes", () => {
    expect(recordInputSchema.parse({ title: "ok" }).title).toBe("ok");
    expect(tagInputSchema.parse({ tag: "alpha" }).tag).toBe("alpha");
    expect(
      noteInputSchema.parse({
        body: "hi",
        record_id: "11111111-1111-4111-8111-111111111111",
      }).body,
    ).toBe("hi");
    expect(() => idSchema.parse("not-a-uuid")).toThrow();
  });
});

describe("compat domain: public vs private", () => {
  it("only marketing and login are public", () => {
    expect(PUBLIC_ROUTES).toEqual(["/", "/login"]);
    expect(routeAccess("/")).toBe("public");
    expect(routeAccess("/login")).toBe("public");
    expect(requiresSession("/records")).toBe(true);
    expect(requiresSession("/notes")).toBe(true);
  });
});
