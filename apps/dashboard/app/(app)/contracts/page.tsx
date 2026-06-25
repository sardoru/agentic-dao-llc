import { CONTRACTS, ACCOUNTS, basescan, sourcify, CHAIN } from "../../lib/deployment";
import { CopyAddress } from "../../components/CopyAddress";

export const metadata = {
  title: "Contracts — Agentic DAO LLC",
  description:
    "The Working Committee DAO's deployed Base Sepolia contracts — verified on Basescan and Sourcify.",
};

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-accent transition-colors hover:bg-surface-3"
    >
      {children}
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 17 17 7M7 7h10v10" />
      </svg>
    </a>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success">
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Verified
    </span>
  );
}

function Row({
  name,
  address,
  role,
  verified,
}: {
  name: string;
  address: string;
  role: string;
  verified?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{name}</span>
            {verified && <VerifiedBadge />}
          </div>
          <div className="mt-1 text-xs leading-relaxed text-muted">{role}</div>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <CopyAddress address={address} />
          <ExternalLink href={basescan(address)}>Basescan</ExternalLink>
          <ExternalLink href={sourcify(address)}>Sourcify</ExternalLink>
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold text-ink">Deployed Contracts</h1>
        <p className="text-sm text-muted">
          The Working Committee DAO is live on <span className="text-ink">{CHAIN.name}</span> (chain{" "}
          {CHAIN.id}). Every contract's source is <span className="text-success">verified</span> —
          read the code on Basescan or its Sourcify mirror.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        ✓ All {CONTRACTS.length} contracts verified on Basescan (Etherscan v2 — “Pass · Verified”)
        and mirrored on Sourcify (exact-match). Don't take our word for it — read the source.
      </div>

      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        Core contracts
      </h2>
      <div className="space-y-3">
        {CONTRACTS.map((c) => (
          <Row
            key={c.address}
            name={c.name}
            address={c.address}
            role={c.role}
            verified={c.verified}
          />
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
        Key accounts
      </h2>
      <div className="space-y-3">
        {ACCOUNTS.map((a) => (
          <Row key={a.address} name={a.name} address={a.address} role={a.role} />
        ))}
      </div>

      <p className="mt-6 text-xs text-muted">
        Testnet only (Base Sepolia). Addresses are the live pilot deployment; see the repo's
        <code className="mx-1 rounded bg-surface-3 px-1 py-0.5">contracts/deployments/</code>
        records for the full set.
      </p>
    </div>
  );
}
