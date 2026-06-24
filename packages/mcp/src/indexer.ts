/** Minimal fetch-shaped transport so the indexer client is unit-testable. */
export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

/** A proposal row as the indexer serves it (decoded + joined; see build spec §10). */
export interface ProposalView {
  proposalId: string;
  state: string;
  proposer: string;
  principal?: string;
  targets: string[];
  values: string[];
  calldatas: string[];
  description: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorum: string;
  snapshot?: string;
  deadline?: string;
  timelockEta?: string;
  rationaleURI?: string;
  rationaleHash?: string;
}

export interface QuorumStatus {
  proposalId: string;
  quorumReached: boolean;
  quorum: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
}

/** Raised when the indexer is unreachable or errors — surfaced to the agent, never a crash. */
export class IndexerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexerUnavailableError";
  }
}

export interface IndexerClientConfig {
  baseUrl: string;
  fetchImpl?: FetchLike;
}

/**
 * Small read client over the Ponder indexer's HTTP/JSON surface. All reads in the
 * MCP server come from here; if the indexer is unreachable, callers get an
 * {@link IndexerUnavailableError} with a clear message rather than an unhandled
 * rejection (build spec §11: "if unreachable, return a clear error — don't crash").
 */
export class IndexerClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(cfg: IndexerClientConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, "");
    const f = cfg.fetchImpl ?? (globalThis.fetch as unknown as FetchLike | undefined);
    if (!f) throw new Error("IndexerClient: no fetch implementation available");
    this.fetchImpl = f;
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let res;
    try {
      res = await this.fetchImpl(url, { method: "GET", headers: { Accept: "application/json" } });
    } catch (err) {
      throw new IndexerUnavailableError(`Indexer unreachable at ${url}: ${(err as Error).message}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new IndexerUnavailableError(
        `Indexer returned HTTP ${res.status} for ${url} ${text}`.trim(),
      );
    }
    return (await res.json()) as T;
  }

  listProposals(state?: string): Promise<ProposalView[]> {
    const q = state ? `?state=${encodeURIComponent(state)}` : "";
    return this.get<ProposalView[]>(`/proposals${q}`);
  }

  getProposal(proposalId: string): Promise<ProposalView> {
    return this.get<ProposalView>(`/proposals/${encodeURIComponent(proposalId)}`);
  }

  getQuorumStatus(proposalId: string): Promise<QuorumStatus> {
    return this.get<QuorumStatus>(`/proposals/${encodeURIComponent(proposalId)}/quorum`);
  }
}

/** Resolve the indexer base URL from env (INDEXER_URL wins, then NEXT_PUBLIC_INDEXER_URL). */
export function indexerUrlFromEnv(env: {
  INDEXER_URL?: string;
  NEXT_PUBLIC_INDEXER_URL?: string;
}): string {
  return env.INDEXER_URL ?? env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:42069";
}
