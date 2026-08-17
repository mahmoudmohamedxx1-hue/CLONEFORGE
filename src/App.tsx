import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Artifacts from "./components/Artifacts";
import BuildConsole from "./components/BuildConsole";
import ConsoleInput from "./components/ConsoleInput";
import PreviewFrames from "./components/PreviewFrames";
import ScanReport from "./components/ScanReport";
import TargetsPanel from "./components/TargetsPanel";
import { IconClock, IconForge, IconRefresh, IconTrash } from "./components/Icons";
import { useReveal } from "./hooks/useReveal";
import type { Kind, LogLine, SourceProfile, TargetId } from "./lib/engine";
import { buildScript, detectKind, normalizeUrl, scanSource, timeAgo, TARGETS } from "./lib/engine";

type Phase = "idle" | "scanning" | "ready" | "building" | "done";

interface HistoryEntry {
  url: string;
  host: string;
  kind: Kind;
  name: string;
  targets: TargetId[];
  ts: number;
}

const HISTORY_KEY = "cloneforge:history:v1";

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

const STATUS: Record<Phase, { label: string; cls: string; dot: string }> = {
  idle: { label: "standby", cls: "border-line text-faint", dot: "bg-faint" },
  scanning: { label: "scanning", cls: "border-gold/50 text-gold", dot: "bg-gold pulse-flare" },
  ready: { label: "mirror locked", cls: "border-mint/50 text-mint", dot: "bg-mint pulse-mint" },
  building: { label: "building", cls: "border-flare/60 text-flare", dot: "bg-flare pulse-flare" },
  done: { label: "artifacts ready", cls: "border-mint/50 text-mint", dot: "bg-mint pulse-mint" },
};

const MARQUEE = [
  "github repo → android apk",
  "live website → ios app",
  "repo → windows installer",
  "website → macos dmg",
  "any url → linux appimage",
  "everything → offline pwa",
];

function SectionHead({ no, title, note }: { no: string; title: string; note?: string }) {
  return (
    <div className="mb-6 flex items-end gap-4">
      <span className="font-mono text-sm font-bold text-flare">{no}</span>
      <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-paper sm:text-3xl">{title}</h2>
      <span className="mb-2 h-px flex-1 bg-line" />
      {note && <span className="mb-1 hidden font-mono text-[10px] uppercase tracking-widest text-faint sm:block">{note}</span>}
    </div>
  );
}

export default function App() {
  /* ---------------- state ---------------- */
  const [kind, setKind] = useState<Kind>("website");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [profile, setProfile] = useState<SourceProfile | null>(null);
  const [targets, setTargets] = useState<Record<TargetId, boolean>>({
    android: true,
    ios: true,
    windows: true,
    macos: true,
    linux: false,
    pwa: true,
  });
  const [appName, setAppName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [accent, setAccent] = useState("#ff6d3b");
  const [route, setRoute] = useState("/");
  const [lines, setLines] = useState<LogLine[]>([]);
  const [runId, setRunId] = useState(0);
  const [buildElapsed, setBuildElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const scanTimer = useRef<number | null>(null);
  const buildStart = useRef(0);
  const scanSec = useRef<HTMLDivElement>(null);
  const buildSec = useRef<HTMLDivElement>(null);
  const artifactSec = useRef<HTMLDivElement>(null);

  const revealFeed = useReveal<HTMLDivElement>();
  const revealMarquee = useReveal<HTMLDivElement>();
  const revealScan = useReveal<HTMLDivElement>();
  const revealTargets = useReveal<HTMLDivElement>();
  const revealBuild = useReveal<HTMLDivElement>();
  const revealPreview = useReveal<HTMLDivElement>();
  const revealArtifacts = useReveal<HTMLDivElement>();

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* private mode — ignore */
    }
  }, [history]);

  useEffect(() => () => {
    if (scanTimer.current) window.clearTimeout(scanTimer.current);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (phase === "ready") scanSec.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (phase === "building") buildSec.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (phase === "done") artifactSec.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, [phase]);

  /* ---------------- actions ---------------- */

  const forge = useCallback(
    (raw?: string, kindOverride?: Kind) => {
      if (phase === "scanning") return;
      const value = raw ?? url;
      const res = normalizeUrl(value);
      if (!res.ok) {
        setError(res.reason ?? "Invalid URL.");
        return;
      }
      const k = kindOverride ?? (raw ? detectKind(raw) : kind);
      if (raw) {
        setUrl(raw);
        setKind(k);
      }
      setError(null);
      setPhase("scanning");
      setProfile(null);
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
      scanTimer.current = window.setTimeout(() => {
        const prof = scanSource(res.url!, res.host!, k);
        setProfile(prof);
        setAppName(prof.name);
        setRoute(prof.routes[0]);
        setAccent(prof.palette.accent.startsWith("#") ? prof.palette.accent : "#ff6d3b");
        setPhase("ready");
      }, 2300);
    },
    [phase, url, kind],
  );

  const activeTargets = useMemo(() => TARGETS.filter((t) => targets[t.id]).map((t) => t.id), [targets]);

  const runBuild = useCallback(() => {
    if (!profile || activeTargets.length === 0) return;
    setLines(buildScript(profile, activeTargets, appName || profile.name));
    setRunId((id) => id + 1);
    buildStart.current = Date.now();
    setPhase("building");
  }, [profile, activeTargets, appName]);

  const onBuildDone = useCallback(() => {
    const secs = (Date.now() - buildStart.current) / 1000;
    setBuildElapsed(secs);
    setPhase("done");
    if (profile) {
      setHistory((prev) => {
        const entry: HistoryEntry = {
          url: profile.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
          host: profile.host,
          kind: profile.kind,
          name: appName || profile.name,
          targets: activeTargets,
          ts: Date.now(),
        };
        return [entry, ...prev.filter((h) => h.url !== entry.url)].slice(0, 6);
      });
    }
  }, [profile, appName, activeTargets]);

  const onCancel = useCallback(() => setPhase("ready"), []);

  const showTargets = profile && phase !== "scanning";
  const showBuild = lines.length > 0 && (phase === "building" || phase === "done");
  const showPreview = profile && phase !== "scanning";
  const status = STATUS[phase];

  /* ---------------- render ---------------- */

  return (
    <div className="relative min-h-screen">
      {/* ambient stage */}
      <div className="bg-stage">
        <div className="bg-grid" />
        <div className="bg-glow" />
        <div className="bg-noise" />
      </div>
      {phase === "building" && <div className="scanline" />}

      <div className="relative z-10">
        {/* ---------- header ---------- */}
        <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3.5 sm:px-8">
            <a href="#top" className="group flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center bg-flare text-ink transition-transform duration-300 group-hover:rotate-[18deg]">
                <IconForge size={18} strokeWidth={2.2} />
              </span>
              <span className="font-display text-lg font-extrabold uppercase tracking-tight text-paper">
                Clone<span className="text-flare">forge</span>
              </span>
              <span className="mt-0.5 hidden border border-line px-1.5 py-px font-mono text-[9px] uppercase tracking-widest text-faint sm:block">
                v0.9.4-β
              </span>
            </a>
            <span className="ml-2 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-faint lg:block">
              repo / website → mobile + pc apps
            </span>
            <span className={`ml-auto flex items-center gap-2 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest ${status.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </header>

        <main id="top" className="mx-auto max-w-7xl px-5 sm:px-8">
          {/* ---------- opening: the feed ---------- */}
          <section ref={revealFeed} className="reveal grid items-start gap-12 py-12 sm:py-16 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-mint">
                <span className="h-px w-8 bg-mint/60" />
                can you clone a repo or a site into real apps? — yes. feed it below
              </p>
              <h1 className="font-display text-[2.6rem] font-extrabold uppercase leading-[0.95] tracking-tight text-paper sm:text-6xl xl:text-[4.6rem]">
                Clone any
                <br />
                repo <span className="text-faint">or</span> site.
                <br />
                <span className="relative inline-block text-flare">
                  Ship 6 apps.
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
                    <path d="M2 9C60 3 180 2 298 7" stroke="#FF6D3B" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
                  </svg>
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-dim">
                CloneForge ingests a <strong className="font-semibold text-paper">public repository</strong> or a{" "}
                <strong className="font-semibold text-paper">live website</strong>, mirrors its interface, adapts the
                layout for touch and desktop, then packages signed shells for{" "}
                <strong className="font-semibold text-paper">Android, iOS, Windows, macOS, Linux</strong> and an
                offline <strong className="font-semibold text-paper">PWA</strong> — in one pass.
              </p>

              {/* process rail */}
              <ol className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-widest">
                {["ingest", "translate", "adapt", "package", "sign"].map((s, i) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className="flex items-center gap-2 border border-line bg-pane/70 px-2.5 py-1.5 text-dim transition-colors duration-200 hover:border-flare/50 hover:text-paper">
                      <span className="text-flare">{String(i + 1).padStart(2, "0")}</span> {s}
                    </span>
                    {i < 4 && <span className="text-faint">→</span>}
                  </li>
                ))}
              </ol>

              {history.length > 0 && (
                <div className="mt-10 border border-line bg-pane/60">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                    <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                      <IconClock size={12} /> recent forges
                    </p>
                    <button
                      onClick={() => setHistory([])}
                      className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-faint transition-colors hover:text-blood"
                    >
                      <IconTrash size={11} /> clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4">
                    {history.map((h) => (
                      <button
                        key={h.host + h.ts}
                        onClick={() => forge(h.url, h.kind)}
                        disabled={phase === "scanning"}
                        className="group flex items-center gap-2 border border-line bg-ink/60 px-3 py-2 text-left font-mono text-[11px] text-dim transition-all duration-200 hover:border-flare/50 hover:text-paper disabled:opacity-50"
                      >
                        <span className={h.kind === "repo" ? "text-mint" : "text-flare"}>{h.kind === "repo" ? "⌥" : "◍"}</span>
                        <span>
                          <span className="block text-paper">{h.name}</span>
                          <span className="block text-[9px] text-faint">
                            {h.targets.length} targets · {timeAgo(h.ts)}
                          </span>
                        </span>
                        <IconRefresh size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <ConsoleInput
                kind={kind}
                setKind={(k) => {
                  setKind(k);
                  setError(null);
                }}
                url={url}
                setUrl={(u) => {
                  setUrl(u);
                  setError(null);
                }}
                onForge={forge}
                scanning={phase === "scanning"}
                error={error}
              />
            </div>
          </section>

          {/* ---------- marquee ---------- */}
          <div ref={revealMarquee} className="reveal overflow-hidden border-y border-line bg-pane/50">
            <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap py-3 font-mono text-[11px] uppercase tracking-[0.28em] text-faint">
              {[0, 1].map((dup) => (
                <span key={dup} className="flex items-center gap-8" aria-hidden={dup === 1}>
                  {MARQUEE.map((m) => (
                    <span key={m + dup} className="flex items-center gap-8">
                      <span className="transition-colors hover:text-flare">{m}</span>
                      <span className="text-flare/60">✦</span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          {/* ---------- 02 scan report ---------- */}
          <section ref={scanSec} className="scroll-mt-24 pt-14">
            <div ref={revealScan} className="reveal">
              <SectionHead no="02" title="Scan report" note={profile ? `source: ${profile.host}` : "awaiting source"} />
              <ScanReport
                profile={profile}
                scanning={phase === "scanning"}
                accent={accent}
                onPickAccent={setAccent}
              />
            </div>
          </section>

          {/* ---------- 03 targets ---------- */}
          {showTargets && profile && (
            <section className="pt-14">
              <div ref={revealTargets} className="reveal">
                <SectionHead no="03" title="Targets & identity" note={`${activeTargets.length} platforms armed`} />
                <TargetsPanel
                  profile={profile}
                  targets={targets}
                  toggle={(t) => setTargets((prev) => ({ ...prev, [t]: !prev[t] }))}
                  appName={appName}
                  setAppName={setAppName}
                  version={version}
                  setVersion={setVersion}
                  accent={accent}
                  setAccent={setAccent}
                  onRun={runBuild}
                  disabled={phase === "building"}
                />
              </div>
            </section>
          )}

          {/* ---------- 04 build console ---------- */}
          {showBuild && (
            <section ref={buildSec} className="scroll-mt-24 pt-14">
              <div ref={revealBuild} className="reveal is-in">
                <SectionHead
                  no="04"
                  title="Build console"
                  note={phase === "done" ? "pipeline finished" : "streaming…"}
                />
                <BuildConsole
                  key={runId}
                  lines={lines}
                  targets={activeTargets}
                  running={phase === "building"}
                  finished={phase === "done"}
                  onDone={onBuildDone}
                  onCancel={onCancel}
                />
              </div>
            </section>
          )}

          {/* ---------- 05 preview ---------- */}
          {showPreview && profile && (
            <section className="pt-14">
              <div ref={revealPreview} className="reveal">
                <SectionHead no={phase === "done" ? "05" : "04"} title="Live preview" note="same bundle · every shell" />
                <div className="border border-line bg-pane/60 p-6 sm:p-10">
                  <PreviewFrames
                    profile={profile}
                    appName={appName || profile.name}
                    accent={accent}
                    route={route}
                    setRoute={setRoute}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ---------- 06 artifacts ---------- */}
          {phase === "done" && profile && (
            <section ref={artifactSec} className="scroll-mt-24 pb-20 pt-14">
              <div ref={revealArtifacts} className="reveal is-in">
                <SectionHead no="06" title="Artifacts" note="signed & checksummed" />
                <Artifacts
                  profile={profile}
                  targets={activeTargets}
                  appName={appName || profile.name}
                  version={version}
                  elapsed={buildElapsed}
                />
                <p className="mt-6 flex items-start gap-2 border border-dashed border-line2 bg-ink/40 p-4 font-mono text-[11px] leading-relaxed text-faint">
                  <span className="text-gold">⚠</span>
                  This is an in-browser simulation of the CloneForge pipeline — downloads are signed build manifests,
                  not compiled binaries. When you clone real projects, respect their licenses.
                </p>
              </div>
            </section>
          )}

          {phase !== "done" && <div className="pb-24" />}
        </main>

        {/* ---------- footer ---------- */}
        <footer className="border-t border-line bg-pane/40">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center bg-flare text-ink">
                <IconForge size={13} strokeWidth={2.4} />
              </span>
              <p className="font-mono text-[11px] text-dim">
                <span className="font-bold text-paper">CLONEFORGE</span> — one source, every screen.
              </p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              built in the browser · no servers harmed · © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
