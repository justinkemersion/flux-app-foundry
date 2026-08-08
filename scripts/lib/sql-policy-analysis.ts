/**
 * Structural analysis of RLS migrations.
 *
 * Foundry owns the *security property*; the application owns its migration
 * filenames and numbering. Nothing here may key off a specific file name.
 */

export type ForeignKey = { column: string; parentTable: string };

export type TableInfo = {
  name: string;
  columns: string[];
  foreignKeys: ForeignKey[];
  /** FK columns declared `not null` — a null-parent escape hatch is invalid. */
  requiredFkColumns: Set<string>;
  rlsEnabled: boolean;
};

export type PolicyInfo = {
  name: string;
  table: string;
  command: string;
  roles: string[];
  body: string;
  file: string;
};

export type SqlModel = {
  tables: Map<string, TableInfo>;
  policies: PolicyInfo[];
  /** `create function` bodies, keyed by lowercased function name. */
  functions: Map<string, string>;
};

/**
 * The tenant subject expression. Both PostgREST spellings are accepted:
 * `request.jwt.claims ->> 'sub'` and the flattened `request.jwt.claim.sub`.
 */
const JWT_SUBJECT =
  /current_setting\s*\(\s*'request\.jwt\.claims'[^)]*\)\s*(?:::\s*jsonb?\s*)?->>\s*'sub'|current_setting\s*\(\s*'request\.jwt\.claim\.sub'[^)]*\)|auth\.uid\s*\(\s*\)|auth\.jwt\s*\(\s*\)\s*->>\s*'sub'/gi;

const PUBLIC_ROLES = new Set(["anon", "public"]);

/** Words that read like calls in a policy expression but are grammar, not functions. */
const SQL_KEYWORDS = new Set([
  "and", "or", "not", "in", "is", "exists", "select", "from", "where", "on",
  "using", "check", "values", "all", "any", "some", "case", "when", "then",
  "else", "end", "between", "like", "ilike", "as", "by", "join", "left",
  "right", "inner", "outer", "group", "order", "limit", "distinct", "union",
]);

const BUILTIN_FUNCTIONS =
  /^(current_setting|current_user|session_user|coalesce|nullif|cast|lower|upper|trim|length|array|unnest|to_[a-z_]+|jsonb?_[a-z_]+|now|gen_random_uuid|auth)$/;

const COLUMN_CONSTRAINT_KEYWORDS = new Set([
  "primary",
  "unique",
  "foreign",
  "check",
  "constraint",
  "exclude",
  "like",
]);

export function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

/** Split on `;` that sit at paren depth zero and outside string literals. */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    if (inString) {
      current += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          current += sql[++i];
        } else {
          inString = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === ";" && depth === 0) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Read a balanced parenthesised group starting at `openIdx` (the `(`). */
function readBalanced(src: string, openIdx: number): string {
  let depth = 0;
  let inString = false;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i]!;
    if (inString) {
      if (ch === "'") {
        if (src[i + 1] === "'") i++;
        else inString = false;
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return src.slice(openIdx + 1);
}

/** Extract the group following a keyword, e.g. `using` / `with check`. */
function clauseAfter(stmt: string, keyword: RegExp): string[] {
  const out: string[] = [];
  const re = new RegExp(keyword.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(stmt)) !== null) {
    const open = stmt.indexOf("(", m.index + m[0].length - 1);
    if (open === -1) continue;
    out.push(readBalanced(stmt, open));
  }
  return out;
}

function unquote(ident: string): string {
  return ident.trim().replace(/^"(.*)"$/, "$1").replace(/^.*\./, "").toLowerCase();
}

/** Split a `create table (...)` body on top-level commas. */
function splitTableBody(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (inString) {
      current += ch;
      if (ch === "'") {
        if (body[i + 1] === "'") current += body[++i];
        else inString = false;
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

function ensureTable(model: SqlModel, name: string): TableInfo {
  const key = unquote(name);
  let t = model.tables.get(key);
  if (!t) {
    t = {
      name: key,
      columns: [],
      foreignKeys: [],
      requiredFkColumns: new Set(),
      rlsEnabled: false,
    };
    model.tables.set(key, t);
  }
  return t;
}

function applyCreateTable(model: SqlModel, stmt: string): void {
  const m = /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w".]+)\s*\(/i.exec(stmt);
  if (!m) return;
  const table = ensureTable(model, m[1]!);
  const body = readBalanced(stmt, stmt.indexOf("(", m.index + m[0].length - 1));
  for (const part of splitTableBody(body)) {
    const firstToken = /^([\w"]+)/.exec(part)?.[1] ?? "";
    const lowerFirst = firstToken.replace(/"/g, "").toLowerCase();
    const isConstraint = COLUMN_CONSTRAINT_KEYWORDS.has(lowerFirst);

    const tableFk = /foreign\s+key\s*\(\s*([\w"]+)\s*\)\s*references\s+([\w".]+)/i.exec(part);
    if (tableFk) {
      table.foreignKeys.push({
        column: unquote(tableFk[1]!),
        parentTable: unquote(tableFk[2]!),
      });
      continue;
    }
    if (isConstraint) continue;

    const column = unquote(firstToken);
    if (!column) continue;
    table.columns.push(column);
    const inlineFk = /references\s+([\w".]+)/i.exec(part);
    if (inlineFk) {
      table.foreignKeys.push({ column, parentTable: unquote(inlineFk[1]!) });
      if (/\bnot\s+null\b/i.test(part)) table.requiredFkColumns.add(column);
    }
  }
}

function applyAlterTable(model: SqlModel, stmt: string): void {
  const m = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w".]+)/i.exec(stmt);
  if (!m) return;
  const table = ensureTable(model, m[1]!);
  if (/\benable\s+row\s+level\s+security\b/i.test(stmt)) table.rlsEnabled = true;
  if (/\bdisable\s+row\s+level\s+security\b/i.test(stmt)) table.rlsEnabled = false;

  const addCol = /add\s+column\s+(?:if\s+not\s+exists\s+)?([\w"]+)([\s\S]*)$/i.exec(stmt);
  if (addCol) {
    const column = unquote(addCol[1]!);
    if (!table.columns.includes(column)) table.columns.push(column);
    const ref = /references\s+([\w".]+)/i.exec(addCol[2]!);
    if (ref) {
      table.foreignKeys.push({ column, parentTable: unquote(ref[1]!) });
      if (/\bnot\s+null\b/i.test(addCol[2]!)) table.requiredFkColumns.add(column);
    }
  }
}

function applyCreatePolicy(model: SqlModel, stmt: string, file: string): void {
  const m = /create\s+policy\s+([\w"]+)\s+on\s+([\w".]+)([\s\S]*)$/i.exec(stmt);
  if (!m) return;
  const rest = m[3]!;
  const command = (/\bfor\s+(all|select|insert|update|delete)\b/i.exec(rest)?.[1] ?? "all")
    .toLowerCase();
  const rolesRaw = /\bto\s+([\w",\s]+?)(?=\s+(?:using|with)\b|$)/i.exec(rest)?.[1] ?? "";
  const roles = rolesRaw
    .split(",")
    .map((r) => unquote(r))
    .filter(Boolean);
  const body = [
    ...clauseAfter(rest, /\busing\s*\(/),
    ...clauseAfter(rest, /\bwith\s+check\s*\(/),
  ].join(" and ");

  model.policies.push({
    name: unquote(m[1]!),
    table: unquote(m[2]!),
    command,
    roles,
    body: body.replace(/\s+/g, " ").trim(),
    file,
  });
}

function applyDropPolicy(model: SqlModel, stmt: string): void {
  const m = /drop\s+policy\s+(?:if\s+exists\s+)?([\w"]+)\s+on\s+([\w".]+)/i.exec(stmt);
  if (!m) return;
  const name = unquote(m[1]!);
  const table = unquote(m[2]!);
  model.policies = model.policies.filter(
    (p) => !(p.name === name && p.table === table),
  );
}

function applyCreateFunction(model: SqlModel, stmt: string): void {
  const m = /create\s+(?:or\s+replace\s+)?function\s+([\w".]+)\s*\(/i.exec(stmt);
  if (!m) return;
  model.functions.set(unquote(m[1]!), stmt.toLowerCase());
}

/** Build a model from migration sources, applied in the given order. */
export function buildSqlModel(files: Array<{ file: string; sql: string }>): SqlModel {
  const model: SqlModel = {
    tables: new Map(),
    policies: [],
    functions: new Map(),
  };
  for (const { file, sql } of files) {
    for (const stmt of splitStatements(stripSqlComments(sql))) {
      if (/^\s*create\s+table\b/i.test(stmt)) applyCreateTable(model, stmt);
      else if (/^\s*alter\s+table\b/i.test(stmt)) applyAlterTable(model, stmt);
      else if (/^\s*create\s+policy\b/i.test(stmt)) applyCreatePolicy(model, stmt, file);
      else if (/^\s*drop\s+policy\b/i.test(stmt)) applyDropPolicy(model, stmt);
      else if (/^\s*create\s+(or\s+replace\s+)?function\b/i.test(stmt)) {
        applyCreateFunction(model, stmt);
      }
    }
  }
  return model;
}

export function containsJwtSubject(expr: string): boolean {
  JWT_SUBJECT.lastIndex = 0;
  return JWT_SUBJECT.test(expr);
}

/**
 * Columns compared directly against the JWT subject.
 *
 * This is how ownership columns are discovered — structurally, from the
 * comparison itself. `user_id`, `owner_user_id`, `member_user_id`,
 * `created_by` and any other spelling are all recognised without a list.
 */
export function ownershipColumns(expr: string): Set<string> {
  const found = new Set<string>();
  const subject = JWT_SUBJECT.source;
  const ident = "([a-z_][\\w]*(?:\\.[a-z_][\\w]*)?)";
  // The subject is normally parenthesised and may be cast, so allow closing
  // parens / casts on either side of the comparison operator.
  const gap = "[\\s)]*(?:::\\s*\\w+\\s*)?[\\s)]*";
  const lead = "[\\s(]*";
  const patterns = [
    new RegExp(`(?:${subject})${gap}=${lead}${ident}`, "gi"),
    new RegExp(`${ident}${gap}=${lead}(?:${subject})`, "gi"),
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(expr)) !== null) {
      const raw = m.slice(1).find((g) => typeof g === "string" && g.length > 0);
      if (!raw) continue;
      const name = unquote(raw);
      if (name && !/^(current_setting|json|jsonb|text|uuid)$/.test(name)) {
        found.add(name);
      }
    }
  }
  return found;
}

/**
 * Writes must always be owner-bound. An unbound `select` may be a deliberate
 * published/shared-content policy, so it is escalated to manual review rather
 * than failed outright.
 */
export function isWriteCommand(command: string): boolean {
  return command !== "select";
}

/** Policies that apply to a real tenant role (public/anon read is app policy). */
export function isTenantScopedPolicy(p: PolicyInfo): boolean {
  if (p.roles.length === 0) return true;
  return p.roles.some((r) => !PUBLIC_ROLES.has(r));
}

/** A table is tenant-owned when some policy ties its rows to the JWT subject. */
export function isTenantOwnedTable(model: SqlModel, table: string): boolean {
  return model.policies.some(
    (p) => p.table === table && isTenantScopedPolicy(p) && containsJwtSubject(p.body),
  );
}

/**
 * Balanced parenthesised groups within `expr` that mention `relation` in a
 * FROM/JOIN position — i.e. candidate parent-ownership subqueries.
 */
export function subqueriesReferencing(expr: string, relation: string): string[] {
  const ref = new RegExp(`\\b(?:from|join)\\s+${relation}\\b`, "i");
  const out: string[] = [];
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] !== "(") continue;
    const group = readBalanced(expr, i);
    if (ref.test(group)) out.push(group);
  }
  return out;
}

/** True when the expression calls something this analyzer cannot resolve. */
export function hasUnresolvableCall(expr: string): boolean {
  const callRe = /(?:[a-z_][\w]*\.)?([a-z_][\w]*)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(expr.toLowerCase())) !== null) {
    const fn = m[1]!;
    if (SQL_KEYWORDS.has(fn) || BUILTIN_FUNCTIONS.test(fn)) continue;
    return true;
  }
  return false;
}

/**
 * A policy whose expression reduces to a constant false denies every row.
 * That is the safest possible policy, not an unbound one.
 */
export function isDenyAll(expr: string): boolean {
  const normalized = expr.replace(/[\s()]/g, "").toLowerCase();
  return /^false(andfalse)*$/.test(normalized);
}

export type BindingVerdict = "bound" | "unbound" | "unknown";

/**
 * Is this policy expression tied to the calling tenant?
 *
 * Direct comparison, or delegation to a helper function whose own body
 * resolves the subject. Membership/role helpers are a legitimate ownership
 * model; an unreadable helper yields `unknown`, never a silent pass.
 */
export function subjectBindingVerdict(model: SqlModel, body: string): BindingVerdict {
  if (isDenyAll(body)) return "bound";
  if (containsJwtSubject(body)) return "bound";
  const lower = body.toLowerCase();
  for (const [fnName, fnBody] of model.functions) {
    if (!new RegExp(`\\b${fnName}\\s*\\(`, "i").test(lower)) continue;
    return containsJwtSubject(fnBody) ? "bound" : "unknown";
  }
  return hasUnresolvableCall(lower) ? "unknown" : "unbound";
}

export type ParentLinkVerdict = "protected" | "unprotected" | "unknown";

/**
 * Does `body` prove the row's parent is owned by the caller?
 *
 * Accepts any equivalent shape: EXISTS/IN subquery, join, or a helper function
 * whose own definition resolves parent ownership. An unresolvable helper is
 * reported as `unknown` rather than silently passing.
 */
export function parentOwnershipVerdict(
  model: SqlModel,
  body: string,
  fk: ForeignKey,
): ParentLinkVerdict {
  const lower = body.toLowerCase();
  const parent = fk.parentTable;
  const parentTable = model.tables.get(parent);
  const parentRef = new RegExp(`\\b(?:from|join|update|into)\\s+${parent}\\b`, "i");

  /** Does a subquery prove "this parent row is mine" and link it to the FK? */
  const provesOwnership = (region: string): boolean => {
    if (!containsJwtSubject(region)) return false;
    const cols = ownershipColumns(region);
    const ownsParent = parentTable
      ? [...cols].some((c) => parentTable.columns.includes(c))
      : cols.size > 0;
    return ownsParent && new RegExp(`\\b${fk.column}\\b`, "i").test(region);
  };

  // EXISTS / IN / lateral join against the parent relation.
  const regions = subqueriesReferencing(lower, parent);
  if (regions.some(provesOwnership)) return "protected";
  if (regions.length > 0) return "unknown";

  // Inline join form without a subquery wrapper.
  if (parentRef.test(lower) && provesOwnership(lower)) return "protected";

  // Helper function delegation — resolvable only if we can see its body.
  for (const [fnName, fnBody] of model.functions) {
    const called = new RegExp(`\\b${fnName}\\s*\\(`, "i");
    if (!called.test(lower)) continue;
    if (parentRef.test(fnBody) && containsJwtSubject(fnBody)) return "protected";
    return "unknown";
  }

  // An unrecognised function call means static analysis cannot conclude.
  return hasUnresolvableCall(lower) ? "unknown" : "unprotected";
}
