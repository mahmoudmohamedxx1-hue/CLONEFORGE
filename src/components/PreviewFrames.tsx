import type { SourceProfile } from "../lib/engine";
import MockSite from "./MockSite";
import { IconMonitor, IconPhone } from "./Icons";

interface Props {
  profile: SourceProfile;
  appName: string;
  accent: string;
  route: string;
  setRoute: (r: string) => void;
}

export default function PreviewFrames({ profile, appName, accent, route, setRoute }: Props) {
  return (
    <div>
      {/* route switcher */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">live route →</span>
        {profile.routes.map((r) => (
          <button
            key={r}
            onClick={() => setRoute(r)}
            className={`border px-2.5 py-1 font-mono text-[11px] transition-all duration-200 ${
              route === r
                ? "border-flare bg-flare/15 text-flare"
                : "border-line text-dim hover:border-line2 hover:text-paper"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-14">
        {/* phone */}
        <div className="flex flex-col items-center gap-4">
          <div className="float-soft relative w-[248px] rounded-[2.4rem] border-[6px] border-line2 bg-ink p-1.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
            <div className="absolute left-1/2 top-2.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-line2" />
            <div className="relative overflow-hidden rounded-[1.9rem]">
              {/* status bar */}
              <div
                className="flex items-center justify-between px-5 pb-1 pt-2.5 font-mono text-[9px] font-bold"
                style={{ backgroundColor: profile.palette.paper, color: profile.palette.ink }}
              >
                <span>9:41</span>
                <span className="flex items-center gap-1">
                  <span className="flex gap-px">
                    {[3, 5, 7, 9].map((h) => (
                      <span key={h} className="w-0.5 rounded-sm" style={{ height: h, backgroundColor: "currentColor" }} />
                    ))}
                  </span>
                  <span className="ml-1 inline-block h-2 w-4 rounded-[3px] border border-current p-px">
                    <span className="block h-full w-3/4 rounded-[1px]" style={{ backgroundColor: accent }} />
                  </span>
                </span>
              </div>
              <div className="h-[430px]">
                <MockSite profile={profile} appName={appName} accent={accent} route={route} size="phone" />
              </div>
            </div>
            <div className="absolute bottom-2.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-line2" />
          </div>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-dim">
            <IconPhone size={14} className="text-mint" /> mobile shell · 390×844
          </p>
        </div>

        {/* desktop */}
        <div className="flex w-full max-w-2xl flex-col items-center gap-4">
          <div className="w-full overflow-hidden rounded-xl border border-line2 bg-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blood/80 transition-colors hover:bg-blood" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold/80 transition-colors hover:bg-gold" />
              <span className="h-2.5 w-2.5 rounded-full bg-mint/80 transition-colors hover:bg-mint" />
              <span className="ml-3 flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-pane px-3 py-1 font-mono text-[11px] text-dim">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <span className="truncate">
                  {profile.host}
                  {route === "/" ? "" : route}
                </span>
              </span>
              <span className="border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-faint">
                1280×800
              </span>
            </div>
            <div className="h-[430px]">
              <MockSite profile={profile} appName={appName} accent={accent} route={route} size="desktop" />
            </div>
          </div>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-dim">
            <IconMonitor size={14} className="text-flare" /> desktop shell · tauri window
          </p>
        </div>
      </div>
    </div>
  );
}
