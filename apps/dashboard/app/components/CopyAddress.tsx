"use client";

import { useState } from "react";
import { formatAddress } from "../lib/utils";

export function CopyAddress({ address, full = false }: { address: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : `Copy ${address}`}
      className="inline-flex items-center gap-1.5 rounded bg-surface-3 px-2 py-1 font-mono text-xs text-ink transition-colors hover:bg-surface-2"
    >
      <span className={full ? "break-all" : ""}>{full ? address : formatAddress(address)}</span>
      {copied ? (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
