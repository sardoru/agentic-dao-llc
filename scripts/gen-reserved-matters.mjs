#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Generate the runtime + legal artifacts from reserved-matters.yaml.
//
//   node scripts/gen-reserved-matters.mjs            → writes the artifacts
//   node scripts/gen-reserved-matters.mjs --check    → fails (exit 1) on drift
//
// Outputs:
//   • packages/policy/src/reservedMatters.generated.ts
//   • legal/reserved-matters-schedule.md
//
// CI runs `--check` so the three layers (this file, the policy constants, the
// legal schedule) can never silently diverge. See build spec §14, §16.3.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { toFunctionSelector } from "viem";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const SRC = join(root, "reserved-matters.yaml");
const TS_OUT = join(root, "packages/policy/src/reservedMatters.generated.ts");
const MD_OUT = join(root, "legal/reserved-matters-schedule.md");

const checkMode = process.argv.includes("--check");

const doc = parse(readFileSync(SRC, "utf8"));
const matters = (doc.matters ?? []).map((m) => {
  const sigs = m.selectors ?? [];
  return {
    id: m.id,
    title: m.title,
    role: m.role,
    legalOnly: Boolean(m.legalOnly),
    description: String(m.description ?? "").replace(/\s+/g, " ").trim(),
    selectorSignatures: sigs,
    selectors: sigs.map((s) => toFunctionSelector(s)),
  };
});

const allSelectors = [...new Set(matters.flatMap((m) => m.selectors))];

// ── TypeScript artifact ──────────────────────────────────────────────────────
function tsArtifact() {
  const lines = [];
  lines.push("// AUTO-GENERATED from reserved-matters.yaml by scripts/gen-reserved-matters.mjs.");
  lines.push("// Do NOT edit by hand. Run `pnpm gen:reserved` to regenerate.");
  lines.push("// CI (`pnpm check:reserved`) asserts this file agrees with the YAML source");
  lines.push("// and legal/reserved-matters-schedule.md (build spec §14, §16.3).");
  lines.push("");
  lines.push('import type { Hex } from "viem";');
  lines.push("");
  lines.push("export interface ReservedMatter {");
  lines.push("  readonly id: string;");
  lines.push("  readonly title: string;");
  lines.push("  readonly role: string;");
  lines.push("  readonly legalOnly: boolean;");
  lines.push("  readonly description: string;");
  lines.push("  readonly selectorSignatures: readonly string[];");
  lines.push("  readonly selectors: readonly Hex[];");
  lines.push("}");
  lines.push("");
  lines.push(`export const RESERVED_MATTERS_VERSION = ${JSON.stringify(doc.version)};`);
  lines.push("");
  lines.push("export const RESERVED_MATTERS: readonly ReservedMatter[] = [");
  for (const m of matters) {
    lines.push("  {");
    lines.push(`    id: ${JSON.stringify(m.id)},`);
    lines.push(`    title: ${JSON.stringify(m.title)},`);
    lines.push(`    role: ${JSON.stringify(m.role)},`);
    lines.push(`    legalOnly: ${m.legalOnly},`);
    lines.push(`    description: ${JSON.stringify(m.description)},`);
    lines.push(`    selectorSignatures: [${m.selectorSignatures.map((s) => JSON.stringify(s)).join(", ")}],`);
    lines.push(`    selectors: [${m.selectors.map((s) => JSON.stringify(s)).join(", ")}],`);
    lines.push("  },");
  }
  lines.push("];");
  lines.push("");
  lines.push("/** Flat set of every reserved 4-byte selector, for O(1) lookup in the policy engine. */");
  lines.push(`export const RESERVED_SELECTORS: readonly Hex[] = [`);
  for (const s of allSelectors) lines.push(`  ${JSON.stringify(s)},`);
  lines.push("];");
  lines.push("");
  lines.push("export const RESERVED_SELECTOR_SET: ReadonlySet<Hex> = new Set(RESERVED_SELECTORS);");
  lines.push("");
  return lines.join("\n");
}

// ── Legal schedule artifact ──────────────────────────────────────────────────
function mdArtifact() {
  const lines = [];
  lines.push("<!-- AUTO-GENERATED from reserved-matters.yaml. Do NOT edit by hand. Run `pnpm gen:reserved`. -->");
  lines.push("");
  lines.push("# Reserved Matters Schedule");
  lines.push("");
  lines.push("> **Template — not legal advice.** See [`DISCLAIMER.md`](./DISCLAIMER.md). Generated from");
  lines.push("> `reserved-matters.yaml`, the single source of truth shared with the runtime policy");
  lines.push("> engine and proven against the on-chain access-control layer in `contracts/test`.");
  lines.push("");
  lines.push("These matters are reserved to the guardian multisig and a high-threshold human-member");
  lines.push("vote. Neither the AI agents nor the DaoGovernor may effect them: on-chain they are gated");
  lines.push("behind AccessControl roles the Governor does not hold; in the runtime the policy engine");
  lines.push("denies any action touching a reserved selector; in law this schedule and the");
  lines.push("code-deference carve-outs bind the company.");
  lines.push("");
  lines.push("| # | Reserved Matter | Guardian Role | On-chain selectors | Enforced in |");
  lines.push("| --- | --- | --- | --- | --- |");
  matters.forEach((m, i) => {
    const sel = m.legalOnly
      ? "_(legal only)_"
      : m.selectorSignatures.map((s, j) => `\`${s}\` (${m.selectors[j]})`).join("<br>");
    const layers = m.legalOnly ? "legal" : "contracts · runtime · legal";
    lines.push(`| ${i + 1} | ${m.title} | \`${m.role}\` | ${sel} | ${layers} |`);
  });
  lines.push("");
  lines.push("## Guardian roles");
  lines.push("");
  for (const [role, desc] of Object.entries(doc.roles ?? {})) {
    lines.push(`- **\`${role}\`** — ${desc}`);
  }
  lines.push("");
  return lines.join("\n");
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
  console.error(`wrote ${path}`);
  return true;
}

const ok = [emit(TS_OUT, tsArtifact()), emit(MD_OUT, mdArtifact())].every(Boolean);
if (checkMode && !ok) process.exit(1);
