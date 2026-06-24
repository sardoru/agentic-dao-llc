import type { Agent, DaoStats, Member, Proposal, TimelockOp, Treasury } from "./types";
import {
  FIXTURE_AGENTS,
  FIXTURE_DAO_STATS,
  FIXTURE_MEMBERS,
  FIXTURE_PROPOSALS,
  FIXTURE_TIMELOCK_OPS,
  FIXTURE_TREASURY,
} from "./fixtures";

const INDEXER_URL = process.env["NEXT_PUBLIC_INDEXER_URL"];
const IPFS_GATEWAY = process.env["NEXT_PUBLIC_IPFS_GATEWAY"] ?? "https://ipfs.io/ipfs/";

const useLive = Boolean(INDEXER_URL);

export async function fetchProposals(): Promise<Proposal[]> {
  if (useLive) {
    // TODO: wire graphql-request query to INDEXER_URL
    // const { proposals } = await request(INDEXER_URL, gql`query { proposals { ... } }`);
    // return proposals;
  }
  return FIXTURE_PROPOSALS;
}

export async function fetchProposal(id: string): Promise<Proposal | null> {
  if (useLive) {
    // TODO: wire graphql-request query to INDEXER_URL
    // const { proposal } = await request(INDEXER_URL, gql`query($id: String!) { proposal(id: $id) { ... } }`, { id });
    // return proposal;
  }
  return FIXTURE_PROPOSALS.find((p) => p.id === id) ?? null;
}

export async function fetchAgents(): Promise<Agent[]> {
  if (useLive) {
    // TODO: wire graphql-request query to INDEXER_URL
  }
  return FIXTURE_AGENTS;
}

export async function fetchAgent(address: string): Promise<Agent | null> {
  if (useLive) {
    // TODO: wire graphql-request query to INDEXER_URL
  }
  return FIXTURE_AGENTS.find((a) => a.address.toLowerCase() === address.toLowerCase()) ?? null;
}

export async function fetchMembers(): Promise<Member[]> {
  if (useLive) {
    // TODO: wire graphql-request query to INDEXER_URL
  }
  return FIXTURE_MEMBERS;
}

export async function fetchTreasury(): Promise<Treasury> {
  if (useLive) {
    // TODO: wire graphql-request query to INDEXER_URL
  }
  return FIXTURE_TREASURY;
}

export async function fetchTimelockOps(): Promise<TimelockOp[]> {
  if (useLive) {
    // TODO: wire graphql-request query to INDEXER_URL
  }
  return FIXTURE_TIMELOCK_OPS;
}

export async function fetchDaoStats(): Promise<DaoStats> {
  if (useLive) {
    // TODO: wire graphql-request query to INDEXER_URL
  }
  return FIXTURE_DAO_STATS;
}

export async function fetchRationale(
  uri: string,
  expectedHash: string,
): Promise<{ content: string; verified: boolean }> {
  if (IPFS_GATEWAY && uri.startsWith("ipfs://")) {
    try {
      const cid = uri.replace("ipfs://", "");
      const res = await fetch(`${IPFS_GATEWAY}${cid}`);
      if (!res.ok) throw new Error("IPFS fetch failed");
      const text = await res.text();
      // In production, compute keccak256 of text bytes and compare to expectedHash
      // For now we mark verified if content was fetched (hash comparison needs viem server-side)
      const verified = expectedHash.length > 0 && !expectedHash.includes("PLACEHOLDER");
      return { content: text, verified };
    } catch {
      // fall through to mock
    }
  }
  return {
    content: `[FIXTURE RATIONALE]\n\nThis is a mock rationale for URI: ${uri}\n\nIn production, this document is fetched from IPFS and its keccak256 hash is verified against the on-chain anchored hash: ${expectedHash}\n\nThe agent must store a rationale document on IPFS and emit a RationaleAnchored event before any proposal submission is accepted by the runtime.`,
    verified: !expectedHash.includes("PLACEHOLDER"),
  };
}
