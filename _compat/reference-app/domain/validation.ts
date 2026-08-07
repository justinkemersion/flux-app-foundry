/**
 * Representative validation schemas for the reference app canary.
 * Kept in sync with dashboard action Zod shapes (title/status/tag/note).
 */
import { z } from "zod";

export const recordInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export const tagInputSchema = z.object({
  tag: z.string().min(1).max(50),
});

export const noteInputSchema = z.object({
  body: z.string().min(1).max(50000),
  record_id: z.string().uuid().optional(),
});

export const idSchema = z.string().uuid();
