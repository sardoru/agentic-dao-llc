import { describe, it, expect } from "vitest";
import {
  canonicalize,
  hashMandate,
  validateMandate,
  verifyMandateHash,
  type Mandate,
} from "../src/index";

const valid: Mandate = {
  version: "1.0",
  agentId: "treasury-agent-01",
  principal: "0x1111111111111111111111111111111111111111",
  agentAccount: "0x2222222222222222222222222222222222222222",
  scope: {
    canPropose: true,
    canVote: true,
    proposalTypes: ["TREASURY_PAYMENT"],
    allowedTargets: ["0x3333333333333333333333333333333333333333"],
    forbiddenSelectors: [],
    spendingCap: {
      token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      perTx: "1000000000",
      perEpoch: "10000000000",
      epochSeconds: 604800,
    },
  },
  requireSimulation: true,
  rationaleStorage: "ipfs",
  guardian: "0x5555555555555555555555555555555555555555",
  createdAt: "2026-01-01T00:00:00Z",
  expiresAt: "2026-12-31T23:59:59Z",
};

describe("canonicalize", () => {
  it("is independent of input key order", () => {
    const a = { b: 1, a: 2, nested: { y: 1, x: 2 } };
    const b = { nested: { x: 2, y: 1 }, a: 2, b: 1 };
    expect(canonicalize(a)).toEqual(canonicalize(b));
  });
  it("preserves array order", () => {
    expect(canonicalize({ xs: [3, 1, 2] })).toEqual('{"xs":[3,1,2]}');
  });
});

describe("hashMandate", () => {
  it("is deterministic and order-independent", () => {
    const reordered = JSON.parse(JSON.stringify({ expiresAt: valid.expiresAt, ...valid }));
    expect(hashMandate(valid)).toEqual(hashMandate(reordered));
  });
  it("returns a 32-byte hex digest", () => {
    expect(hashMandate(valid)).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it("changes when any field changes", () => {
    expect(hashMandate(valid)).not.toEqual(hashMandate({ ...valid, agentId: "other" }));
  });
});

describe("verifyMandateHash", () => {
  it("accepts the matching hash and rejects a mismatch", () => {
    const h = hashMandate(valid);
    expect(verifyMandateHash(valid, h)).toBe(true);
    expect(verifyMandateHash(valid, ("0x" + "0".repeat(64)) as `0x${string}`)).toBe(false);
  });
});

describe("validateMandate", () => {
  it("accepts a well-formed mandate", () => {
    expect(validateMandate(valid)).toEqual({ valid: true, errors: [] });
  });
  it("rejects a bad address", () => {
    const r = validateMandate({ ...valid, principal: "0xnope" });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toContain("principal");
  });
  it("rejects expiry before creation", () => {
    const r = validateMandate({
      ...valid,
      createdAt: "2026-12-31T00:00:00Z",
      expiresAt: "2026-01-01T00:00:00Z",
    });
    expect(r.valid).toBe(false);
  });
  it("rejects an unknown proposal type", () => {
    const r = validateMandate({ ...valid, scope: { ...valid.scope, proposalTypes: ["NUKE"] } });
    expect(r.valid).toBe(false);
  });
});
