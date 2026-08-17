import type { SourceProfile } from "../lib/engine";
import { IconGithub, IconGlobe } from "./Icons";

const SCAN_STEPS = [
  "resolving host…",
  "fetching entry document…",
  "crawling route graph…",
  "extracting component tree…",
  "sampling color palette…",
  "fingerprinting stack…",
];

interface Props {
  profile: SourceProfile | null;
  scanning: boolean;
  accent: string;
  onPickAccent: (c: string) => void;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-line bg-ink/50 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold leading-none text-paper">{value}</p>
      {hint && <p className="mt-1 font-mono text-[10px] text-mint">{hint}</p>}
    </div>
  );
}

export default function ScanReport({ profile, scanning, accent, onPickAccent }: Props) {
  if (scanning) {
    return (
      <div className="border border-line bg-pane/70 p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
          </span>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">ingesting source</p>
        </div>
        <div className="grid gap-2">
          {SCAN_STEPS.map((s, i) => (
            <div key={s} className="log-pop flex items-center gap-3" style={{ animationDelay: `${i * 0.24}s` }}>
              <span className="font-mono text-[11px] text-faint">[{String(i + 1).padStart(2, "0")}]</span>
              <span className="flex-1 font-mono text-[13px] text-dim">{s}</span>
              <span className="skeleton h-2.5 w-24" />
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[220px] flex-col items-start justify-center border border-dashed border-line2 bg-ink/40 p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">scan report</p>
        <p className="mt-3 max-w-md font-mono text-sm leading-relaxed text-dim">
          <span className="text-flare">◇</span> nothing ingested yet. feed the forge a public repo or a live
          website and the route graph, component tree and palette will be mapped here.
        </p>
        <div className="mt-5 flex gap-2">
          {[38, 24, 30, 18].map((w, i) => (
            <span key={i} className="h-2 border border-line2" style={{ width: w * 2 }} />
          ))}
        </div>
      </div>
    );
  }

  const p = profile;
  const swatches = [p.palette.accent, p.palette.support, p.palette.ink, p.palette.paper];

  return (
    <div className="log-pop border border-line bg-pane/80">
      {/* header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-6 py-4">
        <span
          className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
            p.kind === "repo" ? "border-mint/40 bg-mint/10 text-mint" : "border-flare/40 bg-flare/10 text-flare"
          }`}
        >
          {p.kind === "repo" ? <IconGithub size={11} /> : <IconGlobe size={11} />}
          {p.kind}
        </span>
        <h3 className="font-display text-xl font-bold text-paper">{p.name}</h3>
        <span className="font-mono text-xs text-faint">{p.host}</span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[11px] text-mint">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-mint pulse-mint" />
          mirror locked
        </span>
      </div>

      <div className="grid gap-px bg-line lg:grid-cols-[1.2fr_1fr_1fr]">
        {/* stack + stats */}
        <div className="bg-pane p-6">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">detected stack</p>
          <div className="flex flex-wrap gap-2">
            {p.stack.map((s, i) => (
              <span
                key={s}
                className="log-pop border border-line2 bg-ink/60 px-2.5 py-1 font-mono text-xs text-paper"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {s}
              </span>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="routes" value={String(p.routes.length)} />
            <Stat label="components" value={String(p.components.length)} />
            <Stat label="assets" value={String(p.assets)} hint="cached locally" />
            <Stat label="ui fidelity" value={`${p.similarity}%`} hint="visual diff target" />
          </div>
          {(p.stars !== undefined || p.license) && (
            <p className="mt-4 font-mono text-[11px] text-faint">
              {p.stars !== undefined && (
                <span className="text-gold">★ {(p.stars / 1000).toFixed(1)}k</span>
              )}
              {p.stars !== undefined && p.license && <span className="mx-2">·</span>}
              {p.license && <span>license {p.license}</span>}
            </p>
          )}
        </div>

        {/* routes */}
        <div className="bg-pane p-6">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">route graph</p>
          <ul>
            {p.routes.map((r, i) => (
              <li
                key={r}
                className="log-pop group flex items-center justify-between border-b border-line/60 py-2 font-mono text-[13px] text-dim transition-colors hover:text-paper"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span>
                  <span className="mr-2 text-faint transition-colors group-hover:text-flare">→</span>
                  {r}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-faint opacity-0 transition-opacity group-hover:opacity-100">
                  mapped
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* components + palette */}
        <div className="bg-pane p-6">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">component tree</p>
          <div className="flex flex-wrap gap-1.5">
            {p.components.map((c) => (
              <span key={c} className="bg-ink/60 px-2 py-0.5 font-mono text-[11px] text-mint">
                ⟨{c}⟩
              </span>
            ))}
          </div>
          <p className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            extracted palette <span className="text-flare">— tap to set app accent</span>
          </p>
          <div className="flex gap-2">
            {swatches.map((c) => (
              <button
                key={c}
                title={`Set accent to ${c}`}
                onClick={() => onPickAccent(c)}
                className={`h-10 flex-1 border transition-all duration-200 hover:scale-y-110 ${
                  accent === c ? "border-paper ring-2 ring-flare ring-offset-2 ring-offset-pane" : "border-line2"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
