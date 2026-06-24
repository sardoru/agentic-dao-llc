import { Command } from "commander";
import { getAddress, type Address, type Hex } from "viem";
import type { Impact, ProposalType, ProposedAction } from "@agentic-dao/policy";
import type { TxRequest } from "@agentic-dao/sim";
import { type GovernanceCore, buildCore } from "@agentic-dao/mcp";
import { printResult } from "./render";

/** Lazily build the shared chokepoint core from env, so `--help` etc. need no config. */
export type CoreFactory = () => GovernanceCore;

const defaultFactory: CoreFactory = () => buildCore();

function parseJson<T>(s: string, label: string): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    throw new Error(`--${label} must be valid JSON`);
  }
}

/** Build a propose ProposedAction from CLI inputs (for the implicit pre-write simulate). */
function proposeActionFrom(opts: {
  proposalType: ProposalType;
  targets: Address[];
  selectors: Hex[];
  values: bigint[];
  valueUsd?: number;
  impact?: Impact;
}): ProposedAction {
  return { kind: "propose", ...opts };
}

/**
 * Build the commander program. Every command delegates to the SAME
 * {@link GovernanceCore} the MCP server uses (build spec §12 — share code, never
 * reimplement guardrails). `factory` is injectable so tests can pass a mock core.
 */
export function buildCli(factory: CoreFactory = defaultFactory): Command {
  const program = new Command();
  program
    .name("agentic-dao")
    .description(
      "Scriptable mirror of the Agentic DAO MCP governance tools (same policy/sim/signer/chain).",
    )
    .version("0.1.0");

  // ── reads ──────────────────────────────────────────────────────────────────
  program
    .command("proposals:list")
    .description("List proposals from the indexer (optionally by state).")
    .option("--state <state>", "filter by proposal state")
    .action(async (opts: { state?: string }) => {
      process.exitCode = printResult(await factory().listProposals(opts.state));
    });

  program
    .command("proposal:get")
    .description("Get a proposal by id.")
    .requiredOption("--id <proposalId>", "proposal id")
    .action(async (opts: { id: string }) => {
      process.exitCode = printResult(await factory().getProposal(opts.id));
    });

  program
    .command("agent:mandate")
    .description("Fetch the agent mandate and verify its hash against the on-chain AgentRegistry.")
    .requiredOption("--agent <address>", "agent account address")
    .action(async (opts: { agent: string }) => {
      process.exitCode = printResult(await factory().getMandate(getAddress(opts.agent)));
    });

  // ── simulation ─────────────────────────────────────────────────────────────
  program
    .command("sim:run")
    .description("Simulate an action (opens the sim-gate for that exact action).")
    .requiredOption("--action <json>", "ProposedAction JSON")
    .requiredOption("--tx <json>", "tx {to,data?,value?,from?,gas?} JSON")
    .action(async (opts: { action: string; tx: string }) => {
      const action = parseProposedAction(opts.action);
      const txIn = parseJson<{
        to: string;
        data?: string;
        value?: string;
        from?: string;
        gas?: string;
      }>(opts.tx, "tx");
      const tx: TxRequest = {
        to: getAddress(txIn.to),
        data: txIn.data as Hex | undefined,
        value: txIn.value !== undefined ? BigInt(txIn.value) : undefined,
        from: txIn.from ? getAddress(txIn.from) : undefined,
        gas: txIn.gas !== undefined ? BigInt(txIn.gas) : undefined,
      };
      process.exitCode = printResult(await factory().simulateAction(action, tx));
    });

  // ── writes ─────────────────────────────────────────────────────────────────
  program
    .command("proposal:create")
    .description("Create a governance proposal (requires a prior sim + rationale).")
    .requiredOption(
      "--type <proposalType>",
      "TREASURY_PAYMENT | PARAM_TUNE_NONRESERVED | TEXT_SIGNAL",
    )
    .requiredOption("--targets <json>", "address[] JSON")
    .requiredOption("--values <json>", "uint string[] JSON")
    .requiredOption("--calldatas <json>", "hex[] JSON")
    .requiredOption("--description <text>", "proposal description")
    .requiredOption("--rationale <text>", "rationale (pinned to IPFS; required)")
    .option("--value-usd <number>", "estimated USD value (for ratification check)")
    .option("--impact <impact>", "LOW | MED | HIGH")
    .action(
      async (opts: {
        type: string;
        targets: string;
        values: string;
        calldatas: string;
        description: string;
        rationale: string;
        valueUsd?: string;
        impact?: string;
      }) => {
        const core = factory();
        process.exitCode = printResult(
          await core.createProposal({
            proposalType: opts.type as ProposalType,
            targets: parseJson<string[]>(opts.targets, "targets").map((t) => getAddress(t)),
            values: parseJson<string[]>(opts.values, "values").map((v) => BigInt(v)),
            calldatas: parseJson<string[]>(opts.calldatas, "calldatas") as Hex[],
            description: opts.description,
            rationale: opts.rationale,
            valueUsd: opts.valueUsd !== undefined ? Number(opts.valueUsd) : undefined,
            impact: opts.impact as Impact | undefined,
          }),
        );
      },
    );

  program
    .command("vote:cast")
    .description("Cast a vote with a reason (reason is pinned; required).")
    .requiredOption("--id <proposalId>", "proposal id")
    .requiredOption("--support <0|1|2>", "0=against 1=for 2=abstain")
    .requiredOption("--reason <text>", "vote reason")
    .action(async (opts: { id: string; support: string; reason: string }) => {
      const support = Number(opts.support);
      if (support !== 0 && support !== 1 && support !== 2)
        throw new Error("--support must be 0, 1, or 2");
      process.exitCode = printResult(
        await factory().castVote({
          proposalId: BigInt(opts.id),
          support: support as 0 | 1 | 2,
          reason: opts.reason,
        }),
      );
    });

  program
    .command("op:execute")
    .description(
      "Bounded operational execution via the scoped Roles modifier (caps + sim-gate + rationale).",
    )
    .requiredOption("--target <address>", "call target")
    .requiredOption("--selector <hex>", "4-byte selector")
    .requiredOption("--data <hex>", "full calldata")
    .requiredOption("--rationale <text>", "rationale (pinned; required)")
    .option("--value <uint>", "native value", "0")
    .option("--token <address>", "spend token (for cap accounting)")
    .option("--amount <uint>", "spend amount in token units")
    .option("--epoch-spend <uint>", "token units already spent this epoch", "0")
    .action(
      async (opts: {
        target: string;
        selector: string;
        data: string;
        rationale: string;
        value: string;
        token?: string;
        amount?: string;
        epochSpend: string;
      }) => {
        process.exitCode = printResult(
          await factory().opExecute({
            target: getAddress(opts.target),
            selector: opts.selector.toLowerCase() as Hex,
            data: opts.data as Hex,
            value: BigInt(opts.value),
            token: opts.token ? getAddress(opts.token) : undefined,
            amount: opts.amount !== undefined ? BigInt(opts.amount) : undefined,
            epochSpend: BigInt(opts.epochSpend),
            rationale: opts.rationale,
          }),
        );
      },
    );

  return program;
}

/** Parse a ProposedAction JSON string into the bigint-typed policy shape. */
export function parseProposedAction(json: string): ProposedAction {
  const a = parseJson<Record<string, unknown>>(json, "action");
  if (a.kind === "propose") {
    return proposeActionFrom({
      proposalType: a.proposalType as ProposalType,
      targets: (a.targets as string[]).map((t) => getAddress(t)),
      selectors: (a.selectors as string[]).map((s) => s.toLowerCase() as Hex),
      values: (a.values as string[]).map((v) => BigInt(v)),
      valueUsd: a.valueUsd as number | undefined,
      impact: a.impact as Impact | undefined,
    });
  }
  if (a.kind === "castVote") {
    return {
      kind: "castVote",
      proposalId: BigInt(a.proposalId as string),
      support: Number(a.support) as 0 | 1 | 2,
    };
  }
  if (a.kind === "opExecute") {
    return {
      kind: "opExecute",
      target: getAddress(a.target as string),
      selector: (a.selector as string).toLowerCase() as Hex,
      value: BigInt((a.value as string) ?? "0"),
      token: a.token ? getAddress(a.token as string) : undefined,
      amount: a.amount !== undefined ? BigInt(a.amount as string) : undefined,
    };
  }
  throw new Error(`unknown action kind: ${String(a.kind)}`);
}
