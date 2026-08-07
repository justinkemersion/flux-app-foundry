import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/flux/auth";
import { FluxHttpError } from "@/lib/flux/client";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Map thrown errors to safe client-facing messages (no Flux/body leakage). */
export function actionError(error: unknown): ActionResult<never> {
  if (error instanceof UnauthorizedError) {
    return { ok: false, error: "Unauthorized" };
  }
  if (error instanceof ZodError) {
    const first = error.issues[0]?.message;
    return { ok: false, error: first ?? "Invalid input" };
  }
  if (error instanceof FluxHttpError) {
    console.error(`[action] Flux ${error.status}:`, error.message);
    return { ok: false, error: "Request failed. Please try again." };
  }
  if (error instanceof Error) {
    console.error("[action]", error.message);
  } else {
    console.error("[action]", error);
  }
  return { ok: false, error: "Something went wrong" };
}
