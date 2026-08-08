/**
 * Seed demo data for DEMO_USER_SUB (OAuth provider account id).
 * Requires FLUX_URL, FLUX_GATEWAY_JWT_SECRET, DEMO_USER_SUB in env.
 */
import { createNote } from "../lib/flux/notes";
import { createRecord, addTag } from "../lib/flux/records";
import { logActivity } from "../lib/flux/activity";
import { upsertProfile } from "../lib/flux/profiles";
import { loadEnvFiles } from "./lib/load-env";

loadEnvFiles(process.cwd());

async function main() {
  const sub = process.env.DEMO_USER_SUB?.trim();
  if (!sub) {
    console.error("Set DEMO_USER_SUB to your OAuth provider account id");
    process.exit(1);
  }
  if (!process.env.FLUX_URL?.trim()) {
    console.error("Set FLUX_URL (see .env.example / docs/FLUX_WORKFLOW.md)");
    process.exit(1);
  }
  if (!process.env.FLUX_GATEWAY_JWT_SECRET?.trim()) {
    console.error("Set FLUX_GATEWAY_JWT_SECRET");
    process.exit(1);
  }

  await upsertProfile(sub, { display_name: "Demo User" });

  const r1 = await createRecord(sub, {
    title: "Onboarding checklist",
    description: "First generic record",
    status: "active",
  });
  await createRecord(sub, {
    title: "Archive me later",
    description: "Draft record for workflow demo",
    status: "draft",
  });

  await addTag(sub, r1.id, "ops");
  await addTag(sub, r1.id, "demo");

  await createNote(sub, {
    record_id: r1.id,
    body: "## Welcome\n\nMarkdown notes work here.",
  });

  await logActivity(sub, {
    entity_type: "seed",
    entity_id: "demo",
    action: "seeded",
    metadata: { records: 2 },
  });

  console.log("Seeded demo data for", sub);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
