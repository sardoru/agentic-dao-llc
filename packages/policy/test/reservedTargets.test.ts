import { describe, it, expect } from "vitest";
import { toFunctionSelector, type Address } from "viem";
import {
  evaluate,
  RESERVED_TARGETS,
  RESERVED_TARGET_SET,
  RESERVED_TARGET_PLACEHOLDERS,
  type EvalContext,
  type Mandate,
  type ProposedAction,
} from "../src/index";

// $COUG — the one literal reserved target baked into the generated set (RM-PILOT-002).
const COUG = RESERVED_TARGETS[0] as Address;
const COUGARDAO_TREASURY: Address = "0x4444444444444444444444444444444444444444";
const PRINCIPAL: Address = "0x1111111111111111111111111111111111111111";
const AGENT: Address = "0x2222222222222222222222222222222222222222";
const GUARDIAN: Address = "0x5555555555555555555555555555555555555555";
const TOKEN: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const transferSel = toFunctionSelector("transfer(address,uint256)");
const IN_WINDOW = Math.floor(new Date("2026-06-01T00:00:00Z").getTime() / 1000);

// Deliberately allow-list $COUG to prove the reserved-target check fires FIRST.
function mandate(over: Partial<Mandate> = {}): Mandate {
  return {
    version: "1.0",
    agentId: "OPS-01",
    principal: PRINCIPAL,
    agentAccount: AGENT,
    scope: {
      canPropose: true,
      canVote: false,
      proposalTypes: ["OPERATING_EXPENSE", "TEXT_SIGNAL"],
      allowedTargets: [COUG, COUGARDAO_TREASURY, TOKEN],
      forbiddenSelectors: [],
      spendingCap: {
        token: TOKEN,
        perTx: "1000000000",
        perEpoch: "10000000000",
        epochSeconds: 604800,
      },
    },
    requireSimulation: true,
    rationaleStorage: "ipfs",
    guardian: GUARDIAN,
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: "2026-12-31T23:59:59Z",
    ...over,
  };
}

function ctx(over: Partial<EvalContext> = {}): EvalContext {
  return { simulated: true, epochSpend: 0n, now: IN_WINDOW, ...over };
}

describe("RM-PILOT-002 — CougarDAO ring-fence (deny-by-target)", () => {
  it("generated constants: $COUG is reserved; the CougarDAO targets are placeholders", () => {
    expect(RESERVED_TARGET_SET.has(COUG.toLowerCase())).toBe(true);
    expect(RESERVED_TARGET_PLACEHOLDERS).toContain("${COUGARDAO_GOVERNANCE_CORE}");
    expect(RESERVED_TARGET_PLACEHOLDERS).toContain("${COUGARDAO_TREASURY}");
    expect(RESERVED_TARGET_PLACEHOLDERS).toContain("${FABRICA_DEED_NFT}");
  });

  it("denies a propose against $COUG even though it is (mis-)allow-listed", () => {
    const action: ProposedAction = {
      kind: "propose",
      proposalType: "OPERATING_EXPENSE",
      targets: [COUG],
      selectors: [transferSel],
      values: [0n],
    };
    expect(evaluate(mandate(), action, ctx())).toMatchObject({
      allow: false,
      rule: "RESERVED_MATTER",
    });
  });

  it("denies an opExecute against $COUG even when allow-listed and under cap", () => {
    const action: ProposedAction = {
      kind: "opExecute",
      target: COUG,
      selector: transferSel,
      value: 0n,
      token: TOKEN,
      amount: 1n,
    };
    expect(evaluate(mandate(), action, ctx())).toMatchObject({
      allow: false,
      rule: "RESERVED_MATTER",
    });
  });

  it("denies a target injected at runtime via ctx.reservedTargets (a resolved placeholder)", () => {
    const action: ProposedAction = {
      kind: "propose",
      proposalType: "OPERATING_EXPENSE",
      targets: [COUGARDAO_TREASURY],
      selectors: [transferSel],
      values: [0n],
    };
    // Without injection it would pass the ring-fence (only allow-list governs)...
    expect(evaluate(mandate(), action, ctx())).toMatchObject({ allow: true });
    // ...with the resolved CougarDAO treasury injected, it is denied by target.
    expect(
      evaluate(mandate(), action, ctx({ reservedTargets: [COUGARDAO_TREASURY] })),
    ).toMatchObject({ allow: false, rule: "RESERVED_MATTER" });
  });

  it("still allows a normal, non-reserved op target", () => {
    const action: ProposedAction = {
      kind: "opExecute",
      target: TOKEN,
      selector: transferSel,
      value: 0n,
      token: TOKEN,
      amount: 1n,
    };
    expect(evaluate(mandate(), action, ctx())).toEqual({ allow: true });
  });
});
