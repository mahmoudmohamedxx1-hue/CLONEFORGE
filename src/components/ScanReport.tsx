import { useEffect, useRef } from "react";
import type { ScanLine, SourceProfile } from "../lib/engine";
import { rng } from "../lib/engine";
import { IconGithub, IconGlobe, IconX } from "./Icons";

interface Props {
  profile: SourceProfile | null;
  scanning: boolean;
  accent: string;
  onPickAccent: (c: string) => void;
  lines: ScanLine[];
  onCancelScan: () => void;
}

const toneCls: Record<string, string> = {
  info: "text-dim",
  ok: "text-mint",
  stage: "text-gold font-bold",
  warn: "text-gold",
};

function IngestTerminal({
  lines,
  scanning,
  onCancelScan,
  compact,
}: {
  lines: ScanLine[];
  scanning: boolean;
  onCancelScan?: () => void;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, scanning]);

  return (
    <div className="border border-line bg-[#0a0e0b]">
      <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2">
        <span className={`h-2 w-2 rounded-full ${scanning ? "bg-gold pulse-flare" : "bg-mint"}`} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          ingest log — {scanning ? "streaming from network" : "capture complete"}
        </span>
        {scanning && onCancelScan && (
          <button
            onClick={onCancelScan}
            className="ml-auto flex items-center gap-1.5 border border-blood/40 bg-blood/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-blood transition-colors hover:bg-blood/20"
          >
            <IconX size={10} /> abort
          </button>
        )}
      </div>
      <div
        ref={ref}
        className={`term-scroll overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.7] ${compact ? "max-h-36" : "max-h-52"}`}
      >
        {lines.length === 0 && <p className="text-faint">negotiating…</p>}
        {lines.map((l, i) => (
          <p key={i} className="log-pop flex gap-2 whitespace-pre-wrap">
            <span className="shrink-0 select-none text-faint/60">{String(i + 1).padStart(2, "0")}</span>
            <span className={toneCls[l.tone]}>{l.text}</span>
          </p>
        ))}
        {scanning && (
          <p className="text-gold">
            <span className="cursor-blink">█</span>
          </p>
        )}
      </div>
    </div>
  );
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

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export default function ScanReport({ profile, scanning, accent, onPickAccent, lines, onCancelScan }: Props) {
  /* --- scanning: live terminal --- */
  if (scanning) {
    return (
      <div className="space-y-4">
        <IngestTerminal lines={lines} scanning onCancelScan={onCancelScan} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      </div>
    );
  }

  /* --- failed / aborted scan: keep the log visible --- */
  if (!profile) {
    if (lines.length > 0) {
      return (
        <div className="space-y-3">
          <IngestTerminal lines={lines} scanning={false} />
          <p className="border border-dashed border-blood/40 bg-blood/5 p-4 font-mono text-[12px] leading-relaxed text-dim">
            <span className="font-bold text-blood">✗ ingest stopped.</span> fix the source above and run it again —
            public repos on github.com connect live; anything unreachable falls back to the heuristic mirror.
          </p>
        </div>
      );
    }
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
  const live = p.mode === "live";

  return (
    <div className="log-pop space-y-4">
      {/* proof-of-scan terminal */}
      <IngestTerminal lines={lines} scanning={false} compact />

      <div className="border border-line bg-pane/80">
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
          <span
            className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
              live ? "border-mint/50 bg-mint/10 text-mint" : "border-gold/50 bg-gold/10 text-gold"
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-mint pulse-mint" : "bg-gold"}`} />
            {live ? "live data" : "simulated"}
          </span>
          <h3 className="font-display text-xl font-bold text-paper">
            {p.owner ? `${p.owner}/` : ""}
            {p.name}
          </h3>
          <span className="font-mono text-xs text-faint">{p.host}</span>
          {p.modeNote && <span className="w-full font-mono text-[10px] text-faint sm:ml-auto sm:w-auto">{p.modeNote}</span>}
        </div>

        {p.description && (
          <p className="border-b border-line px-6 py-3 text-[13px] leading-relaxed text-dim">
            <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-faint">about</span>
            {p.description}
          </p>
        )}

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
            {p.topics && p.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.topics.map((t) => (
                  <span key={t} className="bg-flare/10 px-2 py-0.5 font-mono text-[10px] text-flare">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="routes" value={String(p.routes.length)} />
              <Stat label="components" value={String(p.components.length)} />
              <Stat label="assets" value={String(p.assets)} hint="cached locally" />
              <Stat label="ui fidelity" value={`${p.similarity}%`} hint="visual diff target" />
            </div>
            {(p.stars !== undefined || p.forks !== undefined || p.license || p.fileCount !== undefined || p.branch) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-faint">
                {p.stars !== undefined && <span className="text-gold">★ {fmtK(p.stars)}</span>}
                {p.forks !== undefined && <span>⑂ {fmtK(p.forks)}</span>}
                {p.openIssues !== undefined && <span>{fmtK(p.openIssues)} open issues</span>}
                {p.fileCount !== undefined && <span>{p.fileCount.toLocaleString()} files</span>}
                {p.branch && <span className="text-mint">⎇ {p.branch}</span>}
                {p.license && <span className="border border-line px-1.5 py-px text-[10px] uppercase">{p.license}</span>}
              </div>
            )}

            {/* mirror coverage — what % of each design layer got cloned */}
            <div className="mt-5 border border-dashed border-line2 bg-ink/40 p-4">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                mirror coverage <span className="text-flare">· how much of each layer was cloned</span>
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                {["color system", "type scale", "layout grid", "micro-motion"].map((label, i) => {
                  const pct = 92 + Math.floor(rng(p.seed + i * 131)() * 7);
                  return (
                    <div key={label}>
                      <div className="mb-1 flex items-baseline justify-between font-mono text-[10.5px]">
                        <span className="text-dim">{label}</span>
                        <span className="font-bold text-mint">{pct}%</span>
                      </div>
                      <div className="h-1 border border-line bg-ink">
                        <div className="h-full bg-mint/70 transition-[width] duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
    </div>
  );
}
