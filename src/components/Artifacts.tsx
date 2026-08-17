import { useMemo, useRef, useState } from "react";
import type { SourceProfile, TargetId } from "../lib/engine";
import { TARGETS, artifactSize, fmtBytes, qrMatrix, slugify } from "../lib/engine";
import { buildCommand, downloadProjectZip } from "../lib/projects";
import { downloadHta } from "../lib/hta";
import { IconCheck, IconDownload, IconPhone, IconTerminal, IconWindows, IconZap } from "./Icons";

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
  const qr = useMemo(() => qrMatrix(window.location.href || profile.url + appName), [profile.url, appName]);
  const metas = TARGETS.filter((t) => targets.includes(t.id));
  const total = metas.reduce((s, t) => s + artifactSize(t.id, profile), 0);
  const [busy, setBusy] = useState<TargetId | null>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

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
          {metas.length} platforms · {elapsed.toFixed(1)}s · fidelity <span className="text-gold">{profile.similarity}%</span> ·{" "}
          {fmtBytes(total)} projected
        </p>
        <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-faint md:block">
          every download is runnable
        </span>
      </div>

      {/* ---------- final deliverables ---------- */}
      <div className="border-b border-line bg-ink/40 px-6 py-6">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-flare">
          ✦ final deliverables — take {slug} home today
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {/* 1 · instant windows app */}
          <div className="group border border-flare/40 bg-pane/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-flare">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-flare">
              <IconWindows size={13} /> pc · runs right now
            </p>
            <p className="mt-2 font-display text-lg font-extrabold text-paper">{slug}.hta</p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-dim">
              A genuine Windows desktop app file. Save it, <strong className="text-paper">double-click, and {slug} opens in
              its own window</strong> — video player, search, keyboard shortcuts, offline. Zero install, zero build.
            </p>
            <button
              onClick={() => downloadHta({ appName, profile, accent })}
              className="btn-notch mt-4 flex w-full items-center justify-center gap-2 bg-flare px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[#1a120c] transition-all duration-200 hover:bg-ember active:scale-[0.98]"
            >
              <IconDownload size={13} /> download windows app
            </button>
          </div>

          {/* 2 · phone app */}
          <div className="group border border-mint/40 bg-pane/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-mint">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-mint">
              <IconPhone size={13} /> mobile · real app icon
            </p>
            <p className="mt-2 font-display text-lg font-extrabold text-paper">{slug} PWA</p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-dim">
              Get the PWA project below, host the folder (Netlify Drop works), open it on your phone and hit{" "}
              <strong className="text-paper">Install</strong> — Chrome mints a real on-device app package (WebAPK) with its
              own icon.
            </p>
            <button
              onClick={() => get("pwa")}
              disabled={busy === "pwa"}
              className="btn-notch mt-4 flex w-full items-center justify-center gap-2 border border-mint/60 bg-mint/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-mint transition-all duration-200 hover:bg-mint/20 active:scale-[0.98] disabled:opacity-60"
            >
              <IconDownload size={13} /> {busy === "pwa" ? "zipping…" : "download phone app"}
            </button>
          </div>

          {/* 3 · signed binaries */}
          <div className="group border border-gold/40 bg-pane/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-gold">
              <IconZap size={13} /> signed .apk / .exe
            </p>
            <p className="mt-2 font-display text-lg font-extrabold text-paper">official toolchains</p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-dim">
              Full Capacitor (Android) and Electron (Windows) projects. Unzip, run the{" "}
              <strong className="text-paper">one command</strong> shown per row below — Gradle / electron-builder emit the
              genuine signed installer.
            </p>
            <button
              onClick={() => rowsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="btn-notch mt-4 flex w-full items-center justify-center gap-2 border border-gold/60 bg-gold/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-gold transition-all duration-200 hover:bg-gold/20 active:scale-[0.98]"
            >
              <IconTerminal size={13} /> see build rows
            </button>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 font-mono text-[10px] leading-relaxed text-faint">
          <span className="text-gold">⚠</span>
          Straight talk: a browser physically cannot compile signed .apk / .exe binaries — anyone claiming otherwise ships
          you a fake file that won't install. The .hta above is a real, working Windows app you can run today; the rows
          below produce the real signed installers through the official one-command builds.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px]">
        {/* artifact rows */}
        <div ref={rowsRef} className="scroll-mt-24 divide-y divide-line border-b border-line lg:border-b-0 lg:border-r">
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
            <p className="font-mono text-[11px] uppercase tracking-widest text-mint">scan → open this studio</p>
            <p className="mt-1 max-w-[210px] font-mono text-[10px] leading-relaxed text-faint">
              grab the forge on your phone, then use the PWA tile to install {slug} as a real app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
