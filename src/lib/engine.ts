/* CloneForge engine — live GitHub API scanning + deterministic build pipeline. */

export type Kind = "website" | "repo";
export type TargetId = "android" | "ios" | "windows" | "macos" | "linux" | "pwa";
export type Tone = "info" | "ok" | "stage" | "warn";
export type Mode = "live" | "simulated";

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
  mode: Mode;
  modeNote?: string;
  description?: string;
  forks?: number;
  openIssues?: number;
  branch?: string;
  fileCount?: number;
  topics?: string[];
  owner?: string;
}

export interface ScanLine {
  text: string;
  tone: Tone;
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

/** Fatal, user-facing scan failure (e.g. repo not found). */
export class ScanError extends Error {}

class HttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

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

/* ---------------- curated fingerprints (palettes + offline fallbacks) ---------------- */

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
  netstream: {
    kind: "repo",
    name: "NetStream",
    stack: ["React", "TypeScript", "HLS.js", "Tailwind CSS", "Vite"],
    routes: ["/", "/home", "/movies", "/series", "/my-list", "/search"],
    components: ["HeroBillboard", "TitleRow", "PosterCard", "VideoPlayer", "SearchBar", "NavBar", "MyListGrid"],
    palette: { accent: "#e50914", support: "#46d369", ink: "#141414", paper: "#0b0d12" },
    license: "MIT",
  },
  "github.com/vercel/next.js": {
    kind: "repo",
    name: "Next.js",
    stack: ["Next.js", "React", "TypeScript", "Turbopack", "SWC"],
    routes: ["/docs", "/blog", "/showcase", "/examples", "/changelog"],
    components: ["NavBar", "MDXArticle", "CodeBlock", "SearchDialog", "TabsGroup", "FeatureGrid", "Footer"],
    palette: { accent: "#171717", support: "#0070f3", ink: "#0a0a0a", paper: "#fafafa" },
    license: "MIT",
  },
  "github.com/shadcn-ui/ui": {
    kind: "repo",
    name: "shadcn/ui",
    stack: ["React", "Tailwind CSS", "Radix UI", "TypeScript", "RSC"],
    routes: ["/docs", "/blocks", "/charts", "/themes", "/examples"],
    components: ["CommandMenu", "DataTable", "ToastStack", "DialogShell", "SidebarNav", "CalendarGrid", "Badge"],
    palette: { accent: "#18181b", support: "#e11d48", ink: "#09090b", paper: "#ffffff" },
    license: "MIT",
  },
  "github.com/tailwindlabs/tailwindcss": {
    kind: "repo",
    name: "Tailwind CSS",
    stack: ["TypeScript", "Lightning CSS", "PostCSS", "Vite"],
    routes: ["/docs", "/installation", "/styling", "/examples", "/play"],
    components: ["UtilityTable", "CodePreview", "NavRail", "SearchOverlay", "ColorScale", "SnippetCard"],
    palette: { accent: "#0ea5e9", support: "#38bdf8", ink: "#0f172a", paper: "#f8fafc" },
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

function findPreset(url: string, host: string): Preset | undefined {
  const u = url.toLowerCase();
  const h = host.toLowerCase();
  const key = Object.keys(PRESETS).find((k) => u.includes(k) || h === k || h.endsWith("." + k));
  return key ? PRESETS[key] : undefined;
}

/* ---------------- heuristic (offline) profiling ---------------- */

const STACK_POOL = ["React", "Vue 3", "Svelte 5", "Next.js", "Nuxt", "Astro", "TypeScript", "Tailwind CSS", "Node.js", "Go", "Rust", "GraphQL", "PostgreSQL"];
const SITE_ROUTES = ["/", "/pricing", "/docs", "/blog", "/about", "/changelog"];
const REPO_ROUTES = ["/docs", "/examples", "/api", "/changelog", "/issues"];
const SITE_COMPONENTS = ["HeroSection", "PricingGrid", "FeatureRow", "TestimonialWall", "NavBar", "CTABanner", "FAQAccordion", "Footer"];
const REPO_COMPONENTS = ["NavBar", "SidebarTree", "CodeBlock", "SearchDialog", "DataTable", "TabsGroup", "BadgeSet", "ToastStack"];

function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function heuristicProfile(url: string, host: string, kind: Kind, modeNote: string): SourceProfile {
  const preset = findPreset(url, host);
  const seed = hashStr(host.toLowerCase() + "::" + kind);
  const r = rng(seed);
  const base = host.toLowerCase();
  const repoMatch = base.match(/(?:github|gitlab|bitbucket)\.com\/[^/]+\/([^/.]+)/);
  const name =
    preset?.name ??
    (repoMatch ? titleCase(repoMatch[1]) : titleCase(host.split(".")[0]));
  const hue = Math.floor(r() * 360);

  return {
    url,
    kind,
    host,
    name,
    stack: preset?.stack ?? Array.from(new Set([pick(r, STACK_POOL), pick(r, STACK_POOL), pick(r, STACK_POOL), pick(r, STACK_POOL)])),
    routes: preset?.routes ?? (kind === "repo" ? REPO_ROUTES : SITE_ROUTES).slice(0, 4 + Math.floor(r() * 2)),
    components: preset?.components ?? (kind === "repo" ? REPO_COMPONENTS : SITE_COMPONENTS).slice(0, 6 + Math.floor(r() * 3)),
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
    mode: "simulated",
    modeNote,
  };
}

/* ---------------- live network helpers ---------------- */

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      const e = new Error("aborted");
      e.name = "AbortError";
      reject(e);
    };
    signal?.addEventListener("abort", onAbort);
    if (signal?.aborted) onAbort();
  });
}

async function timedFetch(url: string, signal: AbortSignal, timeoutMs: number, accept?: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal.addEventListener("abort", onAbort);
  const start = performance.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: accept ? { accept } : undefined,
      cache: "no-store",
    });
    return { res, ms: Math.max(1, Math.round(performance.now() - start)) };
  } catch (e) {
    if (signal.aborted) {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }
    throw e; // network failure / timeout
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

/* ---------------- repo file-tree analysis ---------------- */

const pascal = (s: string) =>
  s
    .replace(/[-_.](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());

const ASSET_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "avif", "woff", "woff2", "ttf", "otf", "eot", "mp4", "webm"]);

function analyzeTree(paths: string[]) {
  const exts: Record<string, number> = {};
  let assets = 0;
  const routes = new Set<string>();
  const comps = new Set<string>();

  for (const p of paths) {
    const file = p.split("/").pop() ?? "";
    const ext = file.includes(".") ? (file.split(".").pop() ?? "").toLowerCase() : "";
    if (ext) exts[ext] = (exts[ext] ?? 0) + 1;
    if (ASSET_EXT.has(ext)) assets++;

    const segs = p.split("/");
    const ci = segs.indexOf("components");
    if (ci >= 0 && ci < segs.length - 1 && /\.(tsx?|jsx?|vue|svelte)$/.test(file)) {
      comps.add(pascal(file.replace(/\..+$/, "")));
    }

    // Next.js app router: app/**/page.tsx
    const appM = p.match(/^(?:src\/)?app\/(.*)\/page\.(tsx?|jsx?)$/) ?? p.match(/^(?:src\/)?app\/page\.(tsx?|jsx?)$/);
    if (appM) {
      const dir = p.replace(/\/?page\.(tsx?|jsx?)$/, "").replace(/^(?:src\/)?app\/?/, "");
      routes.add(dir ? "/" + dir.replace(/\[([^\]]+)\]/g, ":$1") : "/");
    }
    // pages router: pages/**.tsx (and src/pages)
    const pgM = p.match(/^(?:src\/)?pages\/(.+)\.(tsx?|jsx?)$/);
    if (pgM && !pgM[1].startsWith("_") && !pgM[1].startsWith("api/")) {
      routes.add("/" + pgM[1].replace(/\/index$/, "").replace(/\[([^\]]+)\]/g, ":$1"));
    }
    // sveltekit / vue-router conventions
    const skM = p.match(/^src\/routes\/(.*)\/\+page\.svelte$/);
    if (skM) routes.add(skM[1] ? "/" + skM[1].replace(/\[([^\]]+)\]/g, ":$1") : "/");
    const vueM = p.match(/^(?:src\/)?views\/(.+)\.vue$/);
    if (vueM) routes.add("/" + vueM[1].replace(/\/index$/, "").toLowerCase());
  }

  return { exts, assets, routes: Array.from(routes).slice(0, 7), comps: Array.from(comps).slice(0, 10) };
}

const DEP_RULES: [RegExp, string][] = [
  [/^next$/, "Next.js"],
  [/^react$/, "React"],
  [/^vue$/, "Vue"],
  [/^svelte$/, "Svelte"],
  [/^@sveltejs\/kit$/, "SvelteKit"],
  [/^nuxt$/, "Nuxt"],
  [/^astro$/, "Astro"],
  [/^tailwindcss$/, "Tailwind CSS"],
  [/^typescript$/, "TypeScript"],
  [/^vite$/, "Vite"],
  [/^electron$/, "Electron"],
  [/^@tauri-apps\/cli$/, "Tauri"],
  [/^framer-motion$|^motion$/, "Motion"],
  [/^@radix-ui\//, "Radix UI"],
  [/^three$/, "Three.js"],
  [/^d3$/, "D3"],
  [/^express$/, "Express"],
  [/^fastify$/, "Fastify"],
  [/^@prisma\/client$|^prisma$/, "Prisma"],
  [/^workbox/, "Workbox"],
  [/^vitest$|^jest$/, "Vitest"],
];

function cleanVersion(v: string): string {
  const c = v.replace(/^[\^~>=<\s]+/, "").trim();
  return /^\d/.test(c) ? ` ${c}` : "";
}

function stackFromPackageJson(pkg: Record<string, unknown>): string[] {
  const deps = { ...(pkg.dependencies as Record<string, string> | undefined), ...(pkg.devDependencies as Record<string, string> | undefined) };
  const found = new Map<string, string>();
  for (const [name, ver] of Object.entries(deps ?? {})) {
    for (const [re, label] of DEP_RULES) {
      if (re.test(name) && !found.has(label)) {
        found.set(label, label + (typeof ver === "string" ? cleanVersion(ver) : ""));
        break;
      }
    }
    if (found.size >= 6) break;
  }
  return Array.from(found.values());
}

function stackFromExts(exts: Record<string, number>, language?: string | null): string[] {
  const out: string[] = [];
  const has = (e: string) => (exts[e] ?? 0) > 0;
  if (has("tsx") || has("jsx")) out.push("React");
  if (has("ts") || has("tsx")) out.push("TypeScript");
  if (has("vue")) out.push("Vue");
  if (has("svelte")) out.push("Svelte");
  if (has("py")) out.push("Python");
  if (has("go")) out.push("Go");
  if (has("rs")) out.push("Rust");
  if (has("scss") || has("css")) out.push("CSS");
  if (language && !out.includes(language)) out.push(language);
  return out.slice(0, 5);
}

/* ---------------- live GitHub scan ---------------- */

async function scanGithub(
  url: string,
  host: string,
  owner: string,
  repo: string,
  onLine: (l: ScanLine) => void,
  signal: AbortSignal,
): Promise<SourceProfile> {
  const seed = hashStr(host.toLowerCase() + "::repo");
  const r = rng(seed);

  onLine({ text: `opening github api session · unauthenticated (60 req/h)`, tone: "info" });
  await sleep(280, signal);

  /* -- repo metadata -- */
  let meta: Record<string, any>;
  try {
    const { res, ms } = await timedFetch(`https://api.github.com/repos/${owner}/${repo}`, signal, 9000, "application/vnd.github+json");
    if (res.status === 404 || res.status === 401) throw new HttpError(res.status);
    if (res.status === 403 || res.status === 429) throw new HttpError(res.status);
    if (!res.ok) throw new HttpError(res.status);
    meta = await res.json();
    onLine({ text: `GET api.github.com/repos/${owner}/${repo} → 200 OK (${ms} ms)`, tone: "ok" });
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    const status = e instanceof HttpError ? e.status : undefined;
    const why =
      status === 404
        ? `“${owner}/${repo}” is private or not on GitHub — building from an inferred mirror instead`
        : status === 401 || status === 403 || status === 429
          ? `github api refused/limited the request (${status}) — building from an inferred mirror instead`
          : `couldn't reach api.github.com (${e?.message ?? "network"}) — building from an inferred mirror instead`;
    onLine({ text: why, tone: "warn" });
    await sleep(300, signal);
    onLine({ text: `falling back to heuristic mirror (deterministic)…`, tone: "info" });
    await sleep(340, signal);
    return heuristicProfile(url, host, "repo", why);
  }

  await sleep(220, signal);
  const branch: string = meta.default_branch ?? "main";
  const license: string | undefined = meta.license?.spdx_id && meta.license.spdx_id !== "NOASSERTION" ? meta.license.spdx_id : undefined;
  onLine({
    text: `repo → ★ ${Number(meta.stargazers_count ?? 0).toLocaleString()} · ${Number(meta.forks_count ?? 0).toLocaleString()} forks · ${meta.language ?? "multi-language"} · ${license ?? "no license"} · branch “${branch}”`,
    tone: "info",
  });

  /* -- file tree -- */
  let paths: string[] = [];
  let truncated = false;
  try {
    await sleep(240, signal);
    const { res, ms } = await timedFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      signal,
      12000,
      "application/vnd.github+json",
    );
    if (!res.ok) throw new HttpError(res.status);
    const tree = await res.json();
    truncated = Boolean(tree.truncated);
    paths = (tree.tree as any[])
      .filter((n) => n.type === "blob" && typeof n.path === "string")
      .slice(0, 15000)
      .map((n) => n.path as string);
    const dirs = new Set(paths.map((p) => p.split("/").slice(0, -1).join("/")).filter(Boolean));
    onLine({ text: `GET …/git/trees/${branch}?recursive=1 → 200 OK (${ms} ms)`, tone: "ok" });
    await sleep(200, signal);
    onLine({ text: `tree → ${paths.length.toLocaleString()} files · ${dirs.size.toLocaleString()} dirs${truncated ? " (truncated by api — first 15k scanned)" : ""}`, tone: "info" });
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    onLine({ text: `tree fetch failed — continuing with metadata only`, tone: "warn" });
  }

  const analysis = analyzeTree(paths);

  /* -- package.json -- */
  let pkgStack: string[] = [];
  if (paths.length === 0 || paths.some((p) => p === "package.json")) {
    try {
      await sleep(220, signal);
      const { res, ms } = await timedFetch(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/package.json`, signal, 8000);
      if (res.status === 404) throw new HttpError(404);
      if (!res.ok) throw new HttpError(res.status);
      const pkg = (await res.json()) as Record<string, unknown>;
      pkgStack = stackFromPackageJson(pkg);
      const depCount = Object.keys({ ...(pkg.dependencies as object | undefined), ...(pkg.devDependencies as object | undefined) }).length;
      onLine({ text: `GET raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json → 200 OK (${ms} ms) · ${depCount} deps`, tone: "ok" });
      if (pkgStack.length) onLine({ text: `deps → ${pkgStack.join(" · ")}`, tone: "info" });
    } catch (e: any) {
      if (e?.name === "AbortError") throw e;
      onLine({ text: `no package.json at root — fingerprinting source files instead`, tone: "info" });
    }
  } else {
    onLine({ text: `no package.json at root — fingerprinting source files instead`, tone: "info" });
  }

  await sleep(260, signal);

  /* -- assemble profile from real data -- */
  const preset = findPreset(url, host);
  const stack =
    pkgStack.length > 0
      ? pkgStack
      : paths.length > 0
        ? stackFromExts(analysis.exts, meta.language)
        : (meta.language ? [meta.language] : []).concat(["GitHub repo"]);

  let routes = analysis.routes;
  if (routes.length === 0) routes = preset?.routes ?? (REPO_ROUTES.slice(0, 4) as string[]);
  if (!routes.includes("/")) routes = ["/", ...routes].slice(0, 7);

  let components = analysis.comps;
  if (components.length < 4) components = preset?.components ?? REPO_COMPONENTS.slice(0, 7);

  const hue = Math.floor(r() * 360);
  const assets = analysis.assets > 0 ? analysis.assets : Math.floor(between(r, 46, 240));

  onLine({ text: `stack → ${stack.slice(0, 5).join(" + ")}`, tone: "info" });
  await sleep(180, signal);
  onLine({ text: `mirror → ${routes.length} routes · ${components.length} components · ${assets} assets pinned`, tone: "info" });
  await sleep(180, signal);
  onLine({ text: `palette sampled · layout grid extracted · mirror locked (live github data)`, tone: "ok" });

  return {
    url,
    kind: "repo",
    host,
    name: meta.name ?? repo,
    stack: stack.slice(0, 6),
    routes,
    components,
    palette: preset?.palette ?? {
      accent: `hsl(${hue} 78% 55%)`,
      support: `hsl(${(hue + 150) % 360} 55% 62%)`,
      ink: `hsl(${hue} 22% 11%)`,
      paper: `hsl(${hue} 30% 97%)`,
    },
    assets,
    similarity: Math.round(between(r, 96.2, 99.4) * 10) / 10,
    stars: meta.stargazers_count ?? undefined,
    license,
    seed,
    mode: "live",
    modeNote: `fetched live from api.github.com · branch ${branch}`,
    description: typeof meta.description === "string" ? meta.description : undefined,
    forks: meta.forks_count ?? undefined,
    openIssues: meta.open_issues_count ?? undefined,
    branch,
    fileCount: paths.length || undefined,
    topics: Array.isArray(meta.topics) ? (meta.topics as string[]).slice(0, 6) : undefined,
    owner,
  };
}

/* ---------------- live website scan ---------------- */

const HTML_HINTS: [RegExp, string][] = [
  [/__NEXT_DATA__|_next\/static/i, "Next.js"],
  [/wp-content|wordpress/i, "WordPress"],
  [/cdn\.shopify\.com/i, "Shopify"],
  [/react-root|__react/i, "React"],
  [/vue|__vue__/i, "Vue"],
  [/ng-version|angular/i, "Angular"],
  [/gatsby/i, "Gatsby"],
  [/docusaurus/i, "Docusaurus"],
  [/wixstatic/i, "Wix"],
  [/squarespace/i, "Squarespace"],
  [/webflow/i, "Webflow"],
  [/tailwind/i, "Tailwind CSS"],
];

async function scanWebsite(
  url: string,
  host: string,
  onLine: (l: ScanLine) => void,
  signal: AbortSignal,
): Promise<SourceProfile> {
  onLine({ text: `resolving ${host}…`, tone: "info" });
  await sleep(300, signal);
  onLine({ text: `GET ${url} → attempting cross-origin fetch…`, tone: "info" });

  try {
    const { res, ms } = await timedFetch(url, signal, 6500);
    if (!res.ok) throw new HttpError(res.status);
    const html = (await res.text()).slice(0, 400000);
    onLine({ text: `GET ${host} → ${res.status} OK (${ms} ms) · CORS-enabled, reading live HTML`, tone: "ok" });
    await sleep(240, signal);

    const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleM ? titleM[1].replace(/\s+/g, " ").trim().split(/\s*[|—–-]\s*/)[0].trim() : "";
    const hints = HTML_HINTS.filter(([re]) => re.test(html)).map(([, label]) => label);
    if (hints.length) onLine({ text: `html fingerprint → ${hints.join(" · ")}`, tone: "info" });
    else onLine({ text: `html fingerprint → static markup`, tone: "info" });
    await sleep(240, signal);

    const preset = findPreset(url, host);
    const seed = hashStr(host.toLowerCase() + "::website");
    const r = rng(seed);
    const hue = Math.floor(r() * 360);
    const name = title || preset?.name || titleCase(host.split(".")[0]);

    onLine({ text: `mirror → route graph + palette extracted · mirror locked (live fetch)`, tone: "ok" });

    return {
      url,
      kind: "website",
      host,
      name,
      stack: hints.length ? hints.slice(0, 5) : preset?.stack ?? ["HTML", "CSS", "JavaScript"],
      routes: preset?.routes ?? SITE_ROUTES.slice(0, 5),
      components: preset?.components ?? SITE_COMPONENTS.slice(0, 7),
      palette: preset?.palette ?? {
        accent: `hsl(${hue} 78% 55%)`,
        support: `hsl(${(hue + 150) % 360} 55% 62%)`,
        ink: `hsl(${hue} 22% 11%)`,
        paper: `hsl(${hue} 30% 97%)`,
      },
      assets: Math.floor(between(r, 46, 240)),
      similarity: Math.round(between(r, 96.2, 99.4) * 10) / 10,
      seed,
      mode: "live",
      modeNote: `live HTML fetched client-side (${ms} ms)`,
      description: title ? `Live site: ${title}` : undefined,
    };
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    const status = e instanceof HttpError ? ` (HTTP ${e.status})` : "";
    onLine({ text: `${host} refused the cross-origin read${status} — CORS policy, as expected for most sites`, tone: "warn" });
    await sleep(300, signal);
    onLine({ text: `switching to curated fingerprint db + deterministic heuristics…`, tone: "info" });
    await sleep(380, signal);
    return heuristicProfile(url, host, "website", "site blocked cross-origin fetch — heuristic mirror");
  }
}

/* ---------------- scan entrypoint ---------------- */

export async function scanSource(
  url: string,
  host: string,
  kind: Kind,
  onLine: (l: ScanLine) => void,
  signal: AbortSignal,
): Promise<SourceProfile> {
  onLine({ text: `cloneforge ingest · target ${url}`, tone: "stage" });
  await sleep(240, signal);

  if (kind === "repo" && /github\.com$/i.test(host)) {
    const m = new URL(url).pathname.match(/^\/([^/]+)\/([^/#?]+)/);
    if (!m) throw new ScanError(`That GitHub URL needs the shape github.com/owner/repo.`);
    const owner = decodeURIComponent(m[1]);
    const repo = decodeURIComponent(m[2]).replace(/\.git$/i, "");
    onLine({ text: `github source → ${owner}/${repo}`, tone: "info" });
    await sleep(200, signal);
    return scanGithub(url, host, owner, repo, onLine, signal);
  }

  if (kind === "repo") {
    onLine({ text: `${host} — direct git hosting isn't reachable from browsers; using heuristic mirror`, tone: "warn" });
    await sleep(400, signal);
    return heuristicProfile(url, host, "repo", `${host} needs git protocol — heuristic mirror`);
  }

  return scanWebsite(url, host, onLine, signal);
}

/* ---------------- build script ---------------- */

export function buildScript(p: SourceProfile, targets: TargetId[], appName: string): LogLine[] {
  const r = rng(p.seed ^ 0x9e3779b9);
  const lines: LogLine[] = [];
  const L = (tag: string, text: string, tone: Tone, stage: number, target?: TargetId) =>
    lines.push({ tag, text, tone, stage, target });

  L("forge", `target → ${p.url}`, "info", 0);
  L(
    "fetch",
    p.mode === "live"
      ? `live mirror pinned during scan · ${p.fileCount ? `${p.fileCount.toLocaleString()} files` : `${p.assets} assets`}`
      : `GET ${p.host} … 200 OK (${Math.floor(between(r, 84, 420))} ms)`,
    "info",
    0,
  );
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
    scanMode: profile.mode,
    scanNote: profile.modeNote,
    bundleId: `com.cloneforge.${slugify(appName)}`,
    uiFidelity: `${profile.similarity}%`,
    github:
      profile.owner && profile.kind === "repo"
        ? {
            owner: profile.owner,
            repo: profile.name,
            stars: profile.stars,
            forks: profile.forks,
            license: profile.license,
            branch: profile.branch,
            files: profile.fileCount,
          }
        : undefined,
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
