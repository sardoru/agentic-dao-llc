// Governor event handlers: ProposalCreated, VoteCast, ProposalQueued,
// ProposalExecuted, ProposalCanceled
import { ponder } from "ponder:registry";
import { proposal, vote, agent, member } from "ponder:schema";

// ---------------------------------------------------------------------------
// Helper: look up the agent's principal from the agent table (if indexed).
// Returns undefined when the proposer agent hasn't been seen via AgentRegistry yet.
// ---------------------------------------------------------------------------
async function getPrincipal(
  db: Parameters<Parameters<typeof ponder.on>[1]>[0]["context"]["db"],
  agentAccount: `0x${string}`,
): Promise<`0x${string}` | undefined> {
  const row = await db.find(agent, { account: agentAccount });
  return row?.principal;
}

// ---------------------------------------------------------------------------
// ProposalCreated
// ---------------------------------------------------------------------------
ponder.on("DaoGovernor:ProposalCreated", async ({ event, context }) => {
  const { db } = context;
  const args = event.args;

  const proposerAgent = args.proposer as `0x${string}`;
  const principal = await getPrincipal(db, proposerAgent);

  await db.insert(proposal).values({
    id: args.proposalId,
    proposerAgent,
    proposerPrincipal: principal,
    targetsJson: JSON.stringify(args.targets),
    valuesJson: JSON.stringify(args.values.map(String)),
    calldatasJson: JSON.stringify(args.calldatas),
    description: args.description,
    state: 0, // Pending
    votesFor: 0n,
    votesAgainst: 0n,
    votesAbstain: 0n,
    snapshotBlock: args.voteStart,
    deadlineBlock: args.voteEnd,
    timelockEta: undefined,
    rationaleURI: undefined,
    rationaleContentHash: undefined,
    createdAtBlock: event.block.number,
    createdAtTimestamp: Number(event.block.timestamp),
  });

  // Increment the proposal count on the agent record (best-effort; agent may
  // not yet have been registered if AgentRegistry hasn't been indexed).
  const agentRow = await db.find(agent, { account: proposerAgent });
  if (agentRow) {
    await db
      .update(agent, { account: proposerAgent })
      .set({ proposalCount: agentRow.proposalCount + 1 });
  }
});

// ---------------------------------------------------------------------------
// VoteCast
// ---------------------------------------------------------------------------
ponder.on("DaoGovernor:VoteCast", async ({ event, context }) => {
  const { db } = context;
  const args = event.args;

  const voter = args.voter as `0x${string}`;
  const principal = await getPrincipal(db, voter);

  // Upsert vote row.
  await db
    .insert(vote)
    .values({
      proposalId: args.proposalId,
      voter,
      principal,
      support: args.support,
      weight: args.weight,
      reason: args.reason,
      timestamp: Number(event.block.timestamp),
    })
    .onConflictDoUpdate((row) => ({
      support: args.support,
      weight: args.weight,
      reason: args.reason,
      principal,
      timestamp: Number(event.block.timestamp),
    }));

  // Update tally on the proposal.
  const proposalRow = await db.find(proposal, { id: args.proposalId });
  if (proposalRow) {
    const updates: Partial<typeof proposalRow> = {};
    if (args.support === 1) {
      updates.votesFor = proposalRow.votesFor + args.weight;
    } else if (args.support === 0) {
      updates.votesAgainst = proposalRow.votesAgainst + args.weight;
    } else {
      updates.votesAbstain = proposalRow.votesAbstain + args.weight;
    }
    await db.update(proposal, { id: args.proposalId }).set(updates);
  }

  // Increment agent vote count.
  const agentRow = await db.find(agent, { account: voter });
  if (agentRow) {
    await db.update(agent, { account: voter }).set({ voteCount: agentRow.voteCount + 1 });
  }

  // Increment member participation count (member == principal of the voter agent).
  if (principal) {
    const memberRow = await db.find(member, { address: principal });
    if (memberRow) {
      await db.update(member, { address: principal }).set({
        participationCount: memberRow.participationCount + 1,
      });
    }
  }
});

// ---------------------------------------------------------------------------
// ProposalQueued — state → 5 (Queued), record timelock ETA
// ---------------------------------------------------------------------------
ponder.on("DaoGovernor:ProposalQueued", async ({ event, context }) => {
  const { db } = context;
  await db.update(proposal, { id: event.args.proposalId }).set({
    state: 5, // ProposalState.Queued
    timelockEta: event.args.etaSeconds,
  });
});

// ---------------------------------------------------------------------------
// ProposalExecuted — state → 7
// ---------------------------------------------------------------------------
ponder.on("DaoGovernor:ProposalExecuted", async ({ event, context }) => {
  const { db } = context;
  await db.update(proposal, { id: event.args.proposalId }).set({ state: 7 }); // ProposalState.Executed
});

// ---------------------------------------------------------------------------
// ProposalCanceled — state → 2
// ---------------------------------------------------------------------------
ponder.on("DaoGovernor:ProposalCanceled", async ({ event, context }) => {
  const { db } = context;
  await db.update(proposal, { id: event.args.proposalId }).set({ state: 2 }); // ProposalState.Canceled
});
