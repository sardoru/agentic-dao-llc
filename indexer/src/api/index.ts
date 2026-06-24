// Hono API server — exposes proposal, agent, member, treasury views.
// Also enables Ponder's built-in SQL-over-HTTP endpoint at /sql/*.
import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client } from "ponder";
import { eq, desc } from "ponder";

const app = new Hono();

// ---------------------------------------------------------------------------
// SQL-over-HTTP passthrough (used by Ponder Studio and direct queries).
// ---------------------------------------------------------------------------
app.use("/sql/*", client({ db, schema }));

// ---------------------------------------------------------------------------
// GET /proposals
// Returns proposals ordered by creation (newest first), with tally and state.
// Optional query param: ?state=<uint8>
// ---------------------------------------------------------------------------
app.get("/proposals", async (c) => {
  const stateParam = c.req.query("state");

  let rows;
  if (stateParam !== undefined) {
    const stateNum = Number(stateParam);
    rows = await db
      .select()
      .from(schema.proposal)
      .where(eq(schema.proposal.state, stateNum))
      .orderBy(desc(schema.proposal.createdAtBlock))
      .limit(100);
  } else {
    rows = await db
      .select()
      .from(schema.proposal)
      .orderBy(desc(schema.proposal.createdAtBlock))
      .limit(100);
  }

  return c.json(rows.map(serializeProposal));
});

// ---------------------------------------------------------------------------
// GET /proposals/:id
// Returns a single proposal with its votes.
// ---------------------------------------------------------------------------
app.get("/proposals/:id", async (c) => {
  const proposalId = BigInt(c.req.param("id"));

  const proposalRow = await db
    .select()
    .from(schema.proposal)
    .where(eq(schema.proposal.id, proposalId))
    .limit(1);

  if (!proposalRow[0]) {
    return c.json({ error: "Proposal not found" }, 404);
  }

  const votes = await db.select().from(schema.vote).where(eq(schema.vote.proposalId, proposalId));

  return c.json({
    ...serializeProposal(proposalRow[0]),
    votes: votes.map(serializeVote),
  });
});

// ---------------------------------------------------------------------------
// GET /agents
// Returns all registered agents with mandate info and spend.
// ---------------------------------------------------------------------------
app.get("/agents", async (c) => {
  const rows = await db.select().from(schema.agent).orderBy(schema.agent.account).limit(200);

  return c.json(rows.map(serializeAgent));
});

// ---------------------------------------------------------------------------
// GET /agents/:account
// Returns a single agent with their treasury event history.
// ---------------------------------------------------------------------------
app.get("/agents/:account", async (c) => {
  const account = c.req.param("account") as `0x${string}`;

  const agentRows = await db
    .select()
    .from(schema.agent)
    .where(eq(schema.agent.account, account))
    .limit(1);

  if (!agentRows[0]) {
    return c.json({ error: "Agent not found" }, 404);
  }

  const events = await db
    .select()
    .from(schema.treasuryEvent)
    .where(eq(schema.treasuryEvent.agent, account))
    .orderBy(desc(schema.treasuryEvent.blockNumber))
    .limit(100);

  return c.json({
    ...serializeAgent(agentRows[0]),
    treasuryEvents: events.map(serializeTreasuryEvent),
  });
});

// ---------------------------------------------------------------------------
// GET /members
// Returns all members with voting weight and delegation info.
// ---------------------------------------------------------------------------
app.get("/members", async (c) => {
  const rows = await db.select().from(schema.member).orderBy(schema.member.address).limit(500);

  return c.json(rows.map(serializeMember));
});

// ---------------------------------------------------------------------------
// GET /treasury
// Returns recent treasury events (executions + timelock ops).
// ---------------------------------------------------------------------------
app.get("/treasury", async (c) => {
  const rows = await db
    .select()
    .from(schema.treasuryEvent)
    .orderBy(desc(schema.treasuryEvent.blockNumber))
    .limit(200);

  return c.json(rows.map(serializeTreasuryEvent));
});

// ---------------------------------------------------------------------------
// GET /rationale/:refId
// Returns a rationale record by refId (bytes32 hex).
// ---------------------------------------------------------------------------
app.get("/rationale/:refId", async (c) => {
  const refId = c.req.param("refId");
  const rows = await db
    .select()
    .from(schema.rationale)
    .where(eq(schema.rationale.refId, refId))
    .limit(1);

  if (!rows[0]) {
    return c.json({ error: "Rationale not found" }, 404);
  }

  return c.json(rows[0]);
});

// ---------------------------------------------------------------------------
// Serializers — convert bigints to strings for JSON responses.
// ---------------------------------------------------------------------------
function serializeProposal(row: typeof schema.proposal.$inferSelect): Record<string, unknown> {
  return {
    ...row,
    id: row.id.toString(),
    votesFor: row.votesFor.toString(),
    votesAgainst: row.votesAgainst.toString(),
    votesAbstain: row.votesAbstain.toString(),
    snapshotBlock: row.snapshotBlock.toString(),
    deadlineBlock: row.deadlineBlock.toString(),
    timelockEta: row.timelockEta?.toString() ?? null,
    createdAtBlock: row.createdAtBlock.toString(),
    targetsJson: safeParseJson(row.targetsJson),
    valuesJson: safeParseJson(row.valuesJson),
    calldatasJson: safeParseJson(row.calldatasJson),
  };
}

function serializeVote(row: typeof schema.vote.$inferSelect): Record<string, unknown> {
  return {
    ...row,
    proposalId: row.proposalId.toString(),
    weight: row.weight.toString(),
  };
}

function serializeAgent(row: typeof schema.agent.$inferSelect): Record<string, unknown> {
  return {
    ...row,
    opSpendCumulative: row.opSpendCumulative.toString(),
  };
}

function serializeMember(row: typeof schema.member.$inferSelect): Record<string, unknown> {
  return {
    ...row,
    votingWeight: row.votingWeight.toString(),
    participationRate:
      row.totalProposalsInScope > 0 ? row.participationCount / row.totalProposalsInScope : null,
  };
}

function serializeTreasuryEvent(
  row: typeof schema.treasuryEvent.$inferSelect,
): Record<string, unknown> {
  return {
    ...row,
    amount: row.amount.toString(),
    proposalId: row.proposalId?.toString() ?? null,
    blockNumber: row.blockNumber.toString(),
  };
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export default app;
