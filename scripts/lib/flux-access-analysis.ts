/**
 * Evidence-based detection of browser-side / out-of-boundary Flux access.
 *
 * The rule Foundry enforces is "Flux is never reached from the browser, and
 * server code reaches it only through the Flux boundary module" — not "no
 * module may call fetch()". Third-party HTTP (weather, inference, geocoding)
 * is ordinary application code and must not be reported.
 */

/** Symbols that only appear when a module is talking to Flux. */
const FLUX_CONFIG_SYMBOLS = [
  /\bNEXT_PUBLIC_FLUX_\w+/,
  /process\.env\.FLUX_[A-Z0-9_]+/,
  /\bFLUX_URL\b/,
  /\bFLUX_GATEWAY[A-Z0-9_]*\b/,
  /\bFLUX_POSTGREST[A-Z0-9_]*\b/,
  /\bFLUX_SERVICE_TOKEN\b/,
  /\bPGRST_JWT_SECRET\b/,
];

/** Importing the Flux boundary itself. */
const FLUX_IMPORT = /from\s+["'](?:@\/)?(?:\.\.?\/)*lib\/flux(?:\/[\w./-]*)?["']/;

/** Credentials that must never be reachable from a browser bundle. */
const FLUX_SECRET_SYMBOLS = [
  /\bNEXT_PUBLIC_FLUX_\w+/,
  /\bFLUX_GATEWAY_JWT_SECRET\b/,
  /\bFLUX_SERVICE_TOKEN\b/,
  /\bPGRST_JWT_SECRET\b/,
];

export type FluxAccessFacts = {
  isClientModule: boolean;
  callsFetch: boolean;
  referencesFluxConfig: boolean;
  importsFluxBoundary: boolean;
  referencesFluxSecret: boolean;
  publicFluxEnv: boolean;
};

export function analyzeFluxAccess(src: string): FluxAccessFacts {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  return {
    isClientModule: /^\s*["']use client["']/m.test(src),
    callsFetch: /(?<![.\w])fetch\s*\(/.test(code),
    referencesFluxConfig: FLUX_CONFIG_SYMBOLS.some((re) => re.test(code)),
    importsFluxBoundary: FLUX_IMPORT.test(code),
    referencesFluxSecret: FLUX_SECRET_SYMBOLS.some((re) => re.test(code)),
    publicFluxEnv: /\bNEXT_PUBLIC_FLUX_\w+/.test(code),
  };
}

export type FluxAccessViolation = {
  kind:
    | "browser-flux-access"
    | "flux-fetch-outside-boundary"
    | "public-flux-env"
    | "browser-flux-secret";
  detail: string;
};

/**
 * Classify a single module.
 *
 * @param relPath   Repo-relative POSIX path.
 * @param src       Module source.
 * @param isBoundary Whether this file *is* the sanctioned Flux HTTP boundary.
 * @param browserReachable Whether the module ships to the browser (client
 *   directive, or a shared component directory per the architecture contract).
 */
export function classifyFluxAccess(opts: {
  relPath: string;
  src: string;
  isBoundary: boolean;
  browserReachable: boolean;
}): FluxAccessViolation[] {
  const { relPath, src, isBoundary, browserReachable } = opts;
  const facts = analyzeFluxAccess(src);
  const out: FluxAccessViolation[] = [];

  // `NEXT_PUBLIC_FLUX_*` is inlined into the client bundle by Next.js, so it
  // is a browser exposure wherever it appears — including the boundary.
  if (facts.publicFluxEnv) {
    out.push({
      kind: "public-flux-env",
      detail: `${relPath} references NEXT_PUBLIC_FLUX_* (inlined into the browser bundle)`,
    });
  }

  if (browserReachable && facts.referencesFluxSecret) {
    out.push({
      kind: "browser-flux-secret",
      detail: `${relPath} is browser-reachable and references a Flux credential`,
    });
  }

  if (
    browserReachable &&
    (facts.importsFluxBoundary ||
      (facts.callsFetch && facts.referencesFluxConfig))
  ) {
    out.push({
      kind: "browser-flux-access",
      detail: `${relPath} is browser-reachable and reaches Flux directly`,
    });
  }

  if (
    !browserReachable &&
    !isBoundary &&
    facts.callsFetch &&
    facts.referencesFluxConfig
  ) {
    out.push({
      kind: "flux-fetch-outside-boundary",
      detail: `${relPath} builds a Flux request outside the Flux boundary module`,
    });
  }

  return out;
}
