import { keccak256, stringToBytes, isAddress, type Hex } from "viem";
import type { Mandate, ProposalType, RationaleStorage } from "./types";

const PROPOSAL_TYPES: ProposalType[] = [
  "TREASURY_PAYMENT",
  "PARAM_TUNE_NONRESERVED",
  "TEXT_SIGNAL",
  "OPERATING_EXPENSE",
];
const RATIONALE_STORAGE: RationaleStorage[] = ["ipfs", "arweave"];

/**
 * Canonical JSON: object keys sorted recursively, arrays preserved in order, no
 * insignificant whitespace. The single canonicalization used everywhere so the
 * off-chain mandate hash always equals the on-chain `mandateHash` (build spec §7.1).
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep(obj[key]);
        return acc;
      }, {});
  }
  return value;
}

/** keccak256 of the canonical UTF-8 bytes. This is the `mandateHash`. */
export function hashMandate(mandate: Mandate): Hex {
  return keccak256(stringToBytes(canonicalize(mandate)));
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const UINT_RE = /^[0-9]+$/;
const SELECTOR_RE = /^0x[a-fA-F0-9]{8}$/;

/**
 * Lightweight structural validation. The authoritative contract is
 * `mandates/schema.json` (JSON Schema, checked in CI); this mirror runs in the hot
 * path with no extra dependency.
 */
export function validateMandate(input: unknown): ValidationResult {
  const errors: string[] = [];
  const e = (msg: string) => errors.push(msg);

  if (typeof input !== "object" || input === null) {
    return { valid: false, errors: ["mandate must be an object"] };
  }
  const m = input as Record<string, unknown>;

  if (m.version !== "1.0") e("version must be '1.0'");
  if (typeof m.agentId !== "string" || m.agentId.length === 0)
    e("agentId must be a non-empty string");
  for (const f of ["principal", "agentAccount", "guardian"] as const) {
    if (typeof m[f] !== "string" || !isAddress(m[f] as string)) e(`${f} must be a valid address`);
  }
  if (typeof m.requireSimulation !== "boolean") e("requireSimulation must be a boolean");
  if (!RATIONALE_STORAGE.includes(m.rationaleStorage as RationaleStorage)) {
    e("rationaleStorage must be 'ipfs' or 'arweave'");
  }

  const scope = m.scope as Record<string, unknown> | undefined;
  if (typeof scope !== "object" || scope === null) {
    e("scope must be an object");
  } else {
    if (typeof scope.canPropose !== "boolean") e("scope.canPropose must be a boolean");
    if (typeof scope.canVote !== "boolean") e("scope.canVote must be a boolean");
    if (!Array.isArray(scope.proposalTypes)) e("scope.proposalTypes must be an array");
    else if (!scope.proposalTypes.every((t) => PROPOSAL_TYPES.includes(t as ProposalType)))
      e("scope.proposalTypes contains an unknown proposal type");
    if (!Array.isArray(scope.allowedTargets)) e("scope.allowedTargets must be an array");
    else if (!scope.allowedTargets.every((t) => typeof t === "string" && isAddress(t)))
      e("scope.allowedTargets contains an invalid address");
    if (scope.forbiddenSelectors !== undefined) {
      if (
        !Array.isArray(scope.forbiddenSelectors) ||
        !scope.forbiddenSelectors.every((s) => SELECTOR_RE.test(s as string))
      )
        e("scope.forbiddenSelectors must be an array of 4-byte selectors");
    }
    const cap = scope.spendingCap as Record<string, unknown> | null | undefined;
    if (cap !== undefined && cap !== null) {
      if (typeof cap.token !== "string" || !isAddress(cap.token))
        e("scope.spendingCap.token must be a valid address");
      if (typeof cap.perTx !== "string" || !UINT_RE.test(cap.perTx))
        e("scope.spendingCap.perTx must be a uint string");
      if (typeof cap.perEpoch !== "string" || !UINT_RE.test(cap.perEpoch))
        e("scope.spendingCap.perEpoch must be a uint string");
      if (typeof cap.epochSeconds !== "number" || cap.epochSeconds < 1)
        e("scope.spendingCap.epochSeconds must be a positive integer");
    }
  }

  const created = Date.parse(m.createdAt as string);
  const expires = Date.parse(m.expiresAt as string);
  if (!Number.isFinite(created)) e("createdAt must be an ISO date-time");
  if (!Number.isFinite(expires)) e("expiresAt must be an ISO date-time");
  if (Number.isFinite(created) && Number.isFinite(expires) && expires <= created) {
    e("expiresAt must be after createdAt");
  }

  return { valid: errors.length === 0, errors };
}

/** Verify a fetched mandate doc against the hash anchored on-chain (build spec §13). */
export function verifyMandateHash(mandate: Mandate, onChainHash: Hex): boolean {
  return hashMandate(mandate).toLowerCase() === onChainHash.toLowerCase();
}
