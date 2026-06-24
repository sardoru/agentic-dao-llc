import { type Address, type Hex, keccak256, stringToBytes } from "viem";
import {
  type Decision,
  type EvalContext,
  type Impact,
  type Mandate,
  type ProposalType,
  type ProposedAction,
  evaluate,
  verifyMandateHash,
} from "@agentic-dao/policy";
import {
  type CallRequest,
  type Contracts,
  descriptionHash as descHash,
  selectorOf,
} from "@agentic-dao/chain";
import type { Simulator, SimulationResult, TxRequest } from "@agentic-dao/sim";
import type { GovTxRequest, OpTxRequest, Signer } from "@agentic-dao/signer";
import { SimulationGate } from "./actionHash";
import type { IpfsClient, PinResult } from "./ipfs";
import {
  type IndexerClient,
  IndexerUnavailableError,
  type ProposalView,
  type QuorumStatus,
} from "./indexer";

/** Everything the chokepoint needs, injected so it is fully unit-testable with mocks. */
export interface CoreDeps {
  indexer: IndexerClient;
  simulator: Simulator;
  signer: Signer;
  ipfs: IpfsClient;
  contracts: Contracts;
  /** The mandate this runtime instance acts under. */
  mandate: Mandate;
  /** The agent account address (used to verify the on-chain mandate hash). */
  agentAccount: Address;
  /** Clock + gas defaults the EIP-1559 tx fields need (caller supplies nonce/gas). */
  now?: () => number;
  txDefaults?: Partial<
    Pick<GovTxRequest, "nonce" | "gas" | "maxFeePerGas" | "maxPriorityFeePerGas" | "chainId">
  >;
  /** Where humans ratify a drafted action; combined with the action hash into a link. */
  ratificationBaseUrl?: string;
  /** Shared sim-gate (injectable so tests can pre-seed / inspect it). */
  gate?: SimulationGate;
}

/** Uniform tool outcome the MCP server / CLI render. */
export type ToolResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      rule?: string;
      ratification?: { draft: true; link: string; actionHash: Hex };
    };

export interface SubmittedWrite {
  signedTx: Hex;
  rationale: PinResult;
  anchor: CallRequest;
  request: CallRequest;
  simulation: SimulationResult;
}

const DEFAULT_TX = {
  nonce: 0,
  gas: 500_000n,
  maxFeePerGas: 2_000_000_000n,
  maxPriorityFeePerGas: 1_000_000_000n,
  chainId: 84532,
};

/**
 * The policy chokepoint shared by the MCP server and the CLI (build spec §11/§12 —
 * "share code, don't reimplement guardrails"). Every write:
 *   (a) runs policy.evaluate() and surfaces the failing rule,
 *   (b) requires a prior successful simulate_action for the EXACT action (sim-gate),
 *   (c) pins a rationale to IPFS and anchors the content hash — no rationale, no submit,
 *   (d) converts NEEDS_HUMAN_RATIFICATION into a draft + link instead of submitting,
 *   (e) cannot construct a reserved-matter action (policy denies; builders aren't exposed).
 */
export class GovernanceCore {
  private readonly d: CoreDeps;
  private readonly gate: SimulationGate;
  private readonly now: () => number;

  constructor(deps: CoreDeps) {
    this.d = deps;
    this.gate = deps.gate ?? new SimulationGate();
    this.now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  }

  // ── Reads (from the indexer) ────────────────────────────────────────────────
  async listProposals(state?: string): Promise<ToolResult<ProposalView[]>> {
    return this.read(() => this.d.indexer.listProposals(state));
  }
  async getProposal(proposalId: string): Promise<ToolResult<ProposalView>> {
    return this.read(() => this.d.indexer.getProposal(proposalId));
  }
  async getQuorumStatus(proposalId: string): Promise<ToolResult<QuorumStatus>> {
    return this.read(() => this.d.indexer.getQuorumStatus(proposalId));
  }
  async getVotingPower(address: Address): Promise<ToolResult<{ address: Address; votes: string }>> {
    try {
      const votes = await this.d.contracts.token.getVotes(address);
      return { ok: true, data: { address, votes: votes.toString() } };
    } catch (err) {
      return { ok: false, error: `Failed to read voting power: ${(err as Error).message}` };
    }
  }

  /**
   * Returns the mandate and verifies its hash against the AgentRegistry. A mismatch
   * is a hard rejection (build spec §16.2 test_MandateHashMismatchRejected): a tampered
   * or stale mandate doc must never authorize anything.
   */
  async getMandate(
    agentAccount: Address,
  ): Promise<ToolResult<{ mandate: Mandate; onChainHash: Hex; verified: true }>> {
    try {
      const record = await this.d.contracts.registry.mandateOf(agentAccount);
      if (!verifyMandateHash(this.d.mandate, record.mandateHash)) {
        return {
          ok: false,
          error: `Mandate hash mismatch: on-chain ${record.mandateHash} ≠ local doc. Refusing to act.`,
          rule: "MANDATE_HASH_MISMATCH",
        };
      }
      return {
        ok: true,
        data: { mandate: this.d.mandate, onChainHash: record.mandateHash, verified: true },
      };
    } catch (err) {
      return { ok: false, error: `Failed to read on-chain mandate: ${(err as Error).message}` };
    }
  }

  // ── Simulation (required before any create/execute) ─────────────────────────
  /**
   * Simulate an action's tx and, on success, OPEN THE SIM-GATE for that exact action
   * so a subsequent write may proceed. The gate is keyed on the policy action, not the
   * raw tx, so the write must present the identical action.
   */
  async simulateAction(
    action: ProposedAction,
    tx: TxRequest,
  ): Promise<ToolResult<SimulationResult>> {
    // Even simulation respects policy structure — a reserved/over-cap action is denied
    // up front (without simulation it could never pass the write gate anyway).
    const pre = this.policyCheck(action, { simulated: true });
    if (!pre.allow && pre.rule === "RESERVED_MATTER") {
      return { ok: false, error: pre.reason, rule: pre.rule };
    }
    let result: SimulationResult;
    try {
      result = await this.d.simulator.simulate(tx);
    } catch (err) {
      return { ok: false, error: `Simulation failed: ${(err as Error).message}` };
    }
    if (!result.success) {
      return {
        ok: false,
        error: `Simulation reverted: ${result.revertReason ?? "unknown"}`,
        rule: "SIMULATION_REVERTED",
      };
    }
    this.gate.record(action);
    return { ok: true, data: result };
  }

  // ── Writes (the chokepoint) ─────────────────────────────────────────────────
  /**
   * Create a governance proposal. Reserved selectors are not constructable (policy
   * denies). Requires a prior successful simulation of the same action; pins the
   * rationale; on NEEDS_HUMAN_RATIFICATION returns a draft + link instead of submitting.
   */
  async createProposal(input: {
    proposalType: ProposalType;
    targets: Address[];
    values: bigint[];
    calldatas: Hex[];
    description: string;
    rationale: string;
    valueUsd?: number;
    impact?: Impact;
  }): Promise<ToolResult<SubmittedWrite>> {
    if (!input.rationale || input.rationale.trim() === "") {
      return {
        ok: false,
        error: "A rationale is required — no rationale, no submission.",
        rule: "RATIONALE_REQUIRED",
      };
    }
    const selectors = input.calldatas.map(selectorOf);
    const action: ProposedAction = {
      kind: "propose",
      proposalType: input.proposalType,
      targets: input.targets,
      selectors,
      values: input.values,
      valueUsd: input.valueUsd,
      impact: input.impact,
    };

    return this.submitWrite(
      action,
      () =>
        this.d.contracts.governor.proposeRequest(
          input.targets,
          input.values,
          input.calldatas,
          input.description,
        ),
      input.rationale,
      proposalRefId(input.description),
      "governance",
    );
  }

  /** Cast a vote. Policy-checked, rationale pinned, signed, returned ready to broadcast. */
  async castVote(input: {
    proposalId: bigint;
    support: 0 | 1 | 2;
    reason: string;
  }): Promise<ToolResult<SubmittedWrite>> {
    if (!input.reason || input.reason.trim() === "") {
      return {
        ok: false,
        error: "A vote reason is required — no rationale, no submission.",
        rule: "RATIONALE_REQUIRED",
      };
    }
    const action: ProposedAction = {
      kind: "castVote",
      proposalId: input.proposalId,
      support: input.support,
    };
    return this.submitWrite(
      action,
      () =>
        this.d.contracts.governor.castVoteWithReasonRequest(
          input.proposalId,
          input.support,
          input.reason,
        ),
      input.reason,
      keccak256(stringToBytes(`vote:${input.proposalId}`)),
      "governance",
    );
  }

  /**
   * Bounded operational execution via the scoped Roles modifier. Enforces spend caps
   * (in policy) + reserved-selector denial + sim-gate + rationale. The inner call is
   * wrapped in execTransactionWithRole so the on-chain Roles layer is the second gate.
   */
  async opExecute(input: {
    target: Address;
    selector: Hex;
    data: Hex;
    value: bigint;
    token?: Address;
    amount?: bigint;
    epochSpend: bigint;
    rationale: string;
  }): Promise<ToolResult<SubmittedWrite>> {
    if (!input.rationale || input.rationale.trim() === "") {
      return {
        ok: false,
        error: "A rationale is required — no rationale, no submission.",
        rule: "RATIONALE_REQUIRED",
      };
    }
    const action: ProposedAction = {
      kind: "opExecute",
      target: input.target,
      selector: input.selector,
      value: input.value,
      token: input.token,
      amount: input.amount,
    };
    const agent = await this.d.signer.address();
    return this.submitWrite(
      action,
      () =>
        this.d.contracts.roles.execTransactionWithRoleRequest(
          input.target,
          input.value,
          input.data,
          agent,
        ),
      input.rationale,
      keccak256(stringToBytes(`op:${input.target}:${input.selector}:${this.now()}`)),
      "op",
      input.epochSpend,
    );
  }

  // ── internals ───────────────────────────────────────────────────────────────
  private ctx(over: Partial<EvalContext> = {}): EvalContext {
    return { simulated: false, epochSpend: 0n, now: this.now(), mandateActive: true, ...over };
  }

  private policyCheck(action: ProposedAction, over: Partial<EvalContext> = {}): Decision {
    return evaluate(this.d.mandate, action, this.ctx(over));
  }

  private async read<T>(fn: () => Promise<T>): Promise<ToolResult<T>> {
    try {
      return { ok: true, data: await fn() };
    } catch (err) {
      if (err instanceof IndexerUnavailableError) return { ok: false, error: err.message };
      return { ok: false, error: `Read failed: ${(err as Error).message}` };
    }
  }

  /** The single write pipeline every governance/op write flows through. */
  private async submitWrite(
    action: ProposedAction,
    buildRequest: () => CallRequest,
    rationale: string,
    refId: Hex,
    kind: "governance" | "op",
    epochSpend = 0n,
  ): Promise<ToolResult<SubmittedWrite>> {
    // (a) + (b) + (e) Policy gate FIRST, with the sim-gate state fed in as the
    // `simulated` flag. This makes a non-constructable reserved matter / forbidden
    // selector / cap breach surface its true rule (those checks precede the engine's
    // simulation guard), while a valid-but-unsimulated action falls through to the
    // engine's SIMULATION_REQUIRED — so "no sim → no write" still holds.
    const gateOpen = this.gate.has(action);
    const decision = this.policyCheck(action, { simulated: gateOpen, epochSpend });
    if (!decision.allow) {
      // (d) Human ratification → draft + link, not a submission.
      if (decision.rule === "NEEDS_HUMAN_RATIFICATION") {
        const { actionHash, link } = this.draftLink(action);
        return {
          ok: false,
          error: decision.reason,
          rule: decision.rule,
          ratification: { draft: true, link, actionHash },
        };
      }
      return { ok: false, error: decision.reason, rule: decision.rule };
    }

    // (c) Pin rationale; record its content hash. No rationale → already rejected above.
    let pin: PinResult;
    try {
      pin = await this.d.ipfs.pinText(rationale);
    } catch (err) {
      return { ok: false, error: `Failed to pin rationale to IPFS: ${(err as Error).message}` };
    }

    const request = buildRequest();
    const anchor = this.d.contracts.anchor.anchorRequest(refId, pin.uri, pin.contentHash);

    // Sign through the policy-gated signer (it re-checks independently).
    let signedTx: Hex;
    try {
      const fields = {
        ...DEFAULT_TX,
        ...this.d.txDefaults,
        to: request.to,
        data: request.data,
        value: request.value,
      };
      signedTx =
        kind === "op"
          ? await this.d.signer.signOpTx(
              { ...fields, action } as OpTxRequest,
              this.d.mandate,
              epochSpend,
              { simulated: true, now: this.now(), mandateActive: true },
            )
          : await this.d.signer.signGovernanceTx(
              { ...fields, action } as GovTxRequest,
              this.d.mandate,
              { simulated: true, now: this.now(), mandateActive: true },
            );
    } catch (err) {
      return {
        ok: false,
        error: `Signer refused: ${(err as Error).message}`,
        rule: (err as { rule?: string }).rule,
      };
    }

    // Consume the gate so this simulation cannot authorize a second write.
    this.gate.consume(action);

    return {
      ok: true,
      data: {
        signedTx,
        rationale: pin,
        anchor,
        request,
        simulation: { success: true, gasUsed: 0n, backend: this.d.simulator.backend },
      },
    };
  }

  private draftLink(action: ProposedAction): { actionHash: Hex; link: string } {
    const actionHash = keccak256(stringToBytes(JSON.stringify(normalizeForLink(action))));
    const base = this.d.ratificationBaseUrl ?? "https://dashboard.local/ratify";
    return { actionHash, link: `${base}?action=${actionHash}` };
  }
}

function normalizeForLink(action: ProposedAction): unknown {
  return JSON.parse(JSON.stringify(action, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

/** Stable ref id for a proposal rationale anchor: keccak of the description. */
function proposalRefId(description: string): Hex {
  return descHash(description);
}
