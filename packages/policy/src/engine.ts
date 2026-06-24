import type { Hex } from "viem";
import type { Decision, DecisionRule, EvalContext, Mandate, ProposedAction } from "./types";
import { RESERVED_SELECTOR_SET, RESERVED_TARGET_SET } from "./reservedMatters.generated";

const lc = (s: string): string => s.toLowerCase();

/**
 * The set of reserved (ring-fenced) target addresses for this evaluation: the
 * generated baseline (RESERVED_TARGET_SET — e.g. $COUG) plus any deploy-time
 * targets the caller injected via ctx.reservedTargets (the resolved
 * RESERVED_TARGET_PLACEHOLDERS). Any action against one of these is a Reserved
 * Matter (RM-PILOT-002), denied BEFORE the per-mandate allow-list is consulted.
 */
function reservedTargetsFor(ctx: EvalContext): ReadonlySet<string> {
  if (!ctx.reservedTargets?.length) return RESERVED_TARGET_SET;
  return new Set([...RESERVED_TARGET_SET, ...ctx.reservedTargets.map(lc)]);
}

function deny(
  rule: DecisionRule,
  reason: string,
  extra?: { ratificationDraft?: boolean },
): Decision {
  return { allow: false, rule, reason, ...extra };
}

const ALLOW: Decision = { allow: true };

/**
 * The single source of truth for "does this (mandate, action) pass?". Deny on the
 * first failing check and return the failing `rule` (build spec §7.2). Imported
 * unchanged by the MCP server, the CLI, and the signer — the signer re-runs it
 * independently and never trusts that the caller already checked.
 */
export function evaluate(mandate: Mandate, action: ProposedAction, ctx: EvalContext): Decision {
  // 1. Mandate active and within its time window.
  if (ctx.mandateActive === false)
    return deny("MANDATE_INACTIVE", "Mandate is not active on-chain.");
  const created = Date.parse(mandate.createdAt);
  const expires = Date.parse(mandate.expiresAt);
  const nowMs = ctx.now * 1000;
  if (Number.isFinite(created) && nowMs < created)
    return deny("MANDATE_INACTIVE", "Mandate is not yet in effect.");
  if (Number.isFinite(expires) && nowMs >= expires)
    return deny("MANDATE_EXPIRED", "Mandate has expired.");

  switch (action.kind) {
    case "castVote": {
      // 2. Capability.
      if (!mandate.scope.canVote)
        return deny("CAPABILITY_NOT_ALLOWED", "Mandate does not permit voting.");
      // 6. Simulation guard (low-risk but still gated when required).
      if (mandate.requireSimulation && !ctx.simulated) {
        return deny(
          "SIMULATION_REQUIRED",
          "A successful simulation is required before submission.",
        );
      }
      return ALLOW;
    }

    case "propose": {
      // 2. Capability.
      if (!mandate.scope.canPropose)
        return deny("CAPABILITY_NOT_ALLOWED", "Mandate does not permit proposing.");
      // 3. Proposal type.
      if (!mandate.scope.proposalTypes.includes(action.proposalType)) {
        return deny(
          "PROPOSAL_TYPE_NOT_ALLOWED",
          `Proposal type ${action.proposalType} is outside the mandate.`,
        );
      }
      // 3 + 5. Selectors: reserved set first, then mandate's own forbidden list.
      const forbidden = new Set((mandate.scope.forbiddenSelectors ?? []).map(lc));
      for (const sel of action.selectors) {
        if (RESERVED_SELECTOR_SET.has(lc(sel) as Hex)) {
          return deny(
            "RESERVED_MATTER",
            `Selector ${sel} targets a Reserved Matter and is never permitted.`,
          );
        }
        if (forbidden.has(lc(sel))) {
          return deny("FORBIDDEN_SELECTOR", `Selector ${sel} is forbidden by the mandate.`);
        }
      }
      // 4. Reserved targets (ring-fence): denied BEFORE the allow-list, so even a
      // mis-configured mandate that allow-listed a CougarDAO address still fails.
      const reservedT = reservedTargetsFor(ctx);
      for (const target of action.targets) {
        if (reservedT.has(lc(target))) {
          return deny(
            "RESERVED_MATTER",
            `Target ${target} is a ring-fenced (CougarDAO) asset and is never permitted.`,
          );
        }
      }
      // 3. Targets must all be allow-listed.
      const allowed = new Set(mandate.scope.allowedTargets.map(lc));
      for (const target of action.targets) {
        if (!allowed.has(lc(target))) {
          return deny(
            "TARGET_NOT_ALLOWED",
            `Target ${target} is not in the mandate's allowedTargets.`,
          );
        }
      }
      // 6. Simulation guard.
      if (mandate.requireSimulation && !ctx.simulated) {
        return deny(
          "SIMULATION_REQUIRED",
          "A successful simulation is required before submission.",
        );
      }
      // 7. Human ratification trigger (soft deny → draft-for-human).
      const r = mandate.humanRatification;
      if (r) {
        const byValue =
          typeof r.valueUsdGte === "number" &&
          typeof action.valueUsd === "number" &&
          action.valueUsd >= r.valueUsdGte;
        const byImpact = !!r.impact && !!action.impact && r.impact.includes(action.impact);
        if (byValue || byImpact) {
          return deny(
            "NEEDS_HUMAN_RATIFICATION",
            "Action exceeds the human-ratification threshold.",
            {
              ratificationDraft: true,
            },
          );
        }
      }
      return ALLOW;
    }

    case "opExecute": {
      // 5. Reserved Matter guard.
      const sel = lc(action.selector) as Hex;
      if (RESERVED_SELECTOR_SET.has(sel)) {
        return deny(
          "RESERVED_MATTER",
          `Selector ${action.selector} targets a Reserved Matter and is never permitted.`,
        );
      }
      const forbidden = new Set((mandate.scope.forbiddenSelectors ?? []).map(lc));
      if (forbidden.has(sel)) {
        return deny(
          "FORBIDDEN_SELECTOR",
          `Selector ${action.selector} is forbidden by the mandate.`,
        );
      }
      // Reserved target (ring-fence) guard — denied regardless of cap/allow-list.
      if (reservedTargetsFor(ctx).has(lc(action.target))) {
        return deny(
          "RESERVED_MATTER",
          `Target ${action.target} is a ring-fenced (CougarDAO) asset and is never permitted.`,
        );
      }
      // 2. Capability: bounded ops require a spending cap.
      const cap = mandate.scope.spendingCap;
      if (!cap) return deny("NO_SPENDING_CAP", "Mandate grants no bounded operational authority.");
      // 4. Target allow-list.
      const allowed = new Set(mandate.scope.allowedTargets.map(lc));
      if (!allowed.has(lc(action.target))) {
        return deny(
          "OP_TARGET_NOT_ALLOWED",
          `Target ${action.target} is not in the mandate's allowedTargets.`,
        );
      }
      // 4. Spending caps.
      const amount = action.amount ?? 0n;
      const perTx = BigInt(cap.perTx);
      const perEpoch = BigInt(cap.perEpoch);
      if (amount > perTx) {
        return deny(
          "PER_TX_CAP_EXCEEDED",
          `Amount ${amount} exceeds the per-transaction cap ${perTx}.`,
        );
      }
      if (ctx.epochSpend + amount > perEpoch) {
        return deny(
          "PER_EPOCH_CAP_EXCEEDED",
          `Cumulative epoch spend ${ctx.epochSpend + amount} exceeds the cap ${perEpoch}.`,
        );
      }
      // 6. Simulation guard.
      if (mandate.requireSimulation && !ctx.simulated) {
        return deny(
          "SIMULATION_REQUIRED",
          "A successful simulation is required before submission.",
        );
      }
      return ALLOW;
    }
  }
}
