import { useState } from "react";
import type { Kind } from "../lib/engine";
import { IconForge, IconGithub, IconGlobe, IconScan } from "./Icons";

export interface Sample {
  label: string;
  url: string;
  kind: Kind;
}

export const SAMPLES: Sample[] = [
  { label: "vercel/next.js", url: "github.com/vercel/next.js", kind: "repo" },
  { label: "shadcn/ui", url: "github.com/shadcn-ui/ui", kind: "repo" },
  { label: "tailwindcss", url: "github.com/tailwindlabs/tailwindcss", kind: "repo" },
  { label: "stripe.com", url: "stripe.com", kind: "website" },
  { label: "linear.app", url: "linear.app", kind: "website" },
  { label: "notion.so", url: "notion.so", kind: "website" },
];

interface Props {
  kind: Kind;
  setKind: (k: Kind) => void;
  url: string;
  setUrl: (u: string) => void;
  onForge: (auto?: string, kind?: Kind) => void;
  scanning: boolean;
  error: string | null;
}

export default function ConsoleInput({ kind, setKind, url, setUrl, onForge, scanning, error }: Props) {
  const [shaking, setShaking] = useState(false);

  const submit = () => {
    if (error) {
      setShaking(true);
      setTimeout(() => setShaking(false), 450);
      return;
    }
    onForge();
  };

  return (
    <div
      className={`card-notch border border-line bg-pane/90 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.8)] ${
        shaking ? "shake" : ""
      }`}
    >
      {/* header strip */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
          <span className="inline-block h-2 w-2 bg-flare" />
          source feed
        </div>
        <div className="flex overflow-hidden rounded-md border border-line font-mono text-[11px] uppercase tracking-widest">
          {(["website", "repo"] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors duration-200 ${
                kind === k
                  ? k === "repo"
                    ? "bg-mint/15 text-mint"
                    : "bg-flare/15 text-flare"
                  : "text-faint hover:text-dim"
              }`}
            >
              {k === "repo" ? <IconGithub size={13} /> : <IconGlobe size={13} />}
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* input */}
      <div className="px-5 pb-2 pt-5">
        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
          {kind === "repo" ? "public repository url" : "website url"}
        </label>
        <div className="flex items-center gap-2 border-b-2 border-line2 pb-2 transition-colors focus-within:border-flare">
          <span className="font-mono text-flare">❯</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={kind === "repo" ? "github.com/owner/repo" : "example.com"}
            spellCheck={false}
            autoCapitalize="off"
            className="w-full bg-transparent font-mono text-[15px] text-paper placeholder:text-faint/70 focus:outline-none"
          />
          {url && !scanning && (
            <button
              onClick={() => setUrl("")}
              className="font-mono text-[11px] uppercase tracking-widest text-faint transition-colors hover:text-blood"
            >
              clr
            </button>
          )}
        </div>
        {error && (
          <p className="log-pop mt-2 flex items-center gap-1.5 font-mono text-xs text-blood">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blood" /> {error}
          </p>
        )}
      </div>

      {/* forge button */}
      <div className="px-5 pb-5 pt-3">
        <button
          onClick={submit}
          disabled={scanning}
          className="btn-notch group flex w-full items-center justify-between bg-flare px-5 py-4 text-left transition-all duration-200 hover:bg-ember hover:pl-7 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
        >
          <span className="font-display text-lg font-extrabold uppercase tracking-wide text-[#1a120c]">
            {scanning ? (
              <span className="flex items-center gap-2">
                <IconScan size={20} className="animate-spin" />
                Scanning source…
              </span>
            ) : (
              "Clone & Forge"
            )}
          </span>
          {!scanning && (
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#1a120c]/70 transition-transform duration-200 group-hover:translate-x-1">
              ⏎ run
            </span>
          )}
        </button>
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] leading-relaxed text-faint">
          <IconForge size={12} className="shrink-0 text-mint" />
          mirrors the UI, adapts layouts, packages mobile + desktop shells
        </p>
      </div>

      {/* samples */}
      <div className="border-t border-line px-5 py-4">
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">try a known source</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.url}
              disabled={scanning}
              onClick={() => onForge(s.url, s.kind)}
              className="group flex items-center gap-1.5 border border-line bg-ink/60 px-2.5 py-1.5 font-mono text-[11px] text-dim transition-all duration-200 hover:border-line2 hover:bg-pane2 hover:text-paper disabled:opacity-50"
            >
              {s.kind === "repo" ? (
                <IconGithub size={12} className="text-mint transition-colors group-hover:text-mint" />
              ) : (
                <IconGlobe size={12} className="text-flare transition-colors group-hover:text-flare" />
              )}
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
