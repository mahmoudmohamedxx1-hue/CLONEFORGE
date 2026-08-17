import { useCallback, useEffect, useRef, useState } from "react";
import type { SourceProfile } from "../lib/engine";
import { downloadArtifact, forgeInCloud, workflowYaml, type CloudLog, type CloudPhase } from "../lib/cloudbuild";
import { IconDownload, IconGithub, IconTerminal, IconX } from "./Icons";

interface Props {
  profile: SourceProfile;
  appName: string;
  version: string;
  accent: string;
}

const PHASE_LABEL: Record<CloudPhase, string> = {
  idle: "armed",
  pushing: "pushing to github",
  dispatching: "dispatching",
  running: "compiling in cloud",
  collecting: "collecting",
  done: "installers ready",
  error: "failed",
};

export default function CloudForge({ profile, appName, version, accent }: Props) {
  const [owner, setOwner] = useState(profile.owner ?? "");
  const [repo, setRepo] = useState(profile.kind === "repo" ? profile.name : "");
  const [branch, setBranch] = useState(profile.branch ?? "main");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [phase, setPhase] = useState<CloudPhase>("idle");
  const [logs, setLogs] = useState<CloudLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ runUrl: string; artifactsUrl?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = profile.url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    setOwner(profile.owner ?? (m ? m[1] : ""));
    setRepo(m ? m[2].replace(/\.git$/i, "") : profile.kind === "repo" ? profile.name.toLowerCase() : "");
    setBranch(profile.branch ?? "main");
  }, [profile]);

  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const log = useCallback((l: CloudLog) => setLogs((prev) => [...prev, l]), []);

  const busy = phase === "pushing" || phase === "dispatching" || phase === "running" || phase === "collecting";

  const run = async () => {
    if (busy) return;
    if (!owner.trim() || !repo.trim()) {
      setError("Owner and repo are required — e.g. mahmoudmohamedxx1-hue / netstream");
      return;
    }
    if (!token.trim()) {
      setError("Paste a GitHub token — that's what lets the forge compile inside GitHub's cloud.");
      return;
    }
    setError(null);
    setLogs([]);
    setResult(null);
    setPhase("pushing");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    log({ text: `CLOUD FORGE · ${appName} → real .apk + .exe on github runners`, tone: "info" });
    try {
      const res = await forgeInCloud({
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || "main",
        token: token.trim(),
        appName,
        profile,
        version,
        accent,
        log,
        signal: ctrl.signal,
      });
      setResult(res);
      setPhase("done");
    } catch (e: any) {
      if (e?.name === "AbortError") {
        log({ text: "— cloud forge aborted (pushed files stay in the repo) —", tone: "warn" });
        setPhase("idle");
        return;
      }
      log({ text: `✗ ${e?.message ?? "cloud build failed"}`, tone: "warn" });
      setError(e?.message ?? "Cloud build failed.");
      setPhase("error");
    }
  };

  const grab = async () => {
    if (!result?.artifactsUrl) return;
    try {
      await downloadArtifact(result.artifactsUrl, token.trim(), `${appName}-installers-apk-exe.zip`);
    } catch (e: any) {
      setError(e?.message ?? "Download failed.");
    }
  };

  const downloadWorkflow = () => {
    const blob = new Blob([workflowYaml(appName)], { type: "text/yaml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cloneforge.yml";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };

  return (
    <div className="border border-line bg-pane/80">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
        <span className="flex h-9 w-9 items-center justify-center bg-mint/15 text-mint">
          <IconGithub size={18} />
        </span>
        <div>
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-paper">
            Cloud forge <span className="text-mint">— the real compiler</span>
          </h3>
          <p className="font-mono text-[11px] text-dim">
            pushes a CI pipeline into the repo · GitHub's free ubuntu runner compiles the <strong className="text-paper">genuine signed .apk + .exe</strong> · ~8 min
          </p>
        </div>
        <span
          className={`ml-auto border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
            phase === "done"
              ? "border-mint/50 text-mint"
              : phase === "error"
                ? "border-blood/50 text-blood"
                : busy
                  ? "border-gold/50 text-gold"
                  : "border-line text-faint"
          }`}
        >
          {PHASE_LABEL[phase]}
        </span>
      </div>

      <div className="grid gap-px bg-line lg:grid-cols-[340px_1fr]">
        {/* controls */}
        <div className="space-y-4 bg-pane p-6">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-faint">repository</label>
            <div className="flex items-center gap-1.5 font-mono text-[13px]">
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="owner"
                spellCheck={false}
                className="min-w-0 flex-1 border border-line bg-ink/60 px-2.5 py-2 text-paper placeholder:text-faint/60 focus:border-mint/60 focus:outline-none"
              />
              <span className="text-faint">/</span>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="repo"
                spellCheck={false}
                className="min-w-0 flex-1 border border-line bg-ink/60 px-2.5 py-2 text-paper placeholder:text-faint/60 focus:border-mint/60 focus:outline-none"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-faint">branch</label>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                spellCheck={false}
                className="w-24 border border-line bg-ink/60 px-2 py-1 font-mono text-[12px] text-paper focus:border-mint/60 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              github token <span className="text-mint">· stays in this tab, never stored</span>
            </label>
            <div className="flex items-center gap-2 border border-line bg-ink/60 px-2.5 focus-within:border-mint/60">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_… or github_pat_…"
                spellCheck={false}
                className="w-full bg-transparent py-2 font-mono text-[13px] text-paper placeholder:text-faint/60 focus:outline-none"
              />
              <button
                onClick={() => setShowToken((s) => !s)}
                className="font-mono text-[10px] uppercase tracking-widest text-faint transition-colors hover:text-paper"
              >
                {showToken ? "hide" : "show"}
              </button>
            </div>
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
              className="mt-2 block font-mono text-[10px] leading-relaxed text-dim underline decoration-line2 underline-offset-4 transition-colors hover:text-mint"
            >
              ↳ create a fine-grained PAT (repo access · Contents: R/W · Actions: R/W)
            </a>
          </div>

          <button
            onClick={run}
            disabled={busy}
            className="btn-notch group flex w-full items-center justify-between bg-mint px-5 py-3.5 text-left transition-all duration-200 hover:pl-7 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          >
            <span className="font-display text-base font-extrabold uppercase tracking-wide text-[#0a1410]">
              {busy ? "Compiling in cloud…" : "Forge apk + exe in cloud"}
            </span>
            <span className="font-mono text-xs font-bold text-[#0a1410]/70 transition-transform group-hover:translate-x-1">→</span>
          </button>
          {busy && (
            <button
              onClick={() => abortRef.current?.abort()}
              className="flex w-full items-center justify-center gap-2 border border-blood/40 bg-blood/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-blood transition-colors hover:bg-blood/20"
            >
              <IconX size={12} /> abort
            </button>
          )}
          {error && (
            <p className="log-pop border border-blood/40 bg-blood/10 p-3 font-mono text-[11px] leading-relaxed text-blood">{error}</p>
          )}

          <div className="border border-dashed border-line2 p-3">
            <p className="font-mono text-[10px] leading-relaxed text-faint">
              no token? <button onClick={downloadWorkflow} className="text-dim underline decoration-line2 underline-offset-2 transition-colors hover:text-mint">download cloneforge.yml</button>{" "}
              + the project zips below, push them yourself — the same pipeline runs on push.
            </p>
          </div>
        </div>

        {/* terminal + result */}
        <div className="flex flex-col bg-pane">
          <div className="flex items-center gap-2 border-b border-line/70 px-5 py-2.5">
            <IconTerminal size={13} className="text-mint" />
            <span className="font-mono text-[11px] text-faint">cloud pipeline — github-hosted runner (ubuntu-latest · free)</span>
          </div>
          <div ref={termRef} className="term-scroll h-[240px] flex-1 overflow-y-auto bg-[#0a0e0b] px-5 py-4 font-mono text-[12.5px] leading-[1.75]">
            {logs.length === 0 && (
              <p className="text-faint">
                awaiting dispatch — the runner will compile <span className="text-dim">app-debug.apk</span> (Gradle · Android SDK) and{" "}
                <span className="text-dim">{appName}-Setup.exe</span> (electron-builder · NSIS) on GitHub's machines, not yours.
              </p>
            )}
            {logs.map((l, i) => (
              <p key={i} className={`log-pop ${l.tone === "ok" ? "text-mint" : l.tone === "warn" ? "text-gold" : "text-dim"}`}>
                <span className="mr-2 select-none text-faint/70">{String(i + 1).padStart(2, "0")}</span>
                {l.text}
              </p>
            ))}
            {busy && (
              <p className="text-mint">
                <span className="cursor-blink">█</span>
              </p>
            )}
          </div>

          {phase === "done" && result && (
            <div className="log-pop border-t border-mint/30 bg-mint/8 p-5">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-mint">✓ genuine installers compiled</p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={grab}
                  className="btn-notch flex items-center gap-2 bg-mint px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[#0a1410] transition-all duration-200 hover:pl-6 active:scale-95"
                >
                  <IconDownload size={14} /> download apk + exe (.zip)
                </button>
                <a
                  href={result.runUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-line px-3 py-2.5 font-mono text-[11px] uppercase tracking-widest text-dim transition-colors hover:border-mint/50 hover:text-mint"
                >
                  view run on github ↗
                </a>
              </div>
              <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">
                unzip → <span className="text-dim">{appName}-android.apk</span> installs on any Android device (enable “install unknown apps”) ·{" "}
                <span className="text-dim">{appName}-Setup.exe</span> installs on Windows. Both are debug/unsigned builds — publish-grade signing
                needs your own store keys.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
