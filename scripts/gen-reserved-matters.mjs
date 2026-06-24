#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Generate the runtime + legal artifacts from reserved-matters.yaml.
//
//   node scripts/gen-reserved-matters.mjs                  → writes the artifacts (pilot)
//   node scripts/gen-reserved-matters.mjs --profile production
//   node scripts/gen-reserved-matters.mjs --check          → fails (exit 1) on drift
//
// Outputs:
//   • packages/policy/src/reservedMatters.generated.ts
//   • legal/reserved-matters-schedule.md
//
// The committed artifacts are the **pilot** profile (the Working Committee DAO
// sandbox — see governance/CGP-001). CI runs `--check` so the three layers (this
// file, the policy constants, the legal schedule) can never silently diverge.
// See build spec §14, §16.3.
//
// Enforcement classes (per matter; inferred when `enforcement` is omitted):
//   selector → 4-byte selectors join RESERVED_SELECTOR_SET (engine denies them)
//   target   → all selectors on the target addresses are forbidden; literals join
//              RESERVED_TARGET_SET, ${placeholders} join RESERVED_TARGET_PLACEHOLDERS
//   cap      → enforced by the RolesModifier allowance cap; selectors shown but
//              NOT added to RESERVED_SELECTOR_SET (they must stay callable)
//   legal    → no on-chain selector; operating agreement + member vote + roles
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { toFunctionSelector, getAddress, isAddress } from "viem";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const SRC = join(root, "reserved-matters.yaml");
const TS_OUT = join(root, "packages/policy/src/reservedMatters.generated.ts");
const MD_OUT = join(root, "legal/reserved-matters-schedule.md");

const checkMode = process.argv.includes("--check");
const profileArg = (() => {
  const i = process.argv.indexOf("--profile");
  return i >= 0 ? process.argv[i + 1] : undefined;
})();

const doc = parse(readFileSync(SRC, "utf8"));
const PROFILE = profileArg ?? doc.default_profile ?? "pilot";
const ENTITY = doc.metadata?.entities?.[PROFILE] ?? PROFILE;

const PLACEHOLDER_RE = /^\$\{[A-Z0-9_]+\}$/;

/** Decide how the runtime denies a matter (explicit `enforcement` wins). */
function classify(m) {
  if (m.enforcement) return m.enforcement;
  if (m.legal_only) return "legal";
  const sels = m.selectors ?? [];
  if (sels.length === 1 && sels[0] === "*") return "target";
  return "selector";
}

const active = (doc.matters ?? []).filter((m) => (m.profiles ?? []).includes(PROFILE));

const matters = active.map((m) => {
  const enforcement = classify(m);
  const rawSigs = m.selectors ?? [];
  // Target matters carry the wildcard "*" — not real signatures.
  const sigs = enforcement === "target" ? [] : rawSigs.filter((s) => s !== "*");
  const selectors = sigs.map((s) => toFunctionSelector(s));
  const targets = m.targets ?? [];
  return {
    id: m.id,
    title: m.title,
    role: m.role,
    category: m.category ?? "",
    profiles: m.profiles ?? [],
    enforcement,
    status: m.status ?? "active",
    legalOnly: enforcement === "legal",
    description: String(m.description ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    enforcementNote: String(m.enforcement_note ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    selectorSignatures: sigs,
    selectors,
    targets,
  };
});

// Flat selector set: ONLY selector-enforced matters. cap/target/legal excluded so
// metered selectors (transfer) and address ring-fences never block legitimate ops.
const allSelectors = [
  ...new Set(matters.filter((m) => m.enforcement === "selector").flatMap((m) => m.selectors)),
];

// Flat target set: literal addresses from target-enforced matters; ${placeholders}
// are emitted separately for ops to resolve at deploy time.
const targetMatters = matters.filter((m) => m.enforcement === "target");
const literalTargets = [];
const placeholderTargets = [];
for (const m of targetMatters) {
  for (const t of m.targets) {
    if (isAddress(t)) literalTargets.push(getAddress(t));
    else if (PLACEHOLDER_RE.test(t)) placeholderTargets.push(t);
    else throw new Error(`RM ${m.id}: target ${t} is neither a 0x address nor a \${PLACEHOLDER}`);
  }
}
const reservedTargets = [...new Set(literalTargets)];
const reservedTargetPlaceholders = [...new Set(placeholderTargets)];

// ── TypeScript artifact ──────────────────────────────────────────────────────
function tsArtifact() {
  const L = [];
  L.push("// AUTO-GENERATED from reserved-matters.yaml by scripts/gen-reserved-matters.mjs.");
  L.push("// Do NOT edit by hand. Run `pnpm gen:reserved` to regenerate.");
  L.push("// CI (`pnpm check:reserved`) asserts this file agrees with the YAML source");
  L.push("// and legal/reserved-matters-schedule.md (build spec §14, §16.3).");
  L.push("");
  L.push('import type { Address, Hex } from "viem";');
  L.push("");
  L.push('export type ReservedEnforcement = "selector" | "target" | "cap" | "legal";');
  L.push("");
  L.push("export interface ReservedMatter {");
  L.push("  readonly id: string;");
  L.push("  readonly title: string;");
  L.push("  readonly role: string;");
  L.push("  readonly category: string;");
  L.push("  readonly profiles: readonly string[];");
  L.push("  readonly enforcement: ReservedEnforcement;");
  L.push("  readonly status: string;");
  L.push("  readonly legalOnly: boolean;");
  L.push("  readonly description: string;");
  L.push("  readonly enforcementNote: string;");
  L.push("  readonly selectorSignatures: readonly string[];");
  L.push("  readonly selectors: readonly Hex[];");
  L.push("  readonly targets: readonly string[];");
  L.push("}");
  L.push("");
  L.push(`export const RESERVED_MATTERS_VERSION = ${JSON.stringify(String(doc.version))};`);
  L.push(`export const RESERVED_MATTERS_PROFILE = ${JSON.stringify(PROFILE)};`);
  L.push(`export const RESERVED_MATTERS_ENTITY = ${JSON.stringify(ENTITY)};`);
  L.push("");
  L.push("export const RESERVED_MATTERS: readonly ReservedMatter[] = [");
  for (const m of matters) {
    L.push("  {");
    L.push(`    id: ${JSON.stringify(m.id)},`);
    L.push(`    title: ${JSON.stringify(m.title)},`);
    L.push(`    role: ${JSON.stringify(m.role)},`);
    L.push(`    category: ${JSON.stringify(m.category)},`);
    L.push(`    profiles: [${m.profiles.map((p) => JSON.stringify(p)).join(", ")}],`);
    L.push(`    enforcement: ${JSON.stringify(m.enforcement)},`);
    L.push(`    status: ${JSON.stringify(m.status)},`);
    L.push(`    legalOnly: ${m.legalOnly},`);
    L.push(`    description: ${JSON.stringify(m.description)},`);
    L.push(`    enforcementNote: ${JSON.stringify(m.enforcementNote)},`);
    L.push(
      `    selectorSignatures: [${m.selectorSignatures.map((s) => JSON.stringify(s)).join(", ")}],`,
    );
    L.push(`    selectors: [${m.selectors.map((s) => JSON.stringify(s)).join(", ")}],`);
    L.push(`    targets: [${m.targets.map((t) => JSON.stringify(t)).join(", ")}],`);
    L.push("  },");
  }
  L.push("];");
  L.push("");
  L.push(
    "/** Flat set of every reserved 4-byte selector, for O(1) lookup in the policy engine. */",
  );
  L.push("export const RESERVED_SELECTORS: readonly Hex[] = [");
  for (const s of allSelectors) L.push(`  ${JSON.stringify(s)},`);
  L.push("];");
  L.push("");
  L.push("export const RESERVED_SELECTOR_SET: ReadonlySet<Hex> = new Set(RESERVED_SELECTORS);");
  L.push("");
  L.push("/**");
  L.push(" * Reserved TARGET addresses (resolved literals): the policy engine denies ANY");
  L.push(" * action whose target is one of these, before the per-mandate allow-list is");
  L.push(" * consulted. In the pilot this is the CougarDAO ring-fence (RM-PILOT-002).");
  L.push(" */");
  L.push("export const RESERVED_TARGETS: readonly Address[] = [");
  for (const t of reservedTargets) L.push(`  ${JSON.stringify(t)},`);
  L.push("];");
  L.push("");
  L.push(
    "export const RESERVED_TARGET_SET: ReadonlySet<string> = new Set(RESERVED_TARGETS.map((a) => a.toLowerCase()));",
  );
  L.push("");
  L.push("/**");
  L.push(" * Deploy-time symbolic targets that ops MUST resolve into the reserved-target");
  L.push(" * set before mainnet (supply them via EvalContext.reservedTargets at runtime).");
  L.push(" * See config/pilot.addresses.example.json.");
  L.push(" */");
  L.push("export const RESERVED_TARGET_PLACEHOLDERS: readonly string[] = [");
  for (const t of reservedTargetPlaceholders) L.push(`  ${JSON.stringify(t)},`);
  L.push("];");
  L.push("");
  return L.join("\n");
}

// ── Legal schedule artifact ──────────────────────────────────────────────────
function layersOf(m) {
  if (m.enforcement === "legal") return "legal";
  if (m.enforcement === "target") return "runtime · legal";
  if (m.status === "planned") return "runtime · legal _(contract pending)_";
  return "contracts · runtime · legal";
}

function onchainCell(m) {
  if (m.enforcement === "legal") return "_(legal only)_";
  if (m.enforcement === "target") {
    const ts = m.targets.map((t) => `\`${t}\``).join("<br>");
    return `_all selectors on:_<br>${ts}`;
  }
  const sel = m.selectorSignatures.map((s, j) => `\`${s}\` (${m.selectors[j]})`).join("<br>");
  return m.enforcement === "cap" ? `${sel}<br>_(cap-metered)_` : sel;
}

function mdArtifact() {
  const L = [];
  L.push(
    "<!-- AUTO-GENERATED from reserved-matters.yaml. Do NOT edit by hand. Run `pnpm gen:reserved`. -->",
  );
  L.push("");
  L.push("# Reserved Matters Schedule");
  L.push("");
  L.push(`**Profile:** \`${PROFILE}\` — ${ENTITY}`);
  L.push("");
  L.push(
    "> **Template — not legal advice.** See [`DISCLAIMER.md`](./DISCLAIMER.md). Generated from",
  );
  L.push("> `reserved-matters.yaml`, the single source of truth shared with the runtime policy");
  L.push("> engine and proven against the on-chain access-control layer in `contracts/test`.");
  L.push("");
  L.push("These matters are reserved to the guardian multisig and a high-threshold human-member");
  L.push(
    "vote. Neither the AI agents nor the DaoGovernor may effect them: on-chain they are gated",
  );
  L.push("behind AccessControl roles the Governor does not hold; in the runtime the policy engine");
  L.push(
    "denies any action touching a reserved selector OR a reserved target; in law this schedule",
  );
  L.push("and the code-deference carve-outs bind the company.");
  L.push("");
  L.push("| # | ID | Reserved Matter | Role | Enforcement | On-chain | Enforced in |");
  L.push("| --- | --- | --- | --- | --- | --- | --- |");
  matters.forEach((m, i) => {
    L.push(
      `| ${i + 1} | \`${m.id}\` | ${m.title} | \`${m.role}\` | ${m.enforcement} | ${onchainCell(m)} | ${layersOf(m)} |`,
    );
  });
  L.push("");
  // Enforcement notes (cap matters etc.)
  const noted = matters.filter((m) => m.enforcementNote);
  if (noted.length) {
    L.push("## Enforcement notes");
    L.push("");
    for (const m of noted) L.push(`- **\`${m.id}\`** — ${m.enforcementNote}`);
    L.push("");
  }
  // Unresolved deploy-time targets
  if (reservedTargetPlaceholders.length) {
    L.push("## Deploy-time targets to resolve");
    L.push("");
    L.push(
      "These symbolic targets must be resolved to concrete addresses before mainnet and supplied",
    );
    L.push("to the runtime (see `config/pilot.addresses.example.json`):");
    L.push("");
    for (const t of reservedTargetPlaceholders) L.push(`- \`${t}\``);
    L.push("");
  }
  L.push("## Guardian roles");
  L.push("");
  for (const [role, desc] of Object.entries(doc.roles ?? {})) {
    L.push(`- **\`${role}\`** — ${desc}`);
  }
  L.push("");
  return L.join("\n");
}

function emit(path, content) {
  if (checkMode) {
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (current !== content) {
      console.error(`✗ drift: ${path} is out of date. Run \`pnpm gen:reserved\` and commit.`);
      return false;
    }
    console.error(`✓ ${path}`);
    return true;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.error(`wrote ${path} (profile: ${PROFILE})`);
  return true;
}

const ok = [emit(TS_OUT, tsArtifact()), emit(MD_OUT, mdArtifact())].every(Boolean);
if (checkMode && !ok) process.exit(1);
