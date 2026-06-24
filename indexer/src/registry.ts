// AgentRegistry event handlers: AgentRegistered, AgentMandateUpdated, AgentDeactivated
import { ponder } from "ponder:registry";
import { agent } from "ponder:schema";

// ---------------------------------------------------------------------------
// AgentRegistered — create agent row; also link member's delegatedAgent.
// ---------------------------------------------------------------------------
ponder.on("AgentRegistry:AgentRegistered", async ({ event, context }) => {
  const { db } = context;
  const args = event.args;

  await db
    .insert(agent)
    .values({
      account: args.agentAccount as `0x${string}`,
      principal: args.principal as `0x${string}`,
      mandateHash: args.mandateHash as string,
      mandateURI: args.mandateURI,
      active: true,
      opSpendCumulative: 0n,
      updatedAt: Number(event.block.timestamp),
      proposalCount: 0,
      voteCount: 0,
    })
    .onConflictDoUpdate(() => ({
      principal: args.principal as `0x${string}`,
      mandateHash: args.mandateHash as string,
      mandateURI: args.mandateURI,
      active: true,
      updatedAt: Number(event.block.timestamp),
    }));
});

// ---------------------------------------------------------------------------
// AgentMandateUpdated — update mandate hash and URI.
// ---------------------------------------------------------------------------
ponder.on("AgentRegistry:AgentMandateUpdated", async ({ event, context }) => {
  const { db } = context;
  const args = event.args;

  await db.update(agent, { account: args.agentAccount as `0x${string}` }).set({
    mandateHash: args.newHash as string,
    mandateURI: args.mandateURI,
    updatedAt: Number(event.block.timestamp),
  });
});

// ---------------------------------------------------------------------------
// AgentDeactivated — mark agent as inactive.
// ---------------------------------------------------------------------------
ponder.on("AgentRegistry:AgentDeactivated", async ({ event, context }) => {
  const { db } = context;
  await db.update(agent, { account: event.args.agentAccount as `0x${string}` }).set({
    active: false,
    updatedAt: Number(event.block.timestamp),
  });
});
