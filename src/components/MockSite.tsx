import type { SourceProfile } from "../lib/engine";

interface Props {
  profile: SourceProfile;
  appName: string;
  accent: string;
  route: string;
  size: "phone" | "desktop";
}

/** A miniature render of the "cloned" app, themed by the extracted palette + chosen accent. */
export default function MockSite({ profile, appName, accent, route, size }: Props) {
  const { paper, ink } = profile.palette;
  const phone = size === "phone";
  const initials = appName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isHome = route === "/" || route === profile.routes[0];

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: paper, color: ink }}
    >
      {/* app bar */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: `${ink}18`, backgroundColor: paper }}
      >
        <span
          className={`flex items-center justify-center rounded-md font-bold text-white ${
            phone ? "h-5 w-5 text-[8px]" : "h-6 w-6 text-[10px]"
          }`}
          style={{ backgroundColor: accent }}
        >
          {initials}
        </span>
        <span className={`font-semibold ${phone ? "text-[9px]" : "text-[11px]"}`}>{appName}</span>
        {!phone && (
          <span className="ml-3 flex gap-2.5">
            {profile.routes.slice(0, 4).map((r) => (
              <span
                key={r}
                className="text-[9px] opacity-70"
                style={r === route ? { color: accent, opacity: 1, fontWeight: 600 } : undefined}
              >
                {r === "/" ? "home" : r.slice(1)}
              </span>
            ))}
          </span>
        )}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-semibold text-white ${phone ? "text-[7px]" : "text-[9px]"}`}
          style={{ backgroundColor: accent }}
        >
          Get app
        </span>
      </div>

      {/* body */}
      <div className="flex-1 overflow-hidden px-3 py-3">
        {isHome ? (
          <>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="rounded-full px-1.5 py-px font-medium" style={{ backgroundColor: `${accent}22`, color: accent, fontSize: phone ? 6 : 8 }}>
                {profile.kind === "repo" ? "OPEN SOURCE" : "LIVE MIRROR"}
              </span>
              <span className="opacity-50" style={{ fontSize: phone ? 6 : 8 }}>
                v1.0.0
              </span>
            </div>
            <p className={`font-bold leading-tight ${phone ? "text-[13px]" : "text-[19px]"}`}>
              {profile.name},
              <br />
              now an app.
            </p>
            <p className={`mt-1 opacity-60 ${phone ? "text-[8px] leading-snug" : "text-[10px]"}`}>
              Cloned from {profile.host} — {profile.routes.length} routes, {profile.components.length} components,
              pixel-matched at {profile.similarity}%.
            </p>
            <div className="mt-2 flex gap-1.5">
              <span className="rounded-md px-2 py-1 font-semibold text-white" style={{ backgroundColor: accent, fontSize: phone ? 7 : 9 }}>
                Install
              </span>
              <span
                className="rounded-md border px-2 py-1 font-semibold"
                style={{ borderColor: `${ink}30`, fontSize: phone ? 7 : 9 }}
              >
                Preview
              </span>
            </div>
            {/* component cards */}
            <div className={`mt-3 grid gap-1.5 ${phone ? "grid-cols-2" : "grid-cols-3"}`}>
              {profile.components.slice(0, phone ? 4 : 6).map((c, i) => (
                <div key={c} className="rounded-lg border p-1.5" style={{ borderColor: `${ink}14` }}>
                  <div className="mb-1 h-4 rounded-md" style={{ backgroundColor: i % 3 === 0 ? accent : `${accent}33` }} />
                  <div className={`font-medium ${phone ? "text-[6.5px]" : "text-[8px]"}`}>{c}</div>
                  <div className="mt-0.5 h-0.5 w-3/4 rounded" style={{ backgroundColor: `${ink}20` }} />
                  <div className="mt-0.5 h-0.5 w-1/2 rounded" style={{ backgroundColor: `${ink}14` }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className={`font-bold ${phone ? "text-[12px]" : "text-[17px]"}`}>{route}</p>
            <p className={`mt-0.5 opacity-55 ${phone ? "text-[7.5px]" : "text-[9.5px]"}`}>
              Route mirrored from {profile.host}
            </p>
            <div className="mt-2.5 space-y-1.5">
              {[86, 72, 91, 64, 80].map((w, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 shrink-0 rounded" style={{ backgroundColor: i === 1 ? accent : `${accent}30` }} />
                  <span className="h-1.5 rounded" style={{ width: `${w}%`, backgroundColor: `${ink}18` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border p-2" style={{ borderColor: `${ink}14` }}>
              <div className={`font-semibold ${phone ? "text-[7px]" : "text-[9px]"}`}>
                {profile.components[iMod(route, profile.components.length)]}
              </div>
              <div className="mt-1 h-6 rounded-md" style={{ background: `linear-gradient(120deg, ${accent}55, ${accent}18)` }} />
            </div>
          </>
        )}
      </div>

      {/* footer / tab bar */}
      {phone ? (
        <div className="flex items-center justify-around border-t px-2 py-1.5" style={{ borderColor: `${ink}14` }}>
          {profile.routes.slice(0, 4).map((r) => (
            <span
              key={r}
              className="flex flex-col items-center gap-0.5"
              style={{ opacity: r === route ? 1 : 0.4 }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r === route ? accent : ink }} />
              <span style={{ fontSize: 5.5, fontWeight: 600 }}>{r === "/" ? "home" : r.slice(1, 9)}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between border-t px-3 py-1.5" style={{ borderColor: `${ink}12` }}>
          <span style={{ fontSize: 7, opacity: 0.5 }}>© {new Date().getFullYear()} {appName} — forged by CloneForge</span>
          <span className="flex gap-2">
            {["win", "mac", "linux"].map((o) => (
              <span key={o} className="rounded border px-1" style={{ fontSize: 6.5, borderColor: `${ink}25`, opacity: 0.6 }}>
                {o}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function iMod(s: string, len: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % Math.max(1, len);
}
