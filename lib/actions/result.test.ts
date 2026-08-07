import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/flux/auth";
import { FluxHttpError } from "@/lib/flux/client";
import { actionError } from "./result";

describe("actionError", () => {
  it("returns Unauthorized for UnauthorizedError", () => {
    expect(actionError(new UnauthorizedError())).toEqual({
      ok: false,
      error: "Unauthorized",
    });
  });

  it("returns first Zod issue message", () => {
    const err = new ZodError([
      {
        code: "custom",
        path: ["title"],
        message: "Title is required",
      },
    ]);
    expect(actionError(err)).toEqual({ ok: false, error: "Title is required" });
  });

  it("does not leak FluxHttpError body to the client", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = actionError(
      new FluxHttpError('Flux 403 /records: {"message":"secret"}', 403, "secret"),
    );
    expect(result).toEqual({ ok: false, error: "Request failed. Please try again." });
    expect(JSON.stringify(result)).not.toContain("secret");
    spy.mockRestore();
  });

  it("hides generic Error messages", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(actionError(new Error("internal detail"))).toEqual({
      ok: false,
      error: "Something went wrong",
    });
    spy.mockRestore();
  });
});
