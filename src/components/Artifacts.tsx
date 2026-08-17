import { useMemo } from "react";
import type { SourceProfile, TargetId } from "../lib/engine";
import { TARGETS, artifactSize, downloadManifest, fmtBytes, qrMatrix, slugify } from "../lib/engine";
import { IconBox, IconCheck, IconDownload } from "./Icons";

interface Props {
  profile: SourceProfile;
  targets: TargetId[];
  appName: string;
  version: string;
  elapsed: number;
}

export default function Artifacts({ profile, targets, appName, version, elapsed }: Props) {
  const slug = slugify(appName);
  const qr = useMemo(() => qrMatrix(profile.url + appName), [profile.url, appName]);
  const metas = TARGETS.filter((t) => targets.includes(t.id));
  const total = metas.reduce((s, t) => s + artifactSize(t.id, profile), 0);

  return (
    <div className="border border-line bg-pane/80">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-6 py-4">
        <span className="flex items-center gap-2 border border-mint/40 bg-mint/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-mint">
          <IconCheck size={12} /> build succeeded
        </span>
        <p className="font-mono text-[11px] text-dim">
          {metas.length} artifacts · {fmtBytes(total)} · {elapsed.toFixed(1)}s · fidelity{" "}
          <span className="text-gold">{profile.similarity}%</span>
        </p>
        <button
          onClick={() => downloadManifest({ appName, profile, targets, version })}
          className="ml-auto flex items-center gap-2 border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-dim transition-all duration-200 hover:border-mint/50 hover:text-mint"
        >
          <IconBox size={13} /> all manifests (.json)
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px]">
        {/* artifact rows */}
        <div className="divide-y divide-line border-b border-line lg:border-b-0 lg:border-r">
          {metas.map((t, i) => {
            const size = artifactSize(t.id, profile);
            return (
              <div
                key={t.id}
                className="log-pop group flex items-center gap-4 px-6 py-4 transition-colors duration-200 hover:bg-pane2/70"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-ink/60 font-mono text-[10px] font-bold uppercase text-dim transition-colors group-hover:border-line2 group-hover:text-paper">
                  .{t.ext.slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px] text-paper">
                    {slug}-{version}-{t.id}
                    <span className="text-flare">.{t.ext}</span>
                  </p>
                  <p className="font-mono text-[10px] text-faint">
                    {t.arch} · {t.shell}
                  </p>
                </div>
                <span className="hidden font-mono text-[11px] text-gold sm:block">{fmtBytes(size)}</span>
                <span className="hidden font-mono text-[10px] uppercase tracking-widest text-faint md:block">
                  sha {((profile.seed ^ t.id.length * 2654435761) >>> 0).toString(16).slice(0, 8)}
                </span>
                <button
                  onClick={() => downloadManifest({ appName, profile, targets, version, target: t.id })}
                  className="btn-notch flex items-center gap-2 bg-flare px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#1a120c] transition-all duration-200 hover:bg-ember hover:pl-5 active:scale-95"
                >
                  <IconDownload size={13} /> get
                </button>
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
            <p className="font-mono text-[11px] uppercase tracking-widest text-mint">scan → install on device</p>
            <p className="mt-1 max-w-[200px] font-mono text-[10px] leading-relaxed text-faint">
              sideload link for {slug}-{version}-android.apk (demo pattern)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
