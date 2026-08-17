import { useEffect, useMemo, useRef, useState } from "react";
import type { LogLine, TargetId } from "../lib/engine";
import { STAGES, TARGETS } from "../lib/engine";
import { IconCheck, IconX } from "./Icons";

interface Props {
  lines: LogLine[];
  targets: TargetId[];
  running: boolean;
  finished: boolean;
  onDone: () => void;
  onCancel: () => void;
}

const toneColor: Record<string, string> = {
  info: "text-dim",
  ok: "text-mint",
  stage: "text-gold",
  warn: "text-gold",
};

export default function BuildConsole({ lines, targets, running, finished, onDone, onCancel }: Props) {
  const [n, setN] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const id = setInterval(() => {
      setN((prev) => (prev >= lines.length ? prev : prev + 1));
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 118);
    return () => clearInterval(id);
  }, [running, lines]);

  useEffect(() => {
    if (n >= lines.length && running && !doneRef.current) {
      doneRef.current = true;
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
  }, [n, lines.length, running, onDone]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [n]);

  const currentStage = n === 0 ? -1 : lines[Math.min(n - 1, lines.length - 1)].stage;

  const progress = useMemo(() => {
    const total: Record<string, number> = {};
    const done: Record<string, number> = {};
    for (const t of targets) {
      total[t] = lines.filter((l) => l.target === t).length;
      done[t] = 0;
    }
    for (let i = 0; i < n; i++) {
      const l = lines[i];
      if (l.target) done[l.target] = (done[l.target] ?? 0) + 1;
    }
    return { total, done };
  }, [lines, n, targets]);

  const visible = lines.slice(0, n);
  const pct = Math.round((n / lines.length) * 100);

  return (
    <div className="border border-line bg-pane/80">
      {/* stage chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-4">
        {STAGES.map((s, i) => {
          const state = finished || i < currentStage ? "done" : i === currentStage && running ? "active" : "wait";
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-5 bg-line2" />}
              <span
                className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-all duration-300 ${
                  state === "done"
                    ? "border-mint/40 bg-mint/10 text-mint"
                    : state === "active"
                      ? "border-flare/50 bg-flare/10 text-flare"
                      : "border-line text-faint"
                }`}
              >
                {state === "done" ? <IconCheck size={11} /> : <span className={state === "active" ? "cursor-blink" : ""}>▸</span>}
                {s}
              </span>
            </div>
          );
        })}
        <span className="ml-auto font-mono text-[11px] text-faint">
          {finished ? (
            <span className="text-mint">✓ {elapsed.toFixed(1)}s</span>
          ) : (
            <>t+{elapsed.toFixed(1)}s</>
          )}
        </span>
        {running && !finished && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 border border-blood/40 bg-blood/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-blood transition-colors hover:bg-blood/20"
          >
            <IconX size={11} /> abort
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_260px]">
        {/* terminal */}
        <div className="relative border-b border-line lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-line/70 px-6 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blood/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-mint/70" />
            <span className="ml-3 font-mono text-[11px] text-faint">forge — build pipeline — 80×24</span>
          </div>
          <div ref={scrollRef} className="term-scroll h-[340px] overflow-y-auto bg-[#0a0e0b] px-6 py-4 font-mono text-[12.5px] leading-[1.75]">
            {visible.length === 0 && <p className="text-faint">awaiting build…</p>}
            {visible.map((l, i) => (
              <p key={i} className="log-pop flex gap-2 whitespace-pre-wrap">
                <span className="shrink-0 select-none text-faint/70">{String(i + 1).padStart(2, "0")}</span>
                <span className={`shrink-0 font-bold ${l.tone === "ok" ? "text-mint" : l.target ? "text-ember" : "text-flare"}`}>
                  [{l.tag}]
                </span>
                <span className={toneColor[l.tone]}>{l.text}</span>
              </p>
            ))}
            {running && !finished && (
              <p className="text-flare">
                <span className="cursor-blink">█</span>
              </p>
            )}
          </div>
          {/* overall bar */}
          <div className="border-t border-line/70 px-6 py-3">
            <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-widest text-faint">
              <span>{finished ? "pipeline complete" : "overall"}</span>
              <span className={finished ? "text-mint" : "text-flare"}>{pct}%</span>
            </div>
            <div className="h-2 border border-line bg-ink">
              <div
                className={`h-full transition-[width] duration-200 ease-out ${
                  finished ? "bg-mint" : "bar-stripes bg-flare"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* per-target progress */}
        <div className="p-6">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">platforms</p>
          <div className="space-y-4">
            {targets.map((t) => {
              const meta = TARGETS.find((m) => m.id === t)!;
              const total = progress.total[t] ?? 0;
              const done = progress.done[t] ?? 0;
              const p = total === 0 ? 0 : Math.round((done / total) * 100);
              const mobile = t === "android" || t === "ios";
              return (
                <div key={t}>
                  <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
                    <span className={done === total && total > 0 ? "text-mint" : "text-dim"}>
                      {p === 100 ? "✓ " : ""}
                      {meta.label}
                    </span>
                    <span className="text-faint">.{meta.ext}</span>
                  </div>
                  <div className="h-1.5 border border-line bg-ink">
                    <div
                      className={`h-full transition-[width] duration-200 ${
                        p === 100 ? "bg-mint" : mobile ? "bg-mint/70" : "bg-flare/80"
                      }`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 border border-dashed border-line2 p-3 font-mono text-[10px] leading-relaxed text-faint">
            packages run in parallel across shells — tauri (desktop), gradle/xcode (mobile), vite (pwa).
          </p>
        </div>
      </div>
    </div>
  );
}
