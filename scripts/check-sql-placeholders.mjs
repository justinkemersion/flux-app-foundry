import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "sql/migrations");
const failures = [];

for (const file of readdirSync(dir)) {
  if (!file.endsWith(".sql")) continue;
  const sql = readFileSync(join(dir, file), "utf8");
  if (sql.includes("{{") || sql.includes("}}")) {
    failures.push(`${file}: contains unresolved template placeholders`);
  }
}

if (failures.length > 0) {
  console.error("SQL placeholder check failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("SQL placeholder check passed.");
