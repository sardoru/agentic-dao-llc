import { describe, expect, it } from "vitest";
import { type Hex, toFunctionSelector } from "viem";
import { hashMandate, RESERVED_SELECTORS, type ProposedAction } from "@agentic-dao/policy";
import type { TxRequest } from "@agentic-dao/sim";
import {
  AGENT,
  TARGET,
  TOKEN,
  buildTestCore,
  mockContracts,
  mockSimulator,
  testMandate,
} from "./helpers";

const transferSel = toFunctionSelector("transfer(address,uint256)");
const reservedSel = RESERVED_SELECTORS[0] as Hex; // grantRole(bytes32,address)
const transferData = (transferSel + "00".repeat(64)) as Hex;

const proposeAction: ProposedAction = {
  kind: "propose",
  proposalType: "TREASURY_PAYMENT",
  targets: [TARGET],
  selectors: [transferSel],
  values: [0n],
};
const proposeTx: TxRequest = { to: TARGET, data: transferData, value: 0n };

const opAction: ProposedAction = {
  kind: "opExecute",
  target: TARGET,
  selector: transferSel,
  value: 0n,
  token: TOKEN,
  amount: 500_000_000n,
};
const opTx: TxRequest = { to: TARGET, data: transferData, value: 0n };

// ─────────────────────────────────────────────────────────────────────────────
// Build spec §16.2 — runtime adversarial safety proofs.
// ─────────────────────────────────────────────────────────────────────────────

describe("test_WriteBlockedWithoutSimulation", () => {
  it("create_proposal is refused when the exact action was not simulated first", async () => {
    const { core } = buildTestCore();
    const r = await core.createProposal({
      proposalType: "TREASURY_PAYMENT",
      targets: [TARGET],
      values: [0n],
      calldatas: [transferData],
      description: "Pay invoice #1",
      rationale: "Routine vendor payment within cap.",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rule).toBe("SIMULATION_REQUIRED");
  });

  it("op_execute is refused without a prior matching simulation", async () => {
    const { core } = buildTestCore();
    const r = await core.opExecute({
      target: TARGET,
      selector: transferSel,
      data: transferData,
      value: 0n,
      token: TOKEN,
      amount: 500_000_000n,
      epochSpend: 0n,
      rationale: "pay",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rule).toBe("SIMULATION_REQUIRED");
  });

  it("succeeds once the SAME action is simulated, and a DIFFERENT action does not satisfy the gate", async () => {
    const { core } = buildTestCore();
    // Simulate a DIFFERENT amount → gate opens for that action only.
    const other = await core.simulateAction({ ...opAction, amount: 1n }, opTx);
    expect(other.ok).toBe(true);
    // The original (amount 500_000_000) is still ungated.
    const blocked = await core.opExecute({
      target: TARGET,
      selector: transferSel,
      data: transferData,
      value: 0n,
      token: TOKEN,
      amount: 500_000_000n,
      epochSpend: 0n,
      rationale: "pay",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.rule).toBe("SIMULATION_REQUIRED");

    // Now simulate the exact action → write proceeds.
    const sim = await core.simulateAction(opAction, opTx);
    expect(sim.ok).toBe(true);
    const ok = await core.opExecute({
      target: TARGET,
      selector: transferSel,
      data: transferData,
      value: 0n,
      token: TOKEN,
      amount: 500_000_000n,
      epochSpend: 0n,
      rationale: "pay",
    });
    expect(ok.ok).toBe(true);
  });

  it("the sim-gate is single-use: a replayed write must re-simulate", async () => {
    const { core } = buildTestCore();
    await core.simulateAction(opAction, opTx);
    const first = await core.opExecute({
      target: TARGET,
      selector: transferSel,
      data: transferData,
      value: 0n,
      token: TOKEN,
      amount: 500_000_000n,
      epochSpend: 0n,
      rationale: "pay",
    });
    expect(first.ok).toBe(true);
    const replay = await core.opExecute({
      target: TARGET,
      selector: transferSel,
      data: transferData,
      value: 0n,
      token: TOKEN,
      amount: 500_000_000n,
      epochSpend: 0n,
      rationale: "pay",
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.rule).toBe("SIMULATION_REQUIRED");
  });
});

describe("test_WriteBlockedWithoutRationale", () => {
  it("create_proposal with an empty rationale is refused (no rationale → no submission)", async () => {
    const { core } = buildTestCore();
    await core.simulateAction(proposeAction, proposeTx);
    const r = await core.createProposal({
      proposalType: "TREASURY_PAYMENT",
      targets: [TARGET],
      values: [0n],
      calldatas: [transferData],
      description: "Pay invoice #1",
      rationale: "   ",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rule).toBe("RATIONALE_REQUIRED");
  });

  it("cast_vote with an empty reason is refused", async () => {
    const { core } = buildTestCore();
    const r = await core.castVote({ proposalId: 1n, support: 1, reason: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rule).toBe("RATIONALE_REQUIRED");
  });

  it("with a rationale, the write pins it and the on-chain content hash matches the stored doc", async () => {
    const { core } = buildTestCore();
    await core.simulateAction(proposeAction, proposeTx);
    const rationale = "Pay the audited Q2 invoice; vendor on allowlist; amount under per-tx cap.";
    const r = await core.createProposal({
      proposalType: "TREASURY_PAYMENT",
      targets: [TARGET],
      values: [0n],
      calldatas: [transferData],
      description: "Pay invoice #1",
      rationale,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // The anchored content hash equals keccak256 of the exact pinned bytes.
      const { keccak256, stringToBytes } = await import("viem");
      expect(r.data.rationale.contentHash).toBe(keccak256(stringToBytes(rationale)));
      expect(r.data.signedTx.startsWith("0x02")).toBe(true);
      expect(r.data.anchor.data).toBeDefined();
    }
  });
});

describe("test_MandateHashMismatchRejected", () => {
  it("get_mandate rejects when the on-chain hash ≠ the local mandate doc", async () => {
    const wrongHash = ("0x" + "ab".repeat(32)) as Hex;
    const { core } = buildTestCore({ contracts: mockContracts({ onChainHash: wrongHash }) });
    const r = await core.getMandate(AGENT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rule).toBe("MANDATE_HASH_MISMATCH");
  });

  it("get_mandate verifies when the on-chain hash matches", async () => {
    const mandate = testMandate();
    const { core } = buildTestCore({
      mandate,
      contracts: mockContracts({ onChainHash: hashMandate(mandate) }),
    });
    const r = await core.getMandate(AGENT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.verified).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Additional chokepoint properties (build spec §11).
// ─────────────────────────────────────────────────────────────────────────────

describe("reserved matters are not constructable", () => {
  it("op_execute on a reserved selector is denied at simulate AND would be at write", async () => {
    const { core } = buildTestCore();
    const reservedAction: ProposedAction = {
      kind: "opExecute",
      target: TARGET,
      selector: reservedSel,
      value: 0n,
      token: TOKEN,
      amount: 1n,
    };
    const sim = await core.simulateAction(reservedAction, {
      to: TARGET,
      data: reservedSel,
      value: 0n,
    });
    expect(sim.ok).toBe(false);
    if (!sim.ok) expect(sim.rule).toBe("RESERVED_MATTER");
  });

  it("a proposal whose calldata carries a reserved selector is denied", async () => {
    const { core } = buildTestCore();
    const action: ProposedAction = {
      kind: "propose",
      proposalType: "PARAM_TUNE_NONRESERVED",
      targets: [TARGET],
      selectors: [reservedSel],
      values: [0n],
    };
    // Open the gate so we know the denial is the RESERVED_MATTER policy rule, not the sim-gate.
    await core
      .simulateAction(action, { to: TARGET, data: reservedSel, value: 0n })
      .catch(() => undefined);
    const r = await core.createProposal({
      proposalType: "PARAM_TUNE_NONRESERVED",
      targets: [TARGET],
      values: [0n],
      calldatas: [reservedSel],
      description: "sneaky",
      rationale: "nope",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rule).toBe("RESERVED_MATTER");
  });
});

describe("human ratification returns a draft, not a submission", () => {
  it("a high-value proposal yields NEEDS_HUMAN_RATIFICATION with a ratification link", async () => {
    const { core } = buildTestCore();
    const action: ProposedAction = {
      kind: "propose",
      proposalType: "TREASURY_PAYMENT",
      targets: [TARGET],
      selectors: [transferSel],
      values: [0n],
      valueUsd: 10_000,
      impact: "HIGH",
    };
    await core.simulateAction(action, proposeTx);
    const r = await core.createProposal({
      proposalType: "TREASURY_PAYMENT",
      targets: [TARGET],
      values: [0n],
      calldatas: [transferData],
      description: "Big spend",
      rationale: "Above the ratification threshold.",
      valueUsd: 10_000,
      impact: "HIGH",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.rule).toBe("NEEDS_HUMAN_RATIFICATION");
      expect(r.ratification?.draft).toBe(true);
      expect(r.ratification?.link).toContain("action=");
    }
  });
});

describe("spend caps + signer defense-in-depth at the write boundary", () => {
  it("op_execute over the per-tx cap is denied even with a valid simulation + rationale", async () => {
    const { core } = buildTestCore();
    const overcap: ProposedAction = {
      kind: "opExecute",
      target: TARGET,
      selector: transferSel,
      value: 0n,
      token: TOKEN,
      amount: 2_000_000_000n,
    };
    await core.simulateAction(overcap, opTx);
    const r = await core.opExecute({
      target: TARGET,
      selector: transferSel,
      data: transferData,
      value: 0n,
      token: TOKEN,
      amount: 2_000_000_000n,
      epochSpend: 0n,
      rationale: "too big",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rule).toBe("PER_TX_CAP_EXCEEDED");
  });

  it("a simulation that reverts does not open the gate", async () => {
    const { core } = buildTestCore({
      simulator: mockSimulator({ success: false, revertReason: "boom" }),
    });
    const sim = await core.simulateAction(opAction, opTx);
    expect(sim.ok).toBe(false);
    const write = await core.opExecute({
      target: TARGET,
      selector: transferSel,
      data: transferData,
      value: 0n,
      token: TOKEN,
      amount: 500_000_000n,
      epochSpend: 0n,
      rationale: "pay",
    });
    expect(write.ok).toBe(false);
    if (!write.ok) expect(write.rule).toBe("SIMULATION_REQUIRED");
  });
});

describe("reads degrade gracefully when the indexer is down", () => {
  it("list_proposals returns a clear error instead of crashing", async () => {
    const { core } = buildTestCore();
    const r = await core.listProposals();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Indexer unreachable/);
  });
});
