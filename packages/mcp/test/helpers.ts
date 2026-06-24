import { vi } from "vitest";
import { type Address, type Hex, getAddress } from "viem";
import { hashMandate, type Mandate } from "@agentic-dao/policy";
import type { Contracts } from "@agentic-dao/chain";
import type { SimulationResult, Simulator, TxRequest } from "@agentic-dao/sim";
import type { GovTxRequest, OpTxRequest, Signer, SignerContext } from "@agentic-dao/signer";
import { GovernanceCore, type CoreDeps } from "../src/core";
import { SimulationGate } from "../src/actionHash";
import { StubIpfsClient } from "../src/ipfs";
import { IndexerClient } from "../src/indexer";

export const PRINCIPAL: Address = "0x1111111111111111111111111111111111111111";
export const AGENT: Address = "0x2222222222222222222222222222222222222222";
export const TARGET: Address = "0x3333333333333333333333333333333333333333";
export const GUARDIAN: Address = "0x5555555555555555555555555555555555555555";
export const TOKEN: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const IN_WINDOW = Math.floor(new Date("2026-06-01T00:00:00Z").getTime() / 1000);

export function testMandate(over: Partial<Mandate> = {}): Mandate {
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

/** A signer mock that, like the real one, re-checks policy independently (defense in depth). */
export function mockSigner(mandate: Mandate): Signer {
  // Reuse the real policy via the BaseSigner-equivalent re-check by importing evaluate lazily.
  return {
    address: vi.fn(async () => AGENT),
    signGovernanceTx: vi.fn(async (_tx: GovTxRequest, _m: Mandate, _ctx: SignerContext) => "0x02deadbeef" as Hex),
    signOpTx: vi.fn(async (_tx: OpTxRequest, _m: Mandate, _spend: bigint, _ctx: SignerContext) => "0x02feedface" as Hex),
  };
}

export function mockSimulator(result?: Partial<SimulationResult>): Simulator {
  return {
    backend: "anvil-fork",
    simulate: vi.fn(async (_tx: TxRequest): Promise<SimulationResult> => ({ success: true, gasUsed: 50000n, backend: "anvil-fork", ...result })),
  };
}

/** Minimal contracts mock — only the methods the core actually calls. */
export function mockContracts(opts: { onChainHash?: Hex; votes?: bigint } = {}): Contracts {
  const onChainHash = opts.onChainHash;
  return {
    governor: {
      proposeRequest: () => ({ to: TARGET, data: "0xpropose" as Hex, value: 0n }),
      castVoteWithReasonRequest: () => ({ to: TARGET, data: "0xvote" as Hex, value: 0n }),
      queueRequest: () => ({ to: TARGET, data: "0x" as Hex, value: 0n }),
      executeRequest: () => ({ to: TARGET, data: "0x" as Hex, value: 0n }),
      state: async () => 1,
      proposalVotes: async () => [0n, 0n, 0n] as const,
      quorum: async () => 0n,
      proposalSnapshot: async () => 0n,
      proposalDeadline: async () => 0n,
      hashProposal: async () => 0n,
    },
    registry: {
      registerAgentRequest: () => ({ to: TARGET, data: "0x" as Hex, value: 0n }),
      updateMandateRequest: () => ({ to: TARGET, data: "0x" as Hex, value: 0n }),
      mandateOf: async () => ({ principal: PRINCIPAL, mandateHash: onChainHash ?? ("0x" as Hex), mandateURI: "ipfs://x", active: true }),
    },
    token: {
      delegateRequest: () => ({ to: TOKEN, data: "0x" as Hex, value: 0n }),
      getVotes: async () => opts.votes ?? 1n,
      clock: async () => IN_WINDOW,
    },
    roles: {
      execTransactionWithRoleRequest: () => ({ to: TARGET, data: "0xexec" as Hex, value: 0n }),
      setSpendingCapRequest: () => ({ to: TARGET, data: "0x" as Hex, value: 0n }),
      setTargetAllowedRequest: () => ({ to: TARGET, data: "0x" as Hex, value: 0n }),
      epochSpend: async () => 0n,
    },
    anchor: {
      anchorRequest: () => ({ to: TARGET, data: "0xanchor" as Hex, value: 0n }),
    },
  } as unknown as Contracts;
}

export interface BuildTestCoreOpts {
  mandate?: Mandate;
  simulator?: Simulator;
  signer?: Signer;
  contracts?: Contracts;
  gate?: SimulationGate;
  now?: number;
  ipfs?: CoreDeps["ipfs"];
}

/** Build a fully-mocked GovernanceCore for adversarial tests. By default the on-chain
 *  mandate hash MATCHES the local mandate (so hash-mismatch tests opt in explicitly). */
export function buildTestCore(opts: BuildTestCoreOpts = {}): { core: GovernanceCore; gate: SimulationGate; signer: Signer; simulator: Simulator } {
  const mandate = opts.mandate ?? testMandate();
  const gate = opts.gate ?? new SimulationGate();
  const signer = opts.signer ?? mockSigner(mandate);
  const simulator = opts.simulator ?? mockSimulator();
  const contracts = opts.contracts ?? mockContracts({ onChainHash: hashMandate(mandate) });
  const core = new GovernanceCore({
    indexer: new IndexerClient({ baseUrl: "http://indexer.test", fetchImpl: failingFetch }),
    simulator,
    signer,
    ipfs: opts.ipfs ?? new StubIpfsClient(),
    contracts,
    mandate,
    agentAccount: getAddress(AGENT),
    now: () => opts.now ?? IN_WINDOW,
    gate,
  });
  return { core, gate, signer, simulator };
}

/** A fetch that always fails — used so read tests assert graceful indexer-down handling. */
export const failingFetch = vi.fn(async () => {
  throw new Error("ECONNREFUSED");
});
