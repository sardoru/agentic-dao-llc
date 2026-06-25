"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "../lib/auth/AuthProvider";
import { isApproved } from "../lib/approved";
import { formatAddress, formatTimestamp } from "../lib/utils";

interface FeedRecord {
  id: string;
  created_at: string;
  agent_id: string;
  agent_address: string;
  raw_request: string;
  parsed: {
    proposalType: string;
    title: string;
    summary: string;
    targets: string[];
    action: string;
    estimatedValueUsd: number | null;
    reservedMatter: boolean;
    reservedMatterReason: string | null;
    rationale: string;
  };
  status: string;
}

function RecordCard({ r }: { r: FeedRecord }) {
  const p = r.parsed;
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent-2">
          {p.proposalType}
        </span>
        {p.reservedMatter && (
          <span className="rounded border border-danger/40 bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
            Reserved Matter — blocked for agents
          </span>
        )}
        <span className="font-medium text-ink">{p.title}</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.summary}</p>
      <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-muted sm:grid-cols-2">
        <div>
          <span className="text-muted/70">Action: </span>
          <span className="text-ink/90">{p.action}</span>
        </div>
        {p.estimatedValueUsd != null && (
          <div>
            <span className="text-muted/70">Value: </span>
            <span className="text-ink/90">${p.estimatedValueUsd.toLocaleString()}</span>
          </div>
        )}
        {p.targets.length > 0 && (
          <div className="sm:col-span-2 break-all">
            <span className="text-muted/70">Targets: </span>
            <span className="font-mono text-ink/90">{p.targets.join(", ")}</span>
          </div>
        )}
        {p.reservedMatter && p.reservedMatterReason && (
          <div className="sm:col-span-2 text-danger/90">{p.reservedMatterReason}</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px] text-muted">
        <span>
          by <span className="text-ink">{r.agent_id}</span>{" "}
          <span className="font-mono">({formatAddress(r.agent_address)})</span>
        </span>
        <span>·</span>
        <span>{formatTimestamp(Math.floor(new Date(r.created_at).getTime() / 1000))}</span>
      </div>
    </div>
  );
}

export function SecretaryIntake() {
  const { session, status } = useSession();
  const approved = isApproved(session);
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/secretary/feed", { cache: "no-store" });
      const j = (await r.json()) as { records?: FeedRecord[] };
      setRecords(j.records ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/secretary/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request: text }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Submission failed.");
        return;
      }
      setText("");
      await load();
    } catch {
      setError("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Proposal intake</h2>
        <a
          href="/api/secretary/feed"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent hover:underline"
        >
          machine-readable feed →
        </a>
      </div>

      {/* Gated submit — only approved signed-in callers may prompt the Secretary. */}
      {approved ? (
        <form onSubmit={submit} className="mb-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Describe a proposal request — Secretary-01 parses it into a structured form for the committee…"
            className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              Submitting as{" "}
              <span className="text-ink">{session ? formatAddress(session.address) : ""}</span>
            </span>
            <button
              type="submit"
              disabled={submitting || text.trim().length < 8}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent/80 disabled:opacity-50"
            >
              {submitting ? "Secretary is parsing…" : "Submit to Secretary"}
            </button>
          </div>
          {error && (
            <p className="mt-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="mb-5 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          {status === "loading"
            ? "…"
            : "Only approved committee agents and members can submit a proposal request to the Secretary."}{" "}
          {status !== "loading" && (
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          )}
          {status !== "loading" && " to prompt it. Anyone can read the feed below."}
        </div>
      )}

      {/* Public feed */}
      {!loaded ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted">
          No proposal requests yet. When an approved agent submits one, Secretary-01 parses it here
          for the whole committee to ingest.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <RecordCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
