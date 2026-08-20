import { useMemo, useState } from "react";
import { downloadScaffoldZip, scaffoldFiles } from "../lib/scaffold";
import { slugify } from "../lib/engine";
import { IconBox, IconCheck, IconDownload, IconTerminal } from "./Icons";

interface Props {
  appName: string;
  sourceUrl: string;
}

const AUDIT_MAP: { point: string; status: string }[] = [
  { point: "#2 App foundation — Next App Router, TS, Tailwind, shadcn-style, states", status: "in scaffold" },
  { point: "#3 Core clone workflow — 10 steps modeled + rendered with live states", status: "in scaffold" },
  { point: "#10 DX — package.json, tsconfig, tailwind/eslint, env example, README", status: "in scaffold" },
  { point: "#4 Backend — domain types ready; add Neon + data layer next", status: "follow-on" },
  { point: "#5–#9 Auth, AI pipeline, reliability, security, testing", status: "follow-on" },
];

export default function FoundationPanel({ appName, sourceUrl }: Props) {
  const repo = slugify(appName || "netstream");
  const files = useMemo(() => scaffoldFiles({ repoName: repo }), [repo]);
  const [zipping, setZipping] = useState(false);

  const get = async () => {
    setZipping(true);
    try {
      await downloadScaffoldZip({ repoName: repo });
    } finally {
      setTimeout(() => setZipping(false), 600);
    }
  };

  return (
    <div className="border border-line bg-pane/80">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
        <span className="flex items-center gap-2 border border-flare/50 bg-flare/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-flare">
          <IconBox size={13} /> foundation forger
        </span>
        <p className="font-mono text-[11px] text-dim">
          your repo audit says the next step is a real foundation — here it is, ready to push
        </p>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr]">
        {/* file tree */}
        <div className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-line/70 px-5 py-2.5">
            <IconTerminal size={13} className="text-mint" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
              {repo}-foundation · {files.length} files
            </span>
          </div>
          <ul className="max-h-[300px] overflow-y-auto p-2">
            {files.map((f) => {
              const depth = f.path.split("/").length - 1;
              const name = f.path.split("/").pop();
              return (
                <li
                  key={f.path}
                  title={f.note}
                  className="group flex cursor-default items-center gap-2 rounded px-2 py-1 font-mono text-[11.5px] text-dim transition-colors hover:bg-pane2/80 hover:text-paper"
                  style={{ paddingLeft: 8 + depth * 14 }}
                >
                  <span className="text-faint group-hover:text-mint">▸</span>
                  <span className="truncate">{name}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* description + audit + actions */}
        <div className="flex flex-col gap-5 p-6">
          <div>
            <h3 className="font-display text-xl font-extrabold uppercase tracking-tight text-paper">
              The professional foundation, <span className="text-flare">generated</span>
            </h3>
            <p className="mt-2 font-mono text-[12px] leading-relaxed text-dim">
              Your repo is currently an empty starter (a README + Vercel metadata), which is why the scan had nothing real
              to mirror. This ZIP is the audit's prescribed next step: a <strong className="text-paper">runnable Next.js 14
              App Router + TypeScript + Tailwind + shadcn-style project</strong> with the 10-step clone workflow wired as a
              working seed and clear empty/loading/error/success states. Unzip into the repo and run{" "}
              <code className="border border-line bg-ink px-1.5 py-0.5 text-mint">npm run dev</code>.
            </p>
          </div>

          <ul className="space-y-1.5">
            {AUDIT_MAP.map((a) => (
              <li key={a.point} className="flex items-start gap-2 font-mono text-[11px] leading-relaxed">
                <span className={a.status === "in scaffold" ? "mt-0.5 text-mint" : "mt-0.5 text-gold"}>
                  {a.status === "in scaffold" ? <IconCheck size={12} /> : "○"}
                </span>
                <span className="text-dim">
                  {a.point}
                  <span className={a.status === "in scaffold" ? "ml-2 text-mint" : "ml-2 text-gold"}>· {a.status}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button
              onClick={get}
              disabled={zipping}
              className="btn-notch flex items-center gap-2 bg-flare px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[#1a120c] transition-all duration-200 hover:bg-ember hover:pl-6 active:scale-95 disabled:opacity-60"
            >
              <IconDownload size={14} /> {zipping ? "zipping…" : "download foundation (.zip)"}
            </button>
            <p className="min-w-0 flex-1 font-mono text-[10px] leading-relaxed text-faint">
              cloned from <span className="text-dim">{sourceUrl}</span> · unzip → <span className="text-mint">npm i && npm run dev</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
