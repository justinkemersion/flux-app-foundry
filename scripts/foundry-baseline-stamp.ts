#!/usr/bin/env tsx
/**
 * Maintainer tool: refresh fingerprints + source.commit on foundry.baseline.json.
 * Only for the Foundry template itself — forks should sync from upstream, not re-stamp.
 */
import {
  computeFingerprints,
  gitHeadCommit,
  readBaselineManifest,
  writeBaselineManifest,
} from "./lib/baseline-manifest";

const root = process.cwd();
const manifest = readBaselineManifest(root);
if (!manifest) {
  console.error("foundry.baseline.json missing — create it before stamping");
  process.exit(1);
}

const commit = gitHeadCommit(root);
if (!commit) {
  console.error("Unable to resolve git HEAD for source.commit");
  process.exit(1);
}

manifest.source.commit = commit;
manifest.fingerprints = computeFingerprints(root, manifest.fingerprintGlobs);
// Avoid self-hash churn: stamp writes fingerprints excluding the manifest file itself
delete manifest.fingerprints["foundry.baseline.json"];
writeBaselineManifest(root, manifest);

const count = Object.keys(manifest.fingerprints).length;
console.log(
  `Stamped foundry.baseline.json @ ${manifest.baselineVersion} (${commit.slice(0, 7)}, ${count} fingerprints)`,
);
