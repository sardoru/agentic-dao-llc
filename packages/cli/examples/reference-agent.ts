/**
 * Scripted, DETERMINISTIC reference agent (build spec §5 Phase 4, §16.1).
 *
 * Not an LLM. It exercises the full runtime path end to end through the SAME shared
 * chokepoint the MCP server and CLI use:
 *
 *   simulate_action  →  create_proposal (with rationale)  →  cast_vote  →  bounded op_execute
 *
 * Every step is policy-gated, simulation-first, and rationale-anchored. It runs
 * against a local anvil using addresses from .env; it is import-clean and typechecks
 * now, and becomes runnable once Phase 1/2 contracts are deployed and .env is filled
 * (GOVERNOR / AGENT_REGISTRY / ROLES_MODIFIER / RATIONALE_ANCHOR + a dev SIGNER_PRIVATE_KEY).
 *
 * Run (after deploy):  pnpm --filter @agentic-dao/cli exec tsx examples/reference-agent.ts
 */
import { config as loadEnv } from "dotenv";
import { encodeFunctionData, getAddress, parseAbi, type Address, type Hex } from "viem";
import type { ProposedAction } from "@agentic-dao/policy";
import { selectorOf } from "@agentic-dao/chain";
import type { TxRequest } from "@agentic-dao/sim";
import { type GovernanceCore, type ToolResult, buildCore } from "@agentic-dao/mcp";

loadEnv();

/** A demo ERC-20 transfer the bounded op + the proposal both reference. */
const erc20Abi = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
]);

function logStep(label: string, result: ToolResult<unknown>): void {
  if (result.ok) {
    // eslint-disable-next-line no-console
    console.log(`✓ ${label}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`✗ ${label} — [${result.rule ?? "ERROR"}] ${result.error}`);
  }
}

export async function runReferenceAgent(core: GovernanceCore): Promise<void> {
  // Demo recipient + spend token come from env (or fall back to placeholders the
  // mandate's allowlist must include for the policy gate to pass on a real deploy).
  const recipient = getAddress(
    process.env.DEMO_RECIPIENT ?? "0x4444444444444444444444444444444444444444",
  );
  const token = getAddress(process.env.DEMO_TOKEN ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e");
  const amount = 250_000_000n; // 250 USDC (6 decimals) — under a typical per-tx cap.

  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, amount],
  }) as Hex;
  const transferSelector = selectorOf(transferData);

  // ── 1. PROPOSAL: simulate → create ─────────────────────────────────────────
  const proposeTargets: Address[] = [token];
  const proposeValues = [0n];
  const proposeCalldatas: Hex[] = [transferData];
  const proposeAction: ProposedAction = {
    kind: "propose",
    proposalType: "TREASURY_PAYMENT",
    targets: proposeTargets,
    selectors: [transferSelector],
    values: proposeValues,
    valueUsd: 250,
    impact: "LOW",
  };
  const proposeTx: TxRequest = { to: token, data: transferData, value: 0n };

  logStep("simulate proposal action", await core.simulateAction(proposeAction, proposeTx));
  logStep(
    "create proposal (with rationale)",
    await core.createProposal({
      proposalType: "TREASURY_PAYMENT",
      targets: proposeTargets,
      values: proposeValues,
      calldatas: proposeCalldatas,
      description: "Pay vendor invoice #4242 (Q2 hosting) — within mandate cap.",
      rationale:
        "Recurring, pre-approved hosting invoice; recipient on allowlist; amount under per-tx cap; non-reserved.",
      valueUsd: 250,
      impact: "LOW",
    }),
  );

  // ── 2. VOTE ────────────────────────────────────────────────────────────────
  // (Proposal id is known on a live run; here we use a deterministic placeholder.)
  const proposalId = BigInt(process.env.DEMO_PROPOSAL_ID ?? "1");
  logStep(
    "cast vote FOR (with reason)",
    await core.castVote({
      proposalId,
      support: 1,
      reason: "Spend is within mandate and serves ongoing operations.",
    }),
  );

  // ── 3. BOUNDED OP EXECUTE: simulate → execute ──────────────────────────────
  const opAction: ProposedAction = {
    kind: "opExecute",
    target: token,
    selector: transferSelector,
    value: 0n,
    token,
    amount,
  };
  const opTx: TxRequest = { to: token, data: transferData, value: 0n };

  logStep("simulate bounded op", await core.simulateAction(opAction, opTx));
  logStep(
    "op_execute bounded payment",
    await core.opExecute({
      target: token,
      selector: transferSelector,
      data: transferData,
      value: 0n,
      token,
      amount,
      epochSpend: BigInt(process.env.DEMO_EPOCH_SPEND ?? "0"),
      rationale: "Routine bounded payment under the per-epoch allowance; recipient allowlisted.",
    }),
  );
}

// Runnable entrypoint (no-op import side effects when imported by tooling/tests).
const isMain = (() => {
  try {
    return Boolean(process.argv[1] && import.meta.url === `file://${process.argv[1]}`);
  } catch {
    return false;
  }
})();

if (isMain) {
  // buildCore() reads .env; it throws clearly if MANDATE_PATH / addresses are unset,
  // which is expected until Phase 1/2 contracts are deployed.
  runReferenceAgent(buildCore()).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("reference-agent fatal:", (err as Error).message);
    process.exit(1);
  });
}
