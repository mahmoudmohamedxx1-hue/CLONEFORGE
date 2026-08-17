import { useEffect, useRef, useState } from "react";
import type { SourceProfile } from "../lib/engine";
import { downloadArtifact, forgeInCloud, makePushBundle, saveBlob } from "../lib/cloudbuild";
import type { CloudLog, CloudPhase } from "../lib/cloudbuild";
import { slugify } from "../lib/engine";
import { IconCheck, IconDownload, IconForge, IconGithub, IconTerminal, IconWindows, IconX, IconZap } from "./Icons";

interface Props {
  profile: SourceProfile;
  appName: string;
  version: string;
  accent: string;
}

function repoFromUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!m) return null;
  return { owner: decodeURIComponent(m[1]), repo: decodeURIComponent(m[2]).replace(/\.git$/i, "") };
}

const PHASE_LABEL: Record<CloudPhase, { label: string; cls: string }> = {
  idle: { label: "standby", cls: "border-line text-faint" },
  pushing: { label: "pushing to repo", cls: "border-gold/50 text-gold" },
  dispatching: { label: "dispatching", cls: "border-gold/50 text-gold" },
  running: { label: "compiling on github", cls: "border-flare/60 text-flare" },
  collecting: { label: "collecting installers", cls: "border-flare/60 text-flare" },
  done: { label: "installers ready", cls: "border-mint/50 text-mint" },
  error: { label: "needs attention", cls: "border-blood/50 text-blood" },
};

export default function CloudForge({ profile, appName, version, accent }: Props) {
  const slug = slugify(appName);
  const gh = repoFromUrl(profile.url);

  /* tabs: zero-token (default) vs one-click PAT */
  const [mode, setMode] = useState<"cli" | "token">("cli");
  const [bundleBusy, setBundleBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  /* PAT flow */
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [owner, setOwner] = useState(gh?.owner ?? "");
  const [repo, setRepo] = useState(gh?.repo ?? "");
  const [branch, setBranch] = useState(profile.branch ?? "main");

  const [phase, setPhase] = useState<CloudPhase>("idle");
  const [logs, setLogs] = useState<CloudLog[]>([]);
  const [result, setResult] = useState<{ runUrl: string; artifactsUrl?: string } | null>(null);
  const [dlBusy, setDlBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const log = (l: CloudLog) => setLogs((prev) => [...prev, l]);

  const start = async () => {
    if (!token.trim()) {
      log({ text: "✗ paste a fine-grained PAT first (or switch to the zero-token tab)", tone: "warn" });
      setPhase("error");
      return;
    }
    if (!owner.trim() || !repo.trim()) {
      log({ text: "✗ owner and repo are required", tone: "warn" });
      setPhase("error");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLogs([]);
    setResult(null);
    setPhase("pushing");
    log({ text: `cloudforge → compiling ${appName} on GitHub's free runners`, tone: "info" });
    try {
      const r = await forgeInCloud({
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || "main",
        token: token.trim(),
        appName: appName || profile.name,
        profile,
        version,
        accent,
        log,
        signal: ctrl.signal,
      });
      setResult(r);
      setPhase("done");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        log({ text: "— aborted by operator —", tone: "warn" });
        setPhase("idle");
        return;
      }
      log({ text: `✗ ${(e as Error).message}`, tone: "warn" });
      setPhase("error");
    }
  };

  const onDownload = async () => {
    if (!result?.artifactsUrl) return;
    setDlBusy(true);
    try {
      await downloadArtifact(result.artifactsUrl, token.trim(), `${slug}-installers.zip`);
      log({ text: `installers zip saved — unzip for the .apk + .exe`, tone: "ok" });
    } catch (e) {
      log({ text: `✗ ${(e as Error).message}`, tone: "warn" });
    } finally {
      setDlBusy(false);
    }
  };

  const onBundle = async () => {
    setBundleBusy(true);
    try {
      const blob = await makePushBundle({ appName: appName || profile.name, profile, version, accent });
      saveBlob(`${slug}-cloudbuild.zip`, blob);
      setCopied("bundle");
      setTimeout(() => setCopied(null), 1600);
    } finally {
      setBundleBusy(false);
    }
  };

  const copy = (key: string, text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => {});
  };

  const cmdAuth = "gh auth login";
  const cmdPush = `gh repo create ${slug}-forged --public --source=. --push`;
  const busy = phase === "pushing" || phase === "dispatching" || phase === "running" || phase === "collecting";
  const meta = PHASE_LABEL[phase];

  return (
    <div className="border border-line bg-pane/80">
      {/* header + answer to "why a token?" */}
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${meta.cls}`}>
            <IconGithub size={13} /> {meta.label}
          </span>
          <p className="font-mono text-[11px] text-dim">
            real Gradle + NSIS compilation · on <span className="text-paper">ubuntu-latest</span> runners · ~8 min ·{" "}
            <span className="text-mint">free</span>
          </p>
        </div>

        <div className="mt-4 grid gap-3 border border-dashed border-line2 bg-ink/40 p-4 lg:grid-cols-[1.1fr_1fr]">
          <p className="font-mono text-[11px] leading-relaxed text-dim">
            <strong className="text-gold">why any permission at all?</strong> GitHub lets{" "}
            <em className="not-italic text-mint">anyone read</em> public repos with no token — that's how the scan above
            pulled <span className="text-paper">{gh ? `${gh.owner}/${gh.repo}` : "your repo"}</span>. But compiling means{" "}
            <em className="not-italic text-flare">writing</em> a build recipe into a repo and starting its build machines —
            and GitHub demands signed permission for any write, from anyone, anywhere.
          </p>
          <p className="font-mono text-[11px] leading-relaxed text-dim">
            <strong className="text-gold">two ways in:</strong> the <span className="text-mint">zero-token tab</span> uses
            the GitHub CLI — you click Authorize once in your browser and push; nothing is pasted. The{" "}
            <span className="text-flare">one-click tab</span> takes a fine-grained PAT (1 repo, no password, revocable) and
            drives everything automatically.
          </p>
        </div>
      </div>

      {/* mode tabs */}
      <div className="flex border-b border-line">
        {(
          [
            { id: "cli", label: "zero-token · github cli", hot: true },
            { id: "token", label: "one-click · paste pat", hot: false },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={`flex items-center gap-2 border-r border-line px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-200 ${
              mode === t.id ? "bg-pane2 text-paper" : "text-faint hover:text-dim"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${mode === t.id ? (t.hot ? "bg-mint" : "bg-flare") : "bg-line2"}`} />
            {t.label}
            {t.hot && (
              <span className="border border-mint/40 bg-mint/10 px-1.5 py-0.5 text-[8.5px] text-mint">recommended</span>
            )}
          </button>
        ))}
      </div>

      {/* ================= ZERO-TOKEN TAB ================= */}
      {mode === "cli" && (
        <div className="grid lg:grid-cols-[1fr_300px]">
          <div className="divide-y divide-line border-b border-line lg:border-b-0 lg:border-r">
            {[
              {
                n: "1",
                title: "get the bundle",
                body: `One zip contains the whole app + the build recipe (.github/workflows/cloneforge.yml). The moment it lands on GitHub, the run starts by itself.`,
                action: (
                  <button
                    onClick={onBundle}
                    disabled={bundleBusy}
                    className="btn-notch flex items-center gap-2 bg-mint px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[#0c1a12] transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-60"
                  >
                    <IconDownload size={13} /> {bundleBusy ? "zipping…" : copied === "bundle" ? "saved ✓" : `download ${slug}-cloudbuild.zip`}
                  </button>
                ),
              },
              {
                n: "2",
                title: "authorize github — one browser click, nothing pasted",
                body: "Install GitHub CLI once (cli.github.com, or: winget install GitHub.cli). Open a terminal inside the unzipped folder and run: it opens your browser, you click Authorize, done.",
                cmd: cmdAuth,
              },
              {
                n: "3",
                title: "push — the build auto-triggers",
                body: "This creates a public repo and pushes everything. The workflow fires on push — no dispatch, no second login.",
                cmd: cmdPush,
              },
              {
                n: "4",
                title: "collect the real installers",
                body: `Open your new repo's Actions tab → "CloneForge Build" (approve the first run if asked) → when it's green, Artifacts → installers. That's ${appName || slug}-android.apk + Setup.exe, compiled by Gradle + NSIS on GitHub's machines.`,
                action: (
                  <a
                    href={gh ? `https://github.com/${gh.owner}` : "https://github.com"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 border border-line px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-dim transition-all duration-200 hover:border-mint/50 hover:text-mint"
                  >
                    <IconGithub size={13} /> open github → actions tab
                  </a>
                ),
              },
            ].map((s) => (
              <div key={s.n} className="group flex items-start gap-4 px-6 py-5 transition-colors duration-200 hover:bg-pane2/60">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-mint/40 bg-mint/10 font-mono text-[12px] font-bold text-mint">
                  {s.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-bold text-paper">{s.title}</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-dim">{s.body}</p>
                  {s.cmd && (
                    <p className="mt-2.5 flex items-center gap-2 overflow-x-auto border-l-2 border-mint/50 bg-ink/60 py-2 pl-3 pr-2 font-mono text-[12px] text-paper">
                      <IconTerminal size={13} className="shrink-0 text-mint" />
                      <span className="whitespace-nowrap">
                        <span className="text-faint">$</span> {s.cmd}
                      </span>
                      <button
                        onClick={() => copy(s.cmd!, s.cmd!)}
                        className="ml-auto shrink-0 border border-line px-2 py-0.5 text-[10px] uppercase tracking-widest text-faint transition-colors hover:border-mint/50 hover:text-mint"
                      >
                        {copied === s.cmd ? "copied ✓" : "copy"}
                      </button>
                    </p>
                  )}
                </div>
                {s.action && <div className="shrink-0">{s.action}</div>}
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-4 p-6">
            <div className="border border-line bg-ink/50 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">you keep control</p>
              <ul className="mt-2 space-y-1.5 font-mono text-[10.5px] leading-relaxed text-dim">
                <li className="flex gap-2"><IconCheck size={12} className="mt-0.5 shrink-0 text-mint" /> no token typed or stored here</li>
                <li className="flex gap-2"><IconCheck size={12} className="mt-0.5 shrink-0 text-mint" /> auth happens on github.com only</li>
                <li className="flex gap-2"><IconCheck size={12} className="mt-0.5 shrink-0 text-mint" /> the repo is yours — delete it anytime</li>
                <li className="flex gap-2"><IconCheck size={12} className="mt-0.5 shrink-0 text-mint" /> free runner minutes every month</li>
              </ul>
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-faint">
              first push on a fresh repo may park the run in "waiting" — one click ("Approve and run") on the Actions page
              releases it. that's github protecting new accounts, not a bug.
            </p>
          </div>
        </div>
      )}

      {/* ================= ONE-CLICK PAT TAB ================= */}
      {mode === "token" && (
        <div>
          {/* token gate */}
          <div className="grid gap-6 border-b border-line p-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                fine-grained PAT · lives in this tab only, never stored
              </label>
              <div className="flex gap-2">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="github_pat_xxxxxxxxxxxx"
                  spellCheck={false}
                  className="min-w-0 flex-1 border border-line bg-ink/60 px-3 py-2.5 font-mono text-[12px] text-paper outline-none transition-colors placeholder:text-faint/60 focus:border-flare"
                />
                <button
                  onClick={() => setShowToken((s) => !s)}
                  className="border border-line px-3 font-mono text-[10px] uppercase tracking-widest text-faint transition-colors hover:border-line2 hover:text-dim"
                >
                  {showToken ? "hide" : "show"}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { l: "owner", v: owner, s: setOwner },
                  { l: "repo", v: repo, s: setRepo },
                  { l: "branch", v: branch, s: setBranch },
                ].map((f) => (
                  <div key={f.l}>
                    <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-faint">{f.l}</p>
                    <input
                      value={f.v}
                      onChange={(e) => f.s(e.target.value)}
                      spellCheck={false}
                      className="w-full border border-line bg-ink/60 px-2.5 py-2 font-mono text-[11.5px] text-paper outline-none transition-colors focus:border-flare"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={start}
                  disabled={busy}
                  className="btn-notch flex items-center gap-2 bg-flare px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[#1a120c] transition-all duration-200 hover:bg-ember hover:pl-7 active:scale-95 disabled:opacity-50"
                >
                  <IconZap size={13} /> {busy ? "compiling on github…" : "forge apk + exe in cloud"}
                </button>
                {busy && (
                  <button
                    onClick={() => abortRef.current?.abort()}
                    className="flex items-center gap-1.5 border border-blood/40 bg-blood/10 px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-blood transition-colors hover:bg-blood/20"
                  >
                    <IconX size={11} /> abort
                  </button>
                )}
              </div>
            </div>

            <div className="border border-line bg-ink/50 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">make one in ~60s</p>
              <ol className="mt-2 space-y-1.5 font-mono text-[10.5px] leading-relaxed text-dim">
                <li>1 · open <a className="text-flare underline decoration-flare/40 hover:decoration-flare" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">new fine-grained token</a></li>
                <li>2 · resource owner: you · repo access: <strong className="text-paper">only “{repo || "your repo"}”</strong></li>
                <li>3 · permissions: <strong className="text-paper">Contents</strong> read+write, <strong className="text-paper">Actions</strong> read+write</li>
                <li>4 · paste left · it's never saved or sent anywhere except api.github.com</li>
              </ol>
              <p className="mt-3 border-t border-line pt-2 font-mono text-[9.5px] leading-relaxed text-faint">
                what it touches: 2 files pushed to your repo (cloneforge/app.zip + the workflow) and one workflow_dispatch.
                revoke it afterwards — the artifacts stay downloadable from the run page.
              </p>
            </div>
          </div>

          {/* cloud terminal */}
          <div className="relative">
            <div className="flex items-center gap-2 border-b border-line/70 px-6 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blood/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-mint/70" />
              <span className="ml-3 font-mono text-[11px] text-faint">cloudbuild — api.github.com — ubuntu-latest</span>
            </div>
            <div ref={logRef} className="term-scroll h-[240px] overflow-y-auto bg-[#0a0e0b] px-6 py-4 font-mono text-[12.5px] leading-[1.8]">
              {logs.length === 0 && (
                <p className="text-faint">
                  idle — the pipeline will: push app + workflow → dispatch → compile on GitHub → fetch installers…
                </p>
              )}
              {logs.map((l, i) => (
                <p key={i} className="log-pop whitespace-pre-wrap">
                  <span
                    className={
                      l.tone === "ok" ? "text-mint" : l.tone === "warn" ? "text-gold" : "text-dim"
                    }
                  >
                    {l.text}
                  </span>
                </p>
              ))}
              {busy && (
                <p className="text-flare">
                  <span className="cursor-blink">█</span>
                </p>
              )}
            </div>
          </div>

          {/* result strip */}
          {phase === "done" && result && (
            <div className="flex flex-wrap items-center gap-4 border-t border-mint/30 bg-mint/5 px-6 py-4">
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-mint">
                <IconCheck size={13} /> real installers compiled
              </span>
              <button
                onClick={onDownload}
                disabled={dlBusy}
                className="btn-notch flex items-center gap-2 bg-mint px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#0c1a12] transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-60"
              >
                <IconDownload size={13} /> {dlBusy ? "fetching…" : "download apk + exe zip"}
              </button>
              <a
                href={result.runUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-dim transition-colors hover:border-mint/50 hover:text-mint"
              >
                <IconGithub size={12} /> open run on github
              </a>
              <span className="ml-auto hidden font-mono text-[10px] text-faint md:block">
                {slug}-android.apk · {slug}-setup.exe inside
              </span>
            </div>
          )}
          {phase === "error" && (
            <div className="flex items-center gap-3 border-t border-blood/30 bg-blood/5 px-6 py-3 font-mono text-[11px] text-blood">
              <IconForge size={13} /> the run log above says exactly what GitHub refused — fix it and hit forge again.
            </div>
          )}
        </div>
      )}

      {/* bottom context strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line px-6 py-3 font-mono text-[10px] uppercase tracking-widest text-faint">
        <span className="flex items-center gap-1.5">
          <IconWindows size={11} className="text-flare" /> want something for pc right now?
        </span>
        <span className="normal-case tracking-normal text-dim">
          section 07 has {slug}.hta — double-click and it runs today, while the cloud build is still compiling.
        </span>
      </div>
    </div>
  );
}
