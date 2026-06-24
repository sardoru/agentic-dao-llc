import { describe, it, expect } from "vitest";
import { toFunctionSelector, type Address, type Hex } from "viem";
import {
  evaluate,
  RESERVED_SELECTORS,
  type EvalContext,
  type Mandate,
  type ProposedAction,
} from "../src/index";

const PRINCIPAL: Address = "0x1111111111111111111111111111111111111111";
const AGENT: Address = "0x2222222222222222222222222222222222222222";
const TARGET: Address = "0x3333333333333333333333333333333333333333";
const OTHER: Address = "0x9999999999999999999999999999999999999999";
const GUARDIAN: Address = "0x5555555555555555555555555555555555555555";
const TOKEN: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const transferSel = toFunctionSelector("transfer(address,uint256)"); // 0xa9059cbb
const reservedSel = RESERVED_SELECTORS[0] as Hex; // e.g. grantRole(bytes32,address)

const IN_WINDOW = Math.floor(new Date("2026-06-01T00:00:00Z").getTime() / 1000);

function mandate(over: Partial<Mandate> = {}): Mandate {
  return {
    version: "1.0",
    agentId: "treasury-agent-01",
    principal: PRINCIPAL,
    agentAccount: AGENT,
    scope: {
      canPropose: true,
      canVote: true,
      proposalTypes: ["TREASURY_PAYMENT", "PARAM_TUNE_NONRESERVED", "TEXT_SIGNAL"],
      allowedTargets: [TARGET],
      forbiddenSelectors: [],
      spendingCap: {
        token: TOKEN,
        perTx: "1000000000",
        perEpoch: "10000000000",
        epochSeconds: 604800,
      },
    },
    humanRatification: { valueUsdGte: 5000, impact: ["HIGH"] },
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

const propose = (
  over: Partial<Extract<ProposedAction, { kind: "propose" }>> = {},
): ProposedAction => ({
  kind: "propose",
  proposalType: "TREASURY_PAYMENT",
  targets: [TARGET],
  selectors: [transferSel],
  values: [0n],
  ...over,
});

const op = (
  over: Partial<Extract<ProposedAction, { kind: "opExecute" }>> = {},
): ProposedAction => ({
  kind: "opExecute",
  target: TARGET,
  selector: transferSel,
  value: 0n,
  token: TOKEN,
  amount: 500_000_000n,
  ...over,
});

describe("evaluate — time + activation", () => {
  it("allows a clean proposal in-window", () => {
    expect(evaluate(mandate(), propose(), ctx())).toEqual({ allow: true });
  });
  it("denies when mandate is inactive on-chain", () => {
    expect(evaluate(mandate(), propose(), ctx({ mandateActive: false }))).toMatchObject({
      allow: false,
      rule: "MANDATE_INACTIVE",
    });
  });
  it("denies before the mandate is in effect", () => {
    const early = Math.floor(new Date("2025-12-01T00:00:00Z").getTime() / 1000);
    expect(evaluate(mandate(), propose(), ctx({ now: early }))).toMatchObject({
      rule: "MANDATE_INACTIVE",
    });
  });
  it("denies after expiry", () => {
    const late = Math.floor(new Date("2027-01-02T00:00:00Z").getTime() / 1000);
    expect(evaluate(mandate(), propose(), ctx({ now: late }))).toMatchObject({
      rule: "MANDATE_EXPIRED",
    });
  });
});

describe("evaluate — capability + proposal type", () => {
  it("denies voting when canVote is false", () => {
    expect(
      evaluate(
        mandate({ scope: { ...mandate().scope, canVote: false } }),
        { kind: "castVote", proposalId: 1n, support: 1 },
        ctx(),
      ),
    ).toMatchObject({ rule: "CAPABILITY_NOT_ALLOWED" });
  });
  it("allows voting when canVote is true and simulated", () => {
    expect(evaluate(mandate(), { kind: "castVote", proposalId: 1n, support: 1 }, ctx())).toEqual({
      allow: true,
    });
  });
  it("denies proposing when canPropose is false", () => {
    expect(
      evaluate(mandate({ scope: { ...mandate().scope, canPropose: false } }), propose(), ctx()),
    ).toMatchObject({
      rule: "CAPABILITY_NOT_ALLOWED",
    });
  });
  it("denies a proposal type outside the mandate", () => {
    expect(
      evaluate(
        mandate({ scope: { ...mandate().scope, proposalTypes: ["TEXT_SIGNAL"] } }),
        propose(),
        ctx(),
      ),
    ).toMatchObject({ rule: "PROPOSAL_TYPE_NOT_ALLOWED" });
  });
});

describe("evaluate — Reserved Matters (safety proof)", () => {
  it("denies a propose that touches a reserved selector", () => {
    expect(evaluate(mandate(), propose({ selectors: [reservedSel] }), ctx())).toMatchObject({
      allow: false,
      rule: "RESERVED_MATTER",
    });
  });
  it("denies an opExecute that touches a reserved selector", () => {
    expect(evaluate(mandate(), op({ selector: reservedSel }), ctx())).toMatchObject({
      rule: "RESERVED_MATTER",
    });
  });
  it("denies a mandate-forbidden selector", () => {
    const burn = toFunctionSelector("selfDestruct()");
    expect(
      evaluate(
        mandate({ scope: { ...mandate().scope, forbiddenSelectors: [burn] } }),
        propose({ selectors: [burn] }),
        ctx(),
      ),
    ).toMatchObject({ rule: "FORBIDDEN_SELECTOR" });
  });
});

describe("evaluate — targets", () => {
  it("denies a propose against a non-allowed target", () => {
    expect(evaluate(mandate(), propose({ targets: [OTHER] }), ctx())).toMatchObject({
      rule: "TARGET_NOT_ALLOWED",
    });
  });
});

describe("evaluate — simulation guard", () => {
  it("denies a write that was not simulated", () => {
    expect(evaluate(mandate(), propose(), ctx({ simulated: false }))).toMatchObject({
      rule: "SIMULATION_REQUIRED",
    });
  });
  it("allows when requireSimulation is false even without a sim", () => {
    expect(
      evaluate(mandate({ requireSimulation: false }), propose(), ctx({ simulated: false })),
    ).toEqual({ allow: true });
  });
});

describe("evaluate — human ratification", () => {
  it("flags by value over threshold", () => {
    const d = evaluate(mandate(), propose({ valueUsd: 6000 }), ctx());
    expect(d).toMatchObject({
      allow: false,
      rule: "NEEDS_HUMAN_RATIFICATION",
      ratificationDraft: true,
    });
  });
  it("flags by impact", () => {
    expect(evaluate(mandate(), propose({ impact: "HIGH" }), ctx())).toMatchObject({
      rule: "NEEDS_HUMAN_RATIFICATION",
    });
  });
  it("does not flag a low-value, low-impact proposal", () => {
    expect(evaluate(mandate(), propose({ valueUsd: 100, impact: "LOW" }), ctx())).toEqual({
      allow: true,
    });
  });
});

describe("evaluate — bounded operational execution + spending caps (safety proof)", () => {
  it("allows an op under both caps", () => {
    expect(evaluate(mandate(), op(), ctx())).toEqual({ allow: true });
  });
  it("denies when the agent has no spending cap", () => {
    expect(
      evaluate(mandate({ scope: { ...mandate().scope, spendingCap: null } }), op(), ctx()),
    ).toMatchObject({
      rule: "NO_SPENDING_CAP",
    });
  });
  it("denies an op against a non-allowed target", () => {
    expect(evaluate(mandate(), op({ target: OTHER }), ctx())).toMatchObject({
      rule: "OP_TARGET_NOT_ALLOWED",
    });
  });
  it("denies when amount exceeds the per-tx cap", () => {
    expect(evaluate(mandate(), op({ amount: 2_000_000_000n }), ctx())).toMatchObject({
      rule: "PER_TX_CAP_EXCEEDED",
    });
  });
  it("denies when cumulative spend exceeds the per-epoch cap", () => {
    expect(
      evaluate(mandate(), op({ amount: 1_000_000_000n }), ctx({ epochSpend: 9_500_000_000n })),
    ).toMatchObject({
      rule: "PER_EPOCH_CAP_EXCEEDED",
    });
  });
});
