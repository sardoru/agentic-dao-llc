// TimelockController event handlers: CallScheduled, Cancelled, CallExecuted
import { ponder } from "ponder:registry";
import { treasuryEvent } from "ponder:schema";

// ---------------------------------------------------------------------------
// CallScheduled — a proposal was queued into the timelock.
// The Governor emits ProposalQueued first; we record the raw timelock event
// here as a treasury event so the guardian console can correlate.
// ---------------------------------------------------------------------------
ponder.on("TimelockController:CallScheduled", async ({ event, context }) => {
  const { db } = context;
  const args = event.args;
  const eventId = `tl-sched-${event.transaction.hash}-${event.log.logIndex}`;

  await db.insert(treasuryEvent).values({
    id: eventId,
    source: "timelock_scheduled",
    agent: undefined,
    target: args.target as `0x${string}`,
    selector: args.data.length >= 10 ? (args.data.slice(0, 10) as string) : "0x00000000",
    token: undefined,
    amount: args.value,
    proposalId: undefined,
    timelockOpId: args.id as string,
    timestamp: Number(event.block.timestamp),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });
});

// ---------------------------------------------------------------------------
// Cancelled — a timelock operation was cancelled (guardian veto).
// ---------------------------------------------------------------------------
ponder.on("TimelockController:Cancelled", async ({ event, context }) => {
  const { db } = context;
  const eventId = `tl-cancel-${event.transaction.hash}-${event.log.logIndex}`;

  await db.insert(treasuryEvent).values({
    id: eventId,
    source: "timelock_cancelled",
    agent: undefined,
    target: "0x0000000000000000000000000000000000000000",
    selector: "0x00000000",
    token: undefined,
    amount: 0n,
    proposalId: undefined,
    timelockOpId: event.args.id as string,
    timestamp: Number(event.block.timestamp),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });
});

// ---------------------------------------------------------------------------
// CallExecuted — a queued operation executed successfully.
// ---------------------------------------------------------------------------
ponder.on("TimelockController:CallExecuted", async ({ event, context }) => {
  const { db } = context;
  const args = event.args;
  const eventId = `tl-exec-${event.transaction.hash}-${event.log.logIndex}`;

  await db.insert(treasuryEvent).values({
    id: eventId,
    source: "timelock_executed",
    agent: undefined,
    target: args.target as `0x${string}`,
    selector: args.data.length >= 10 ? (args.data.slice(0, 10) as string) : "0x00000000",
    token: undefined,
    amount: args.value,
    proposalId: undefined,
    timelockOpId: args.id as string,
    timestamp: Number(event.block.timestamp),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });
});
