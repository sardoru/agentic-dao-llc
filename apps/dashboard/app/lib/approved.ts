// Who may *prompt* Secretary-01 (submit proposal requests). The public can READ
// the minutes + feed (building in public) but cannot prompt the AI. Approved =
// a valid SIWE session whose address is a registered agent, the guardian, or the
// principal — or a session that resolved a member/guardian role on-chain at login.
import { AGENTS, GUARDIAN, PRINCIPAL } from "./deployment";
import type { SessionData } from "./auth/session";

const APPROVED_ADDRESSES = new Set(
  [...AGENTS.map((a) => a.address), GUARDIAN, PRINCIPAL].map((a) => a.toLowerCase()),
);

export function agentIdFor(address: string): string | null {
  const a = AGENTS.find((x) => x.address.toLowerCase() === address.toLowerCase());
  return a?.id ?? null;
}

export function isApproved(session: SessionData | null): boolean {
  if (!session) return false;
  if (APPROVED_ADDRESSES.has(session.address.toLowerCase())) return true;
  return session.roles.includes("member") || session.roles.includes("guardian");
}

/** A human-readable label for the approved caller (agent id, or role). */
export function callerLabel(session: SessionData): string {
  return (
    agentIdFor(session.address) ??
    (session.roles.includes("guardian")
      ? "guardian"
      : session.roles.includes("member")
        ? "member"
        : "delegate")
  );
}
