// RolesModifier event handlers: AgentExecuted, ExecutionSuccess
import { ponder } from "ponder:registry";
import { agent, treasuryEvent } from "ponder:schema";

// ---------------------------------------------------------------------------
// AgentExecuted — record each bounded operational execution as a treasury event
// and accumulate the agent's op-spend.
// ---------------------------------------------------------------------------
ponder.on("RolesModifier:AgentExecuted", async ({ event, context }) => {
  const { db } = context;
  const args = event.args;

  const agentAddr = args.agent as `0x${string}`;
  const target = args.to as `0x${string}`;
  const selector = args.selector as string;
  const token = args.token as `0x${string}`;
  const amount = args.amount;

  // Unique event id: txHash + log index.
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  await db.insert(treasuryEvent).values({
    id: eventId,
    source: "roles_modifier",
    agent: agentAddr,
    target,
    selector,
    token,
    amount,
    proposalId: undefined,
    timelockOpId: undefined,
    timestamp: Number(event.block.timestamp),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });

  // Accumulate op-spend on the agent row.
  const agentRow = await db.find(agent, { account: agentAddr });
  if (agentRow) {
    await db
      .update(agent, { account: agentAddr })
      .set({
        opSpendCumulative: agentRow.opSpendCumulative + amount,
        updatedAt: Number(event.block.timestamp),
      });
  }
});

// ---------------------------------------------------------------------------
// ExecutionSuccess — lightweight record; just log to treasuryEvent with
// selector=0x00000000 and amount=0n (the AgentExecuted event carries the detail).
// Stored for completeness / Safe compatibility.
// ---------------------------------------------------------------------------
ponder.on("RolesModifier:ExecutionSuccess", async ({ event, context }) => {
  const { db } = context;
  const eventId = `exec-${event.transaction.hash}-${event.log.logIndex}`;

  await db.insert(treasuryEvent).values({
    id: eventId,
    source: "roles_modifier_exec",
    agent: undefined,
    target: "0x0000000000000000000000000000000000000000",
    selector: "0x00000000",
    token: undefined,
    amount: 0n,
    proposalId: undefined,
    timelockOpId: event.args.txHash as string,
    timestamp: Number(event.block.timestamp),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });
});
