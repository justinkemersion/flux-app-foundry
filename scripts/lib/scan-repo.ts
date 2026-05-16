import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const ROOT = process.cwd();

export function walkFiles(
  dir: string,
  filter: (p: string) => boolean = () => true,
): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      out.push(...walkFiles(p, filter));
    } else if (filter(p)) {
      out.push(p);
    }
  }
  return out;
}

export function rel(p: string): string {
  return relative(ROOT, p);
}

export function lineCount(file: string): number {
  return readFileSync(file, "utf8").split("\n").length;
}

export function isTsSource(p: string): boolean {
  return p.endsWith(".ts") || p.endsWith(".tsx");
}

export function isClientFile(src: string): boolean {
  return src.includes('"use client"') || src.includes("'use client'");
}

const IMPORT_RE = /from\s+["']([^"']+)["']/g;

export function parseImports(src: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    out.push(m[1]);
  }
  return out;
}

export function scanImportBoundaries(): { violations: string[]; filesScanned: number } {
  const violations: string[] = [];
  const forbiddenInClient = [
    /from ["']@\/lib\/flux/,
    /from ["']@\/auth/,
    /from ["'].*\/sql\//,
  ];
  let filesScanned = 0;

  for (const dir of ["app", "components", "lib"]) {
    const base = join(ROOT, dir);
    for (const file of walkFiles(base, isTsSource)) {
      filesScanned++;
      const src = readFileSync(file, "utf8");
      const r = rel(file);
      const client = isClientFile(src);
      if (client) {
        for (const re of forbiddenInClient) {
          if (re.test(src)) violations.push(`${r}: client imports server-only module`);
        }
      }
      if (r.startsWith("components/") && /from ["']@\/lib\/flux/.test(src)) {
        violations.push(`${r}: components must not import lib/flux`);
      }
    }
  }
  return { violations, filesScanned };
}

export function scanOversizedFiles(): Array<{ file: string; lines: number; max: number }> {
  const rules = [
    { glob: "components", ext: ".tsx", max: 250 },
    { glob: "app", ext: ".tsx", max: 300 },
    { glob: "app", ext: "route.ts", max: 300, suffix: "route.ts" },
    { glob: "lib", ext: ".ts", max: 400 },
  ];
  const oversized: Array<{ file: string; lines: number; max: number }> = [];

  for (const rule of rules) {
    const base = join(ROOT, rule.glob);
    for (const file of walkFiles(base, isTsSource)) {
      if (rule.suffix) {
        if (!file.endsWith(rule.suffix)) continue;
      } else if (rule.ext === ".tsx" && !file.endsWith(".tsx")) {
        continue;
      } else if (rule.ext === ".ts" && !file.endsWith(".ts")) {
        continue;
      }
      if (file.includes("lib/flux/types.ts")) continue;
      const lines = lineCount(file);
      if (lines > rule.max) oversized.push({ file: rel(file), lines, max: rule.max });
    }
  }
  return oversized.sort((a, b) => b.lines - a.lines);
}

export function countImportFrequency(): Array<{ target: string; count: number }> {
  const counts = new Map<string, number>();
  for (const dir of ["app", "components", "lib"]) {
    for (const file of walkFiles(join(ROOT, dir), isTsSource)) {
      const src = readFileSync(file, "utf8");
      for (const imp of parseImports(src)) {
        counts.set(imp, (counts.get(imp) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([target, count]) => ({ target, count }))
    .sort((a, b) => b.count - a.count);
}

export type RouteEntry = {
  path: string;
  file: string;
  type: "page" | "route" | "layout";
};

export function scanRoutes(): RouteEntry[] {
  const appDir = join(ROOT, "app");
  const routes: RouteEntry[] = [];

  for (const file of walkFiles(appDir, (p) => p.endsWith(".tsx") || p.endsWith("/route.ts") || p.endsWith("route.ts"))) {
    const r = rel(file);
    if (r.endsWith("page.tsx")) {
      routes.push({ path: filePathToRoute(r), file: r, type: "page" });
    } else if (r.endsWith("route.ts")) {
      routes.push({ path: filePathToRoute(r.replace(/\/route\.ts$/, "")) + " (API)", file: r, type: "route" });
    } else if (r.endsWith("layout.tsx")) {
      routes.push({ path: filePathToRoute(r.replace(/\/layout\.tsx$/, "")) + " (layout)", file: r, type: "layout" });
    }
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

function filePathToRoute(appRelative: string): string {
  let p = appRelative.replace(/^app\//, "").replace(/\/page\.tsx$/, "");
  p = p.replace(/\/layout\.tsx$/, "");
  p = p.replace(/\([^)]+\)\//g, "");
  p = p.replace(/\/index$/, "");
  if (!p) return "/";
  const segments = p.split("/");
  const out = segments
    .map((s) => (s.startsWith("[") && s.endsWith("]") ? `:${s.slice(1, -1)}` : s))
    .join("/");
  return `/${out}`;
}

export type ComponentEntry = {
  name: string;
  file: string;
  client: boolean;
  lines: number;
};

export function scanComponents(): ComponentEntry[] {
  const dir = join(ROOT, "components");
  const entries: ComponentEntry[] = [];
  for (const file of walkFiles(dir, (p) => p.endsWith(".tsx"))) {
    const src = readFileSync(file, "utf8");
    const name = file.split("/").pop()?.replace(/\.tsx$/, "") ?? "Unknown";
    entries.push({
      name,
      file: rel(file),
      client: isClientFile(src),
      lines: lineCount(file),
    });
  }
  return entries.sort((a, b) => a.file.localeCompare(b.file));
}

export function countServerActions(): number {
  let n = 0;
  for (const file of walkFiles(join(ROOT, "app"), isTsSource)) {
    const src = readFileSync(file, "utf8");
    if (src.includes('"use server"') || src.includes("'use server'")) n++;
  }
  return n;
}

export function architecturalMetrics() {
  const routes = scanRoutes();
  const components = scanComponents();
  const oversized = scanOversizedFiles();
  const imports = countImportFrequency();
  const pages = routes.filter((r) => r.type === "page");
  const apiRoutes = routes.filter((r) => r.type === "route");

  const allTs = [
    ...walkFiles(join(ROOT, "app"), isTsSource),
    ...walkFiles(join(ROOT, "components"), isTsSource),
    ...walkFiles(join(ROOT, "lib"), isTsSource),
  ];
  const largest = allTs
    .map((f) => ({ file: rel(f), lines: lineCount(f) }))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 15);

  return {
    routeCount: pages.length,
    apiRouteCount: apiRoutes.length,
    layoutCount: routes.filter((r) => r.type === "layout").length,
    componentCount: components.length,
    clientComponentCount: components.filter((c) => c.client).length,
    serverActionFiles: countServerActions(),
    oversizedCount: oversized.length,
    libFluxFiles: walkFiles(join(ROOT, "lib/flux"), isTsSource).length,
    largestFiles: largest,
    topImports: imports.slice(0, 20),
  };
}
