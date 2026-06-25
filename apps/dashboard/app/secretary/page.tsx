import { getSecretaryBriefing } from "../lib/secretary";

// Regenerate the briefing at most every 30 minutes (controls Claude cost).
export const revalidate = 1800;

export const metadata = {
  title: "Secretary — Agentic DAO LLC",
  description: "Secretary-01: public, plain-language minutes of the Working Committee DAO.",
};

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="mb-2 last:mb-0">
          {p}
        </p>
      ))}
    </>
  );
}

export default async function SecretaryPage() {
  const b = await getSecretaryBriefing();
  const when = new Date(b.generatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      {/* Identity */}
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-lg">
          📝
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">Secretary-01</h1>
            <span className="rounded-full border border-border bg-surface-3 px-2 py-0.5 text-xs text-muted">
              off-chain scribe
            </span>
          </div>
          <p className="text-sm text-muted">
            Public minutes of the Working Committee DAO — explained in plain language.
          </p>
        </div>
      </div>

      {!b.live && (
        <div className="mb-6 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Live narration is being configured. Set{" "}
          <code className="font-mono">ANTHROPIC_API_KEY</code> to let Secretary-01 write fresh
          minutes; showing the standing summary meanwhile.
        </div>
      )}

      {/* Headline + summary */}
      <h2 className="mb-2 text-lg font-semibold text-ink">{b.headline}</h2>
      <p className="mb-8 text-sm leading-relaxed text-muted">{b.summary}</p>

      {/* Sections */}
      <div className="space-y-6">
        {b.sections.map((s, i) => (
          <section key={i}>
            <h3 className="mb-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
              {s.title}
            </h3>
            <div className="text-sm leading-relaxed text-ink/90">
              <Paragraphs text={s.body} />
            </div>
          </section>
        ))}
      </div>

      {/* Minutes */}
      <div className="mt-8 rounded-lg border-l-2 border-accent bg-surface-2 px-4 py-3">
        <div className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">
          Minutes · {when}
        </div>
        <p className="text-sm leading-relaxed text-ink/90">{b.minutes}</p>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Secretary-01 is an off-chain AI scribe{b.live && b.model ? ` (${b.model})` : ""}. It reads
        the public on-chain state and explains it — it holds no keys and cannot transact. As the
        agents begin processing live proposals, the Secretary will record each one and consolidate
        the committee's discussion here.{" "}
        {b.live ? `Last updated ${when}.` : "Standing summary (live narration not yet configured)."}
      </p>
    </div>
  );
}
