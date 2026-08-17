import { useMemo, useState } from "react";
import type { SourceProfile, TargetId } from "../lib/engine";
import { TARGETS, artifactSize, fmtBytes, qrMatrix, slugify } from "../lib/engine";
import { buildCommand, downloadProjectZip } from "../lib/projects";
import { IconCheck, IconDownload, IconTerminal } from "./Icons";

interface Props {
  profile: SourceProfile;
  targets: TargetId[];
  appName: string;
  version: string;
  accent: string;
  elapsed: number;
}

export default function Artifacts({ profile, targets, appName, version, accent, elapsed }: Props) {
  const slug = slugify(appName);
  const qr = useMemo(() => qrMatrix(profile.url + appName), [profile.url, appName]);
  const metas = TARGETS.filter((t) => targets.includes(t.id));
  const total = metas.reduce((s, t) => s + artifactSize(t.id, profile), 0);
  const [busy, setBusy] = useState<TargetId | null>(null);

  const get = async (t: TargetId) => {
    setBusy(t);
    try {
      await downloadProjectZip(t, { appName, profile, version, accent });
    } finally {
      setTimeout(() => setBusy(null), 600);
    }
  };

  return (
    <div className="border border-line bg-pane/80">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-6 py-4">
        <span className="flex items-center gap-2 border border-mint/40 bg-mint/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-mint">
          <IconCheck size={12} /> build succeeded
        </span>
        <p className="font-mono text-[11px] text-dim">
          {metas.length} platforms · {elapsed.toFixed(1)}s · fidelity <span className="text-gold">{profile.similarity}%</span>
        </p>
        <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-faint md:block">
          downloads are real project zips
        </span>
      </div>

      {/* honesty banner */}
      <div className="border-b border-gold/30 bg-gold/8 px-6 py-3">
        <p className="flex items-start gap-2 font-mono text-[11px] leading-relaxed text-gold">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>
            <strong className="font-bold">Real, runnable projects — not fake binaries.</strong> Each download is a complete
            project that the official toolchain compiles into a genuine, signed installer with{" "}
            <strong className="font-bold">one command</strong> (shown under each row). A browser can't legally mint signed
            .apk/.exe binaries, so we hand you the exact working build instead — this is the honest, actually-functional path.
          </span>
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px]">
        {/* artifact rows */}
        <div className="divide-y divide-line border-b border-line lg:border-b-0 lg:border-r">
          {metas.map((t, i) => {
            const size = artifactSize(t.id, profile);
            return (
              <div
                key={t.id}
                className="log-pop group px-6 py-4 transition-colors duration-200 hover:bg-pane2/70"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-ink/60 font-mono text-[10px] font-bold uppercase text-dim transition-colors group-hover:border-line2 group-hover:text-paper">
                    .{t.ext.slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] text-paper">
                      {slug}-v{version}-{t.id}
                      <span className="text-flare">.zip</span>
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-mint">→ {t.ext}</span>
                    </p>
                    <p className="font-mono text-[10px] text-faint">
                      {t.arch} · {t.shell}
                    </p>
                  </div>
                  <span className="hidden font-mono text-[11px] text-gold sm:block">{fmtBytes(size)}</span>
                  <button
                    onClick={() => get(t.id)}
                    disabled={busy === t.id}
                    className="btn-notch flex items-center gap-2 bg-flare px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#1a120c] transition-all duration-200 hover:bg-ember hover:pl-5 active:scale-95 disabled:opacity-60"
                  >
                    <IconDownload size={13} /> {busy === t.id ? "zipping…" : "get project"}
                  </button>
                </div>
                <p className="mt-2.5 flex items-center gap-2 overflow-x-auto border-l-2 border-line2 pl-3 font-mono text-[11px] text-dim">
                  <IconTerminal size={12} className="shrink-0 text-flare" />
                  <span className="whitespace-nowrap">
                    <span className="text-faint">$</span> {buildCommand(t.id)}
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        {/* QR card */}
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div className="border-4 border-line2 bg-paper p-3 shadow-[0_16px_40px_-16px_rgba(255,109,59,0.35)] transition-transform duration-300 hover:rotate-1 hover:scale-105">
            <svg width="130" height="130" viewBox={`0 0 ${qr.length} ${qr.length}`} shapeRendering="crispEdges">
              {qr.map((row, y) =>
                row.map((on, x) =>
                  on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0c110e" /> : null,
                ),
              )}
            </svg>
          </div>
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-widest text-mint">scan → open web app</p>
            <p className="mt-1 max-w-[200px] font-mono text-[10px] leading-relaxed text-faint">
              the PWA zip works instantly on any phone or PC — install it to the home screen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
