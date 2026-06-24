export function MandateHashWarning({ mismatch }: { mismatch: boolean }) {
  if (!mismatch) return null;
  return (
    <div className="flex items-start gap-2 bg-warn/10 border border-warn/40 rounded px-3 py-2.5 text-warn text-xs font-mono">
      <span className="font-bold shrink-0">⚠ MANDATE HASH MISMATCH</span>
      <span className="text-warn/80">
        — on-chain hash does not match the fetched mandate document. Agent actions may be unauthorized.
      </span>
    </div>
  );
}
