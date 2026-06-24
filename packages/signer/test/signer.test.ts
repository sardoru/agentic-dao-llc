import { describe, expect, it } from "vitest";
import { type Address, type Hex, parseTransaction, toFunctionSelector } from "viem";
import { RESERVED_SELECTORS, type Mandate } from "@agentic-dao/policy";
import { LocalSigner, SignerPolicyError, TurnkeySigner, makeSigner } from "../src/index";
import type { GovTxRequest, OpTxRequest, SignerContext } from "../src/types";

// Anvil's well-known dev account #0 — PUBLIC test key, never holds real funds.
const TEST_PK: Hex = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_ADDR: Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const PRINCIPAL: Address = "0x1111111111111111111111111111111111111111";
const AGENT: Address = "0x2222222222222222222222222222222222222222";
const TARGET: Address = "0x3333333333333333333333333333333333333333";
const GUARDIAN: Address = "0x5555555555555555555555555555555555555555";
const TOKEN: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const transferSel = toFunctionSelector("transfer(address,uint256)");
const reservedSel = RESERVED_SELECTORS[0] as Hex; // grantRole(bytes32,address)

const IN_WINDOW = Math.floor(new Date("2026-06-01T00:00:00Z").getTime() / 1000);
const CTX: SignerContext = { simulated: true, now: IN_WINDOW, mandateActive: true };

function mandate(over: Partial<Mandate["scope"]> = {}): Mandate {
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
      spendingCap: { token: TOKEN, perTx: "1000000000", perEpoch: "10000000000", epochSeconds: 604800 },
      ...over,
    },
    humanRatification: { valueUsdGte: 5000, impact: ["HIGH"] },
    requireSimulation: true,
    rationaleStorage: "ipfs",
    guardian: GUARDIAN,
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: "2026-12-31T23:59:59Z",
  };
}

const baseFields = { nonce: 0, gas: 100_000n, maxFeePerGas: 2_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n, chainId: 84532 };

function opTx(over: Partial<OpTxRequest> = {}): OpTxRequest {
  return {
    to: TARGET,
    data: transferSel,
    value: 0n,
    ...baseFields,
    action: { kind: "opExecute", target: TARGET, selector: transferSel, value: 0n, token: TOKEN, amount: 500_000_000n },
    ...over,
  };
}

describe("LocalSigner address + key isolation", () => {
  it("derives the correct address from the private key", async () => {
    const s = new LocalSigner({ privateKey: TEST_PK });
    expect(await s.address()).toBe(TEST_ADDR);
  });

  it("rejects a malformed private key", () => {
    expect(() => new LocalSigner({ privateKey: "0xdeadbeef" as Hex })).toThrow(/32-byte hex key/);
  });
});

describe("BaseSigner independently re-checks policy (defense in depth)", () => {
  const signer = new LocalSigner({ privateKey: TEST_PK });

  it("DENIES a reserved-selector op even if the caller claims it is fine", async () => {
    const tx = opTx({
      data: reservedSel,
      action: { kind: "opExecute", target: TARGET, selector: reservedSel, value: 0n, token: TOKEN, amount: 1n },
    });
    await expect(signer.signOpTx(tx, mandate(), 0n, CTX)).rejects.toBeInstanceOf(SignerPolicyError);
    await expect(signer.signOpTx(tx, mandate(), 0n, CTX)).rejects.toMatchObject({ rule: "RESERVED_MATTER" });
  });

  it("DENIES a per-tx cap-exceeding op", async () => {
    const tx = opTx({
      action: { kind: "opExecute", target: TARGET, selector: transferSel, value: 0n, token: TOKEN, amount: 2_000_000_000n },
    });
    await expect(signer.signOpTx(tx, mandate(), 0n, CTX)).rejects.toMatchObject({ rule: "PER_TX_CAP_EXCEEDED" });
  });

  it("DENIES a per-epoch cap-exceeding op (amount fine alone, cumulative over cap)", async () => {
    const tx = opTx({
      action: { kind: "opExecute", target: TARGET, selector: transferSel, value: 0n, token: TOKEN, amount: 1_000_000_000n },
    });
    // epochSpend already at the cap → next spend overflows.
    await expect(signer.signOpTx(tx, mandate(), 10_000_000_000n, CTX)).rejects.toMatchObject({ rule: "PER_EPOCH_CAP_EXCEEDED" });
  });

  it("DENIES when simulation was not run (requireSimulation)", async () => {
    await expect(signer.signOpTx(opTx(), mandate(), 0n, { ...CTX, simulated: false })).rejects.toMatchObject({
      rule: "SIMULATION_REQUIRED",
    });
  });

  it("DENIES an op when the mandate is inactive on-chain", async () => {
    await expect(signer.signOpTx(opTx(), mandate(), 0n, { ...CTX, mandateActive: false })).rejects.toMatchObject({
      rule: "MANDATE_INACTIVE",
    });
  });

  it("SIGNS an allowed bounded op and produces a valid EIP-1559 tx", async () => {
    const raw = await signer.signOpTx(opTx(), mandate(), 0n, CTX);
    expect(raw.startsWith("0x02")).toBe(true); // type-2 tx envelope
    const parsed = parseTransaction(raw);
    expect(parsed.type).toBe("eip1559");
    expect(parsed.to?.toLowerCase()).toBe(TARGET.toLowerCase());
    expect(parsed.chainId).toBe(84532);
  });

  it("SIGNS an allowed castVote governance tx", async () => {
    const tx: GovTxRequest = {
      to: TARGET,
      data: "0x",
      value: 0n,
      ...baseFields,
      action: { kind: "castVote", proposalId: 42n, support: 1 },
    };
    const raw = await signer.signGovernanceTx(tx, mandate(), CTX);
    expect(parseTransaction(raw).type).toBe("eip1559");
  });

  it("surfaces NEEDS_HUMAN_RATIFICATION as a SignerPolicyError flagged as a draft", async () => {
    const tx: GovTxRequest = {
      to: TARGET,
      data: "0x",
      value: 0n,
      ...baseFields,
      action: { kind: "propose", proposalType: "TREASURY_PAYMENT", targets: [TARGET], selectors: [transferSel], values: [0n], valueUsd: 10_000, impact: "HIGH" },
    };
    try {
      await signer.signGovernanceTx(tx, mandate(), CTX);
      throw new Error("expected SignerPolicyError");
    } catch (err) {
      expect(err).toBeInstanceOf(SignerPolicyError);
      expect((err as SignerPolicyError).rule).toBe("NEEDS_HUMAN_RATIFICATION");
      expect((err as SignerPolicyError).ratificationDraft).toBe(true);
    }
  });
});

describe("makeSigner / TurnkeySigner", () => {
  it("builds a LocalSigner for SIGNER_BACKEND=local", async () => {
    const s = makeSigner({ SIGNER_BACKEND: "local", SIGNER_PRIVATE_KEY: TEST_PK });
    expect(await s.address()).toBe(TEST_ADDR);
  });

  it("throws when local backend has no key", () => {
    expect(() => makeSigner({ SIGNER_BACKEND: "local" })).toThrow(/SIGNER_PRIVATE_KEY is not set/);
  });

  it("TurnkeySigner is a stub that throws on use (mainnet gated)", async () => {
    const s = new TurnkeySigner();
    await expect(s.address()).rejects.toThrow(/not implemented/);
    expect(makeSigner({ SIGNER_BACKEND: "turnkey" })).toBeInstanceOf(TurnkeySigner);
  });
});
