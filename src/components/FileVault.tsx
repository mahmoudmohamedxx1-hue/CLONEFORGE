import { useEffect, useMemo, useState } from "react";
import type { SourceProfile } from "../lib/engine";
import { downloadVaultZip, vaultFiles } from "../lib/vault";
import { copyText, saveText } from "../lib/save";
import { IconBox, IconCheck, IconDownload, IconX } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  appName: string;
  profile: SourceProfile;
  version: string;
  accent: string;
}

export default function FileVault({ open, onClose, appName, profile, version, accent }: Props) {
  const files = useMemo(() => vaultFiles({ appName, profile, version, accent }), [appName, profile, version, accent]);
  const [active, setActive] = useState(0);
  const [flash, setFlash] = useState<"" | "copied" | "saved" | "blocked">("");

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  if (!open) return null;
  const file = files[Math.min(active, files.length - 1)];
  const fname = file.path.split("/").pop() ?? file.path;
  const kb = (file.content.length / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button aria-label="close" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/85 backdrop-blur-sm" />
      <div className="log-pop relative flex h-[min(80vh,660px)] w-full max-w-5xl flex-col border border-line2 bg-ink shadow-[0_60px_120px_-30px_rgba(0,0,0,0.95)]">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <span className="flex h-8 w-8 items-center justify-center bg-mint/15 text-mint">
            <IconBox size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold uppercase tracking-tight text-paper">Forge vault</p>
            <p className="truncate font-mono text-[10px] text-faint">
              every generated file, live — copy or save even if this frame blocks downloads
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border border-line text-dim transition-colors hover:border-blood/60 hover:text-blood"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[250px_1fr]">
          {/* file list */}
          <div className="overflow-y-auto border-b border-line md:border-b-0 md:border-r">
            {files.map((f, i) => (
              <button
                key={f.path}
                onClick={() => setActive(i)}
                className={`block w-full border-l-2 px-4 py-3 text-left transition-all duration-150 ${
                  i === active
                    ? "border-flare bg-flare/8"
                    : "border-transparent hover:border-line2 hover:bg-pane2/60"
                }`}
              >
                <p className={`truncate font-mono text-[12px] ${i === active ? "text-flare" : "text-paper"}`}>{f.path}</p>
                <p className="truncate font-mono text-[10px] text-faint">{f.note}</p>
              </button>
            ))}
          </div>

          {/* viewer */}
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="truncate font-mono text-[12px] text-paper">{file.path}</span>
              <span className="font-mono text-[10px] text-faint">{kb} kB · utf-8</span>
              <span className="ml-auto flex items-center gap-2">
                <button
                  onClick={async () => setFlash((await copyText(file.content)) ? "copied" : "blocked")}
                  className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-200 active:scale-95 ${
                    flash === "copied"
                      ? "border-mint/60 bg-mint/15 text-mint"
                      : "border-line text-dim hover:border-mint/50 hover:text-mint"
                  }`}
                >
                  {flash === "copied" ? <IconCheck size={12} /> : null}
                  {flash === "copied" ? "copied ✓" : "copy"}
                </button>
                <button
                  onClick={() => setFlash(saveText(fname, file.content) ? "saved" : "blocked")}
                  className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-200 active:scale-95 ${
                    flash === "saved"
                      ? "border-mint/60 bg-mint/15 text-mint"
                      : "border-line text-dim hover:border-flare/60 hover:text-flare"
                  }`}
                >
                  <IconDownload size={12} />
                  {flash === "saved" ? "saved ✓" : "save file"}
                </button>
              </span>
            </div>
            <pre className="term-scroll min-h-0 flex-1 overflow-auto whitespace-pre bg-[#090d0a] p-4 font-mono text-[11.5px] leading-[1.7] text-[#cfe3d4]">
              {file.content}
            </pre>
          </div>
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
          <button
            onClick={() => downloadVaultZip({ appName, profile, version, accent })}
            className="btn-notch flex items-center gap-2 bg-flare px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#1a120c] transition-all duration-200 hover:bg-ember active:scale-95"
          >
            <IconDownload size={13} /> download everything (.zip)
          </button>
          <p className="min-w-0 flex-1 font-mono text-[10px] leading-relaxed text-faint">
            {flash === "blocked" ? (
              <span className="text-gold">
                this frame blocked direct delivery — use COPY (always works), or open the studio in a new tab ↗
              </span>
            ) : (
              "blocked downloads? copy always works — paste into a new file with the exact name shown."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
