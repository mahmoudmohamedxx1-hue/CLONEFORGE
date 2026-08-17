import type { SourceProfile, TargetId } from "../lib/engine";
import { TARGETS, artifactSize, fmtBytes } from "../lib/engine";
import { IconApple, IconGlobe, IconLinux, IconPhone, IconWindows, IconZap } from "./Icons";

const ICONS: Record<TargetId, (p: { size?: number; className?: string }) => JSX.Element> = {
  android: IconPhone,
  ios: IconApple,
  windows: IconWindows,
  macos: IconApple,
  linux: IconLinux,
  pwa: IconGlobe,
};

interface Props {
  profile: SourceProfile;
  targets: Record<TargetId, boolean>;
  toggle: (t: TargetId) => void;
  appName: string;
  setAppName: (s: string) => void;
  version: string;
  setVersion: (s: string) => void;
  accent: string;
  setAccent: (s: string) => void;
  onRun: () => void;
  disabled: boolean;
}

const QUICK_ACCENTS = ["#ff6d3b", "#5fd99d", "#e8c468", "#6ee7f0", "#f06ea9", "#edf0e4"];

export default function TargetsPanel({
  profile,
  targets,
  toggle,
  appName,
  setAppName,
  version,
  setVersion,
  accent,
  setAccent,
  onRun,
  disabled,
}: Props) {
  const active = TARGETS.filter((t) => targets[t.id]);
  const total = active.reduce((s, t) => s + artifactSize(t.id, profile), 0);
  const bundleId = `com.cloneforge.${appName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app"}`;

  return (
    <div className="border border-line bg-pane/80">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
          <span className="text-flare">03</span> — pick platforms
        </p>
        <p className="font-mono text-[11px] text-faint">
          {active.length}/6 selected · est. <span className="text-gold">{fmtBytes(total)}</span>
        </p>
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {TARGETS.map((t) => {
          const Ico = ICONS[t.id];
          const on = targets[t.id];
          const mobile = t.id === "android" || t.id === "ios";
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              aria-pressed={on}
              className={`group relative flex items-start gap-4 p-5 text-left transition-colors duration-200 ${
                on ? "bg-pane2" : "bg-pane hover:bg-pane2/60"
              }`}
            >
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border transition-all duration-200 ${
                  on
                    ? mobile
                      ? "border-mint/50 bg-mint/10 text-mint"
                      : "border-flare/50 bg-flare/10 text-flare"
                    : "border-line2 text-faint group-hover:text-dim"
                }`}
              >
                <Ico size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`font-display text-base font-bold ${on ? "text-paper" : "text-dim"}`}>
                    {t.label}
                  </span>
                  <span className="border border-line px-1.5 py-px font-mono text-[9px] uppercase tracking-widest text-faint">
                    .{t.ext}
                  </span>
                  <span
                    className={`ml-auto font-mono text-[9px] uppercase tracking-widest ${
                      mobile ? "text-mint/80" : "text-flare/80"
                    }`}
                  >
                    {mobile ? "mobile" : t.id === "pwa" ? "universal" : "desktop"}
                  </span>
                </span>
                <span className="mt-1 block truncate font-mono text-[11px] text-faint">{t.arch}</span>
                <span className="mt-0.5 block truncate font-mono text-[11px] text-faint/80">{t.shell}</span>
                <span className="mt-2 flex items-center justify-between">
                  <span className={`font-mono text-[11px] ${on ? "text-gold" : "text-faint"}`}>
                    ≈ {fmtBytes(artifactSize(t.id, profile))}
                  </span>
                  {/* switch */}
                  <span
                    className={`relative inline-flex h-5 w-10 items-center border transition-colors duration-200 ${
                      on ? (mobile ? "border-mint bg-mint/25" : "border-flare bg-flare/25") : "border-line2 bg-ink"
                    }`}
                  >
                    <span
                      className={`absolute h-3.5 w-3.5 transition-all duration-200 ${
                        on ? (mobile ? "left-[22px] bg-mint" : "left-[22px] bg-flare") : "left-[3px] bg-faint"
                      }`}
                    />
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* identity config */}
      <div className="grid gap-6 border-t border-line px-6 py-5 md:grid-cols-[1.2fr_1fr_auto]">
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-faint">app name</label>
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full border border-line bg-ink/60 px-3 py-2.5 font-mono text-sm text-paper transition-colors focus:border-flare focus:outline-none"
          />
          <p className="mt-1.5 truncate font-mono text-[11px] text-faint">bundle → {bundleId}</p>
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            accent (injected theme)
          </label>
          <div className="flex items-center gap-2">
            {QUICK_ACCENTS.concat(profile.palette.accent.startsWith("#") ? [profile.palette.accent] : []).map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => setAccent(c)}
                className={`h-8 w-8 border transition-transform duration-150 hover:scale-110 ${
                  accent.toLowerCase() === c.toLowerCase()
                    ? "border-paper ring-2 ring-flare ring-offset-2 ring-offset-pane"
                    : "border-line2"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">version</label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-24 border border-line bg-ink/60 px-2 py-1 font-mono text-xs text-paper focus:border-flare focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col justify-end">
          <button
            onClick={onRun}
            disabled={disabled || active.length === 0}
            className="btn-notch group flex items-center gap-3 bg-mint px-6 py-4 font-display text-lg font-extrabold uppercase tracking-wide text-[#0c1a12] transition-all duration-200 hover:brightness-110 hover:pl-8 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconZap size={20} className="transition-transform duration-200 group-hover:rotate-12" />
            Run build
          </button>
          <p className="mt-2 text-right font-mono text-[10px] text-faint">≈12 s simulated pipeline</p>
        </div>
      </div>
    </div>
  );
}
