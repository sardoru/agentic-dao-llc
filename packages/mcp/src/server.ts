import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getAddress, type Address, type Hex } from "viem";
import type { Impact, ProposalType, ProposedAction } from "@agentic-dao/policy";
import type { TxRequest } from "@agentic-dao/sim";
import type { GovernanceCore, ToolResult } from "./core";
import { buildCore } from "./buildCore";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "must be a 20-byte hex address");
const hexSchema = z.string().regex(/^0x[a-fA-F0-9]*$/, "must be 0x-prefixed hex");
const bigintStr = z.string().regex(/^[0-9]+$/, "must be a non-negative integer string");
const proposalType = z.enum(["TREASURY_PAYMENT", "PARAM_TUNE_NONRESERVED", "TEXT_SIGNAL"]);
const impact = z.enum(["LOW", "MED", "HIGH"]);
const actionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("propose"),
    proposalType,
    targets: z.array(addressSchema),
    selectors: z.array(hexSchema),
    values: z.array(bigintStr),
    valueUsd: z.number().optional(),
    impact: impact.optional(),
  }),
  z.object({ kind: z.literal("castVote"), proposalId: bigintStr, support: z.union([z.literal(0), z.literal(1), z.literal(2)]) }),
  z.object({
    kind: z.literal("opExecute"),
    target: addressSchema,
    selector: hexSchema,
    value: bigintStr,
    token: addressSchema.optional(),
    amount: bigintStr.optional(),
  }),
]);

type ActionInput = z.infer<typeof actionSchema>;

/** Render any ToolResult as MCP content. Errors surface the failing policy rule. */
function render<T>(result: ToolResult<T>) {
  if (result.ok) {
    return { content: [{ type: "text" as const, text: JSON.stringify(result.data, bigintReplacer, 2) }] };
  }
  const payload: Record<string, unknown> = { error: result.error };
  if (result.rule) payload.rule = result.rule;
  if (result.ratification) payload.ratification = result.ratification;
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, bigintReplacer, 2) }], isError: true };
}

const bigintReplacer = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

/** Map the wire ActionInput (string bigints) onto the policy ProposedAction (bigints). */
function toProposedAction(a: ActionInput): ProposedAction {
  if (a.kind === "propose") {
    return {
      kind: "propose",
      proposalType: a.proposalType as ProposalType,
      targets: a.targets.map((t) => getAddress(t)),
      selectors: a.selectors.map((s) => s.toLowerCase() as Hex),
      values: a.values.map((v) => BigInt(v)),
      valueUsd: a.valueUsd,
      impact: a.impact as Impact | undefined,
    };
  }
  if (a.kind === "castVote") {
    return { kind: "castVote", proposalId: BigInt(a.proposalId), support: a.support };
  }
  return {
    kind: "opExecute",
    target: getAddress(a.target),
    selector: a.selector.toLowerCase() as Hex,
    value: BigInt(a.value),
    token: a.token ? getAddress(a.token) : undefined,
    amount: a.amount !== undefined ? BigInt(a.amount) : undefined,
  };
}

/**
 * Register the nine governance tools (build spec §11) onto an MCP server backed by
 * the {@link GovernanceCore} chokepoint. Exported so tests can instantiate the server
 * without a transport, and so the bin entry and any embedder share one wiring.
 */
export function createMcpServer(core: GovernanceCore): McpServer {
  const server = new McpServer(
    { name: "agentic-dao-mcp", version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: "Agent-facing governance tools for the Agentic DAO LLC. Every write is policy-gated, simulation-first, and rationale-anchored; reserved matters are not constructable." },
  );

  // ── Reads ───────────────────────────────────────────────────────────────────
  server.registerTool(
    "list_proposals",
    { description: "List proposals from the indexer, optionally filtered by state.", inputSchema: { state: z.string().optional() } },
    async ({ state }) => render(await core.listProposals(state)),
  );

  server.registerTool(
    "get_proposal",
    { description: "Get a proposal: decoded calldata, tally, quorum, timelock ETA, rationale.", inputSchema: { proposalId: bigintStr } },
    async ({ proposalId }) => render(await core.getProposal(proposalId)),
  );

  server.registerTool(
    "get_quorum_status",
    { description: "Quorum reached?, votes for/against/abstain, threshold.", inputSchema: { proposalId: bigintStr } },
    async ({ proposalId }) => render(await core.getQuorumStatus(proposalId)),
  );

  server.registerTool(
    "get_voting_power",
    { description: "Current delegated voting weight of an address.", inputSchema: { address: addressSchema } },
    async ({ address }) => render(await core.getVotingPower(getAddress(address))),
  );

  server.registerTool(
    "get_mandate",
    { description: "Return the agent mandate and verify its hash against the on-chain AgentRegistry.", inputSchema: { agentAccount: addressSchema } },
    async ({ agentAccount }) => render(await core.getMandate(getAddress(agentAccount))),
  );

  // ── Simulation (required before any create/execute) ─────────────────────────
  server.registerTool(
    "simulate_action",
    {
      description: "Dry-run an action. REQUIRED before create_proposal / op_execute — opens the sim-gate for that exact action.",
      inputSchema: { action: actionSchema, tx: z.object({ from: addressSchema.optional(), to: addressSchema, data: hexSchema.optional(), value: bigintStr.optional(), gas: bigintStr.optional() }) },
    },
    async ({ action, tx }) => {
      const txReq: TxRequest = {
        from: tx.from ? getAddress(tx.from) : undefined,
        to: getAddress(tx.to),
        data: tx.data as Hex | undefined,
        value: tx.value !== undefined ? BigInt(tx.value) : undefined,
        gas: tx.gas !== undefined ? BigInt(tx.gas) : undefined,
      };
      return render(await core.simulateAction(toProposedAction(action), txReq));
    },
  );

  // ── Writes (the chokepoint) ─────────────────────────────────────────────────
  server.registerTool(
    "create_proposal",
    {
      description: "Create a governance proposal. Reserved matters are NOT constructable. Requires a prior simulation + a rationale; NEEDS_HUMAN_RATIFICATION returns a draft + link instead of submitting.",
      inputSchema: {
        proposalType,
        targets: z.array(addressSchema),
        values: z.array(bigintStr),
        calldatas: z.array(hexSchema),
        description: z.string().min(1),
        rationale: z.string().min(1),
        valueUsd: z.number().optional(),
        impact: impact.optional(),
      },
    },
    async (input) =>
      render(
        await core.createProposal({
          proposalType: input.proposalType as ProposalType,
          targets: input.targets.map((t) => getAddress(t)),
          values: input.values.map((v) => BigInt(v)),
          calldatas: input.calldatas as Hex[],
          description: input.description,
          rationale: input.rationale,
          valueUsd: input.valueUsd,
          impact: input.impact as Impact | undefined,
        }),
      ),
  );

  server.registerTool(
    "cast_vote",
    {
      description: "Cast a vote with a reason. Reason is pinned; no rationale → no submission.",
      inputSchema: { proposalId: bigintStr, support: z.union([z.literal(0), z.literal(1), z.literal(2)]), reason: z.string().min(1) },
    },
    async ({ proposalId, support, reason }) => render(await core.castVote({ proposalId: BigInt(proposalId), support, reason })),
  );

  server.registerTool(
    "op_execute",
    {
      description: "Bounded operational execution via the scoped Roles modifier. Enforces spend caps + reserved-selector denial + sim-gate + rationale.",
      inputSchema: {
        target: addressSchema,
        selector: hexSchema,
        data: hexSchema,
        value: bigintStr,
        token: addressSchema.optional(),
        amount: bigintStr.optional(),
        epochSpend: bigintStr,
        rationale: z.string().min(1),
      },
    },
    async (input) =>
      render(
        await core.opExecute({
          target: getAddress(input.target),
          selector: input.selector.toLowerCase() as Hex,
          data: input.data as Hex,
          value: BigInt(input.value),
          token: input.token ? getAddress(input.token) : undefined,
          amount: input.amount !== undefined ? BigInt(input.amount) : undefined,
          epochSpend: BigInt(input.epochSpend),
          rationale: input.rationale,
        }),
      ),
  );

  return server;
}

/** Bootstrap: build the core from env, register tools, serve over stdio. */
export async function main(): Promise<void> {
  const core = buildCore();
  const server = createMcpServer(core);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error("[agentic-dao-mcp] ready on stdio");
}

// Run only when invoked directly as the bin (not when imported by tests).
const isMain = (() => {
  try {
    return Boolean(process.argv[1] && import.meta.url === `file://${process.argv[1]}`);
  } catch {
    return false;
  }
})();

if (isMain) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[agentic-dao-mcp] fatal:", err);
    process.exit(1);
  });
}
