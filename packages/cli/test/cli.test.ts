import { describe, expect, it, vi } from "vitest";
import { type GovernanceCore, type ToolResult } from "@agentic-dao/mcp";
import { buildCli, parseProposedAction } from "../src/program";

/** A core mock that records calls and returns canned results — proves the CLI shares
 *  the SAME chokepoint surface (it never reimplements guardrails). */
function mockCore(over: Partial<Record<keyof GovernanceCore, unknown>> = {}): { core: GovernanceCore; calls: Record<string, unknown[]> } {
  const calls: Record<string, unknown[]> = {};
  const rec =
    (name: string, result: ToolResult<unknown>) =>
    async (...args: unknown[]) => {
      calls[name] = args;
      return result;
    };
  const ok: ToolResult<unknown> = { ok: true, data: { ok: true } };
  const core = {
    listProposals: rec("listProposals", ok),
    getProposal: rec("getProposal", ok),
    getQuorumStatus: rec("getQuorumStatus", ok),
    getVotingPower: rec("getVotingPower", ok),
    getMandate: rec("getMandate", ok),
    simulateAction: rec("simulateAction", ok),
    createProposal: rec("createProposal", ok),
    castVote: rec("castVote", ok),
    opExecute: rec("opExecute", ok),
    ...over,
  } as unknown as GovernanceCore;
  return { core, calls };
}

async function run(core: GovernanceCore, argv: string[]): Promise<void> {
  const program = buildCli(() => core);
  program.exitOverride(); // throw instead of process.exit on parse errors
  await program.parseAsync(["node", "agentic-dao", ...argv]);
}

describe("CLI mirrors the MCP tools through the shared core", () => {
  it("proposals:list calls core.listProposals", async () => {
    const { core, calls } = mockCore();
    await run(core, ["proposals:list", "--state", "Active"]);
    expect(calls.listProposals).toEqual(["Active"]);
  });

  it("proposal:get calls core.getProposal with the id", async () => {
    const { core, calls } = mockCore();
    await run(core, ["proposal:get", "--id", "42"]);
    expect(calls.getProposal).toEqual(["42"]);
  });

  it("agent:mandate calls core.getMandate with a checksummed address", async () => {
    const { core, calls } = mockCore();
    await run(core, ["agent:mandate", "--agent", "0x2222222222222222222222222222222222222222"]);
    expect(calls.getMandate?.[0]).toBe("0x2222222222222222222222222222222222222222");
  });

  it("sim:run parses the action + tx and calls core.simulateAction", async () => {
    const { core, calls } = mockCore();
    await run(core, [
      "sim:run",
      "--action",
      JSON.stringify({ kind: "castVote", proposalId: "7", support: 1 }),
      "--tx",
      JSON.stringify({ to: "0x3333333333333333333333333333333333333333" }),
    ]);
    expect(calls.simulateAction).toBeDefined();
    const [action] = calls.simulateAction as [{ kind: string; proposalId: bigint }];
    expect(action.kind).toBe("castVote");
    expect(action.proposalId).toBe(7n);
  });

  it("proposal:create passes a rationale + typed args to core.createProposal", async () => {
    const { core, calls } = mockCore();
    await run(core, [
      "proposal:create",
      "--type",
      "TREASURY_PAYMENT",
      "--targets",
      JSON.stringify(["0x3333333333333333333333333333333333333333"]),
      "--values",
      JSON.stringify(["0"]),
      "--calldatas",
      JSON.stringify(["0xa9059cbb"]),
      "--description",
      "Pay invoice",
      "--rationale",
      "Within cap.",
    ]);
    const [arg] = calls.createProposal as [{ rationale: string; values: bigint[] }];
    expect(arg.rationale).toBe("Within cap.");
    expect(arg.values[0]).toBe(0n);
  });

  it("vote:cast rejects an invalid support value", async () => {
    const { core } = mockCore();
    await expect(run(core, ["vote:cast", "--id", "1", "--support", "5", "--reason", "x"])).rejects.toThrow(/support must be 0, 1, or 2/);
  });

  it("op:execute forwards spend accounting to core.opExecute", async () => {
    const { core, calls } = mockCore();
    await run(core, [
      "op:execute",
      "--target",
      "0x3333333333333333333333333333333333333333",
      "--selector",
      "0xa9059cbb",
      "--data",
      "0xa9059cbb",
      "--amount",
      "500000000",
      "--epoch-spend",
      "100",
      "--rationale",
      "routine",
    ]);
    const [arg] = calls.opExecute as [{ amount: bigint; epochSpend: bigint }];
    expect(arg.amount).toBe(500_000_000n);
    expect(arg.epochSpend).toBe(100n);
  });

  it("surfaces a policy denial (rule) on a failing write", async () => {
    const denied: ToolResult<unknown> = { ok: false, error: "reserved", rule: "RESERVED_MATTER" };
    const { core } = mockCore({ opExecute: (async () => denied) as unknown as GovernanceCore["opExecute"] });
    const errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await run(core, ["op:execute", "--target", "0x3333333333333333333333333333333333333333", "--selector", "0x2f2ff15d", "--data", "0x2f2ff15d", "--rationale", "x"]);
    const out = errSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(out).toContain("RESERVED_MATTER");
    errSpy.mockRestore();
  });
});

describe("parseProposedAction", () => {
  it("parses a propose action with bigint values + lowercased selectors", () => {
    const a = parseProposedAction(JSON.stringify({ kind: "propose", proposalType: "TEXT_SIGNAL", targets: ["0x3333333333333333333333333333333333333333"], selectors: ["0xA9059CBB"], values: ["10"] }));
    expect(a.kind).toBe("propose");
    if (a.kind === "propose") {
      expect(a.values[0]).toBe(10n);
      expect(a.selectors[0]).toBe("0xa9059cbb");
    }
  });

  it("throws on an unknown kind", () => {
    expect(() => parseProposedAction(JSON.stringify({ kind: "nope" }))).toThrow(/unknown action kind/);
  });
});
