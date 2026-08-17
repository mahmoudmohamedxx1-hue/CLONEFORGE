/* CloneForge simulation engine — deterministic, seeded, zero backend. */

export type Kind = "website" | "repo";
export type TargetId = "android" | "ios" | "windows" | "macos" | "linux" | "pwa";
export type Tone = "info" | "ok" | "stage" | "warn";

export interface SourceProfile {
  url: string;
  kind: Kind;
  host: string;
  name: string;
  stack: string[];
  routes: string[];
  components: string[];
  palette: { accent: string; support: string; ink: string; paper: string };
  assets: number;
  similarity: number;
  stars?: number;
  license?: string;
  seed: number;
}

export interface LogLine {
  tag: string;
  text: string;
  tone: Tone;
  stage: number; // 0..4
  target?: TargetId;
}

export interface TargetMeta {
  id: TargetId;
  label: string;
  ext: string;
  arch: string;
  shell: string;
}

export const TARGETS: TargetMeta[] = [
  { id: "android", label: "Android", ext: "apk", arch: "arm64-v8a · armeabi-v7a", shell: "Gradle + WebView shell" },
  { id: "ios", label: "iOS", ext: "ipa", arch: "arm64 (simulator)", shell: "Xcode project + WKWebView" },
  { id: "windows", label: "Windows", ext: "exe", arch: "x64 · nsis installer", shell: "Tauri + WebView2" },
  { id: "macos", label: "macOS", ext: "dmg", arch: "arm64 + x86_64", shell: "Tauri + WKWebView" },
  { id: "linux", label: "Linux", ext: "AppImage", arch: "x86_64", shell: "Tauri + WebKitGTK" },
  { id: "pwa", label: "PWA", ext: "zip", arch: "universal · offline", shell: "Vite + Workbox SW" },
];

export const STAGES = ["Ingest", "Translate", "Adapt", "Package", "Sign"] as const;

/* ---------------- hashing / rng ---------------- */

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const between = (r: () => number, a: number, b: number) => a + r() * (b - a);

/* ---------------- url handling ---------------- */

export function normalizeUrl(raw: string): { ok: boolean; url?: string; host?: string; reason?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "Paste a repo or website URL first." };
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".") && u.hostname !== "localhost")
      return { ok: false, reason: "That doesn't look like a valid host." };
    return { ok: true, url: u.href, host: u.hostname.replace(/^www\./, "") };
  } catch {
    return { ok: false, reason: "Couldn't parse that URL — check for typos." };
  }
}

export function detectKind(raw: string): Kind {
  const s = raw.toLowerCase();
  return /github\.com|gitlab\.com|bitbucket\.org|\.git($|\s|\/)/.test(s) ? "repo" : "website";
}

/* ---------------- curated presets ---------------- */

interface Preset {
  kind: Kind;
  name: string;
  stack: string[];
  routes: string[];
  components: string[];
  palette: SourceProfile["palette"];
  stars?: number;
  license?: string;
}

const PRESETS: Record<string, Preset> = {
  "github.com/vercel/next.js": {
    kind: "repo",
    name: "Next.js",
    stack: ["Next.js 15", "React 19", "TypeScript", "Turbopack", "SWC"],
    routes: ["/docs", "/blog", "/showcase", "/examples", "/changelog"],
    components: ["NavBar", "MDXArticle", "CodeBlock", "SearchDialog", "TabsGroup", "FeatureGrid", "Footer"],
    palette: { accent: "#171717", support: "#0070f3", ink: "#0a0a0a", paper: "#fafafa" },
    stars: 184200,
    license: "MIT",
  },
  "github.com/shadcn-ui/ui": {
    kind: "repo",
    name: "shadcn/ui",
    stack: ["React", "Tailwind CSS", "Radix UI", "TypeScript", "RSC"],
    routes: ["/docs", "/blocks", "/charts", "/themes", "/examples"],
    components: ["CommandMenu", "DataTable", "ToastStack", "DialogShell", "SidebarNav", "CalendarGrid", "Badge"],
    palette: { accent: "#18181b", support: "#e11d48", ink: "#09090b", paper: "#ffffff" },
    stars: 91400,
    license: "MIT",
  },
  "github.com/tailwindlabs/tailwindcss": {
    kind: "repo",
    name: "Tailwind CSS",
    stack: ["TypeScript", "Lightning CSS", "PostCSS", "Vite"],
    routes: ["/docs", "/installation", "/styling", "/examples", "/play"],
    components: ["UtilityTable", "CodePreview", "NavRail", "SearchOverlay", "ColorScale", "SnippetCard"],
    palette: { accent: "#0ea5e9", support: "#38bdf8", ink: "#0f172a", paper: "#f8fafc" },
    stars: 92100,
    license: "MIT",
  },
  "stripe.com": {
    kind: "website",
    name: "Stripe",
    stack: ["React", "Next.js", "Stripe.js", "Sorbet"],
    routes: ["/", "/pricing", "/docs", "/customers", "/blog"],
    components: ["HeroCanvas", "PricingGrid", "FeatureRow", "CodeDemo", "GlobeViz", "Testimonial", "FooterMega"],
    palette: { accent: "#635bff", support: "#00d4ff", ink: "#0a2540", paper: "#f6f9fc" },
  },
  "linear.app": {
    kind: "website",
    name: "Linear",
    stack: ["React", "Electron", "GraphQL", "WebGL"],
    routes: ["/", "/features", "/pricing", "/changelog", "/docs"],
    components: ["IssueList", "CommandBar", "CycleBoard", "RoadmapView", "SidebarTree", "InboxFeed"],
    palette: { accent: "#5e6ad2", support: "#9ea1ff", ink: "#08090a", paper: "#f7f8f8" },
  },
  "notion.so": {
    kind: "website",
    name: "Notion",
    stack: ["React", "WebAssembly", "PostgreSQL", "Kafka"],
    routes: ["/", "/product", "/pricing", "/templates", "/blog"],
    components: ["BlockEditor", "PageTree", "DatabaseView", "CommentThread", "GalleryGrid", "ToggleList"],
    palette: { accent: "#e16259", support: "#37352f", ink: "#191919", paper: "#ffffff" },
  },
};

/* ---------------- scan ---------------- */

const STACK_POOL = ["React", "Vue 3", "Svelte 5", "Next.js", "Nuxt", "Astro", "TypeScript", "Tailwind CSS", "Node.js", "Go", "Rust", "GraphQL", "PostgreSQL"];
const SITE_ROUTES = ["/", "/pricing", "/docs", "/blog", "/about", "/changelog"];
const REPO_ROUTES = ["/docs", "/examples", "/api", "/changelog", "/issues"];
const SITE_COMPONENTS = ["HeroSection", "PricingGrid", "FeatureRow", "TestimonialWall", "NavBar", "CTABanner", "FAQAccordion", "Footer"];
const REPO_COMPONENTS = ["NavBar", "SidebarTree", "CodeBlock", "SearchDialog", "DataTable", "TabsGroup", "BadgeSet", "ToastStack"];

export function scanSource(url: string, host: string, kind: Kind): SourceProfile {
  const u = url.toLowerCase();
  const h = host.toLowerCase();
  const exact = Object.keys(PRESETS).find((k) => u.includes(k) || h === k || h.endsWith("." + k));
  const preset = exact ? PRESETS[exact] : undefined;
  const seed = hashStr(host.toLowerCase() + "::" + kind);
  const r = rng(seed);

  const base = host.toLowerCase();
  const repoMatch = base.match(/(?:github|gitlab|bitbucket)\.com\/[^/]+\/([^/.]+)/);
  const name =
    preset?.name ??
    (repoMatch
      ? repoMatch[1].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : host.split(".")[0].replace(/\b\w/g, (c) => c.toUpperCase()));

  const hue = Math.floor(r() * 360);
  const stack = preset?.stack ?? Array.from(new Set([pick(r, STACK_POOL), pick(r, STACK_POOL), pick(r, STACK_POOL), pick(r, STACK_POOL)]));
  const routes = preset?.routes ?? (kind === "repo" ? REPO_ROUTES : SITE_ROUTES).slice(0, 4 + Math.floor(r() * 2));
  const components = preset?.components ?? (kind === "repo" ? REPO_COMPONENTS : SITE_COMPONENTS).slice(0, 6 + Math.floor(r() * 3));

  return {
    url,
    kind,
    host,
    name,
    stack,
    routes,
    components,
    palette:
      preset?.palette ?? {
        accent: `hsl(${hue} 78% 55%)`,
        support: `hsl(${(hue + 150) % 360} 55% 62%)`,
        ink: `hsl(${hue} 22% 11%)`,
        paper: `hsl(${hue} 30% 97%)`,
      },
    assets: Math.floor(between(r, 46, 240)),
    similarity: Math.round(between(r, 96.2, 99.4) * 10) / 10,
    stars: preset?.stars ?? (kind === "repo" ? Math.floor(between(r, 800, 48000)) : undefined),
    license: preset?.license ?? (kind === "repo" ? pick(r, ["MIT", "Apache-2.0", "BSD-3", "GPL-3.0"]) : undefined),
    seed,
  };
}

/* ---------------- build script ---------------- */

export function buildScript(p: SourceProfile, targets: TargetId[], appName: string): LogLine[] {
  const r = rng(p.seed ^ 0x9e3779b9);
  const lines: LogLine[] = [];
  const L = (tag: string, text: string, tone: Tone, stage: number, target?: TargetId) =>
    lines.push({ tag, text, tone, stage, target });

  L("forge", `target → ${p.url}`, "info", 0);
  L("fetch", `GET ${p.host} … 200 OK (${Math.floor(between(r, 84, 420))} ms)`, "info", 0);
  L("mirror", `${p.assets} assets pinned to local cache`, "info", 0);
  L("tree", `${p.routes.length} routes · ${p.components.length} components mapped`, "ok", 0);
  L("parse", `stack → ${p.stack.slice(0, 4).join(" + ")}`, "info", 1);
  L("xlate", `DOM → native bridge · ${p.components.length} component bindings`, "info", 1);
  L("theme", `palette extracted · injecting app accent`, "info", 1);
  L("layout", `breakpoints → 390×844 (mobile) / 1280×800 (desktop)`, "info", 2);
  L("nav", `stack navigator wired to ${p.routes.length} routes`, "info", 2);
  L("meta", `app id “${appName}” · version 1.0.0`, "ok", 2);

  const perTarget: Record<string, LogLine[]> = {};
  for (const t of targets) {
    const meta = TARGETS.find((m) => m.id === t)!;
    const n = Math.floor(between(r, 60, 180));
    const rows: [string, string, Tone][] =
      t === "android"
        ? [
            ["gradle", "com.android.tools.build:gradle:8.6.1 resolved", "info"],
            ["aapt2", `linking ${p.assets} resources`, "info"],
            ["kotlin", `compiling ${n} sources (k2 compiler)`, "info"],
            ["d8", "dex merge → classes.dex", "info"],
            ["align", "zipalign · 4-byte boundaries", "info"],
            [`✔`, `app-release.${meta.ext} signed (debug keystore)`, "ok"],
          ]
        : t === "ios"
          ? [
              ["spm", "resolving package mirrors", "info"],
              ["swiftc", `compiling ${n} modules for arm64`, "info"],
              ["assets", "asset catalog thinned · @2x @3x", "info"],
              ["plist", "Info.plist → CFBundle “" + appName + "”", "info"],
              ["codesign", "identity “CloneForge Dev” applied", "info"],
              [`✔`, `${appName}.${meta.ext} exported (simulator)`, "ok"],
            ]
          : t === "windows"
            ? [
                ["cargo", "tauri bundler v2 · release profile", "info"],
                ["webview2", "bootstrapper staged", "info"],
                ["rcedit", "icon + version info embedded", "info"],
                ["nsis", `compressing ${p.assets} resources`, "info"],
                ["signtool", "timestamp applied (simulated)", "info"],
                [`✔`, `${appName}-setup.${meta.ext} built`, "ok"],
              ]
            : t === "macos"
              ? [
                  ["cargo", "tauri bundler v2 · universal binary", "info"],
                  ["bundle", `${appName}.app → Info.plist written`, "info"],
                  ["codesign", "hardened runtime + entitlements", "info"],
                  ["notary", "notarization ticket (simulated)", "warn"],
                  ["hdiutil", "creating read-only dmg", "info"],
                  [`✔`, `${appName}.${meta.ext} ready`, "ok"],
                ]
              : t === "linux"
                ? [
                    ["cargo", "tauri bundler v2 · release profile", "info"],
                    ["appdir", "staging AppDir + desktop entry", "info"],
                    ["webkitgtk", "runtime dependency pinned", "info"],
                    ["zsync", "delta metadata generated", "info"],
                    [`✔`, `${appName}.${meta.ext} built`, "ok"],
                  ]
                : [
                    ["vite", "client bundle → 212 kB gzip", "info"],
                    ["workbox", `precaching ${p.assets} routes`, "info"],
                    ["manifest", "web app manifest + icons emitted", "info"],
                    ["sw", "service worker registered (offline)", "info"],
                    [`✔`, `${appName}-pwa.${meta.ext} packed`, "ok"],
                  ];
    perTarget[t] = rows.map(([tag, text, tone]) => ({ tag: t, text: `${tag} → ${text}`, tone, stage: 3, target: t }));
  }

  // interleave round-robin so the console feels parallel
  let more = true;
  let i = 0;
  while (more) {
    more = false;
    for (const t of targets) {
      if (i < perTarget[t].length) {
        lines.push(perTarget[t][i]);
        more = true;
      }
    }
    i++;
  }

  L("sign", `codesign + checksums for ${targets.length} artifacts`, "info", 4);
  L("scan", "41 supply-chain checks passed · 0 vulnerabilities", "ok", 4);
  L("forge", `BUILD SUCCEEDED — ${targets.length} platforms · ${p.similarity}% UI fidelity`, "ok", 4);
  L("note", "artifacts are signed manifests (in-browser demo)", "warn", 4);
  return lines;
}

/* ---------------- artifacts ---------------- */

export function artifactSize(t: TargetId, p: SourceProfile): number {
  const r = rng(p.seed ^ hashStr(t));
  const base: Record<TargetId, [number, number]> = {
    android: [17, 32],
    ios: [30, 52],
    windows: [9, 18],
    macos: [24, 40],
    linux: [20, 34],
    pwa: [1.4, 3.6],
  };
  return between(r, base[t][0], base[t][1]) * 1024 * 1024;
}

export function fmtBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} kB`;
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app";
}

export function downloadManifest(opts: {
  appName: string;
  profile: SourceProfile;
  targets: TargetId[];
  version: string;
  target?: TargetId;
}) {
  const { appName, profile, targets, version, target } = opts;
  const meta = target ? TARGETS.find((t) => t.id === target) : undefined;
  const body = {
    generator: "CloneForge v0.9.4-beta (simulated pipeline)",
    app: appName,
    version,
    source: profile.url,
    sourceKind: profile.kind,
    bundleId: `com.cloneforge.${slugify(appName)}`,
    uiFidelity: `${profile.similarity}%`,
    generatedAt: new Date().toISOString(),
    artifacts: (target ? [meta!] : TARGETS.filter((t) => targets.includes(t.id))).map((t) => ({
      platform: t.label,
      file: `${slugify(appName)}-${version}-${t.id}.${t.ext}`,
      arch: t.arch,
      shell: t.shell,
      sizeBytes: Math.round(artifactSize(t.id, profile)),
      signature: hashStr(appName + t.id).toString(16).padStart(8, "0"),
    })),
  };
  const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = meta
    ? `${slugify(appName)}-${version}-${meta.id}-manifest.json`
    : `${slugify(appName)}-${version}-all-manifests.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------------- fake-but-honest QR ---------------- */

export function qrMatrix(text: string, n = 21): boolean[][] {
  const r = rng(hashStr("qr::" + text));
  const m: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => r() > 0.52));
  const finder = (x: number, y: number) => {
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 7; j++) {
        const edge = i === 0 || i === 6 || j === 0 || j === 6;
        const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        m[y + j][x + i] = edge || core;
      }
    for (let i = -1; i < 8; i++)
      for (let j = -1; j < 8; j++) {
        const yy = y + j, xx = x + i;
        if (yy >= 0 && yy < n && xx >= 0 && xx < n && (i === -1 || i === 7 || j === -1 || j === 7)) m[yy][xx] = false;
      }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  return m;
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
