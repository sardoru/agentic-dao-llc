import type { ProposalState } from "./types";

export function formatAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCountdown(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  const abs = Math.abs(diff);
  const past = diff < 0;
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  const label = parts.join(" ");
  return past ? `${label} ago` : `in ${label}`;
}

export function stateColor(state: ProposalState): string {
  switch (state) {
    case "Active":
      return "text-accent-2";
    case "Queued":
      return "text-warn";
    case "Succeeded":
      return "text-success";
    case "Executed":
      return "text-success";
    case "Defeated":
      return "text-danger";
    case "Canceled":
      return "text-muted";
    case "Expired":
      return "text-muted";
    case "Pending":
      return "text-muted";
    default:
      return "text-muted";
  }
}

export function formatBigInt(n: bigint, decimals: number): string {
  if (decimals === 0) return n.toString();
  const str = n.toString().padStart(decimals + 1, "0");
  const intPart = str.slice(0, str.length - decimals) || "0";
  const fracPart = str.slice(str.length - decimals).replace(/0+$/, "");
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

export function calcQuorumPct(forVotes: bigint, quorumVotes: bigint): number {
  if (quorumVotes === 0n) return 100;
  return Math.min(100, Math.round((Number(forVotes) / Number(quorumVotes)) * 100));
}
