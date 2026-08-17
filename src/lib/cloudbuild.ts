/* CloneForge — CloudForge: real APK + EXE compilation on GitHub's free runners.
 *
 * The browser can't compile signed binaries, but GitHub Actions runners can —
 * ubuntu-latest ships the Android SDK and can cross-build Windows NSIS
 * installers via electron-builder. So we:
 *   1. push a combined app project (zip) into the user's repo
 *   2. push a workflow that compiles APK + EXE on GitHub's runners
 *   3. dispatch it, poll the run live, and fetch the real artifact files
 */
import JSZip from "jszip";
import type { SourceProfile } from "./engine";
import { slugify } from "./engine";
import type { GenOpts } from "./projects";
import { appIcon, workingAppHtml } from "./projects";

export interface CloudLog {
  text: string;
  tone: "info" | "ok" | "warn";
}

export type CloudPhase = "idle" | "pushing" | "dispatching" | "running" | "collecting" | "done" | "error";

export interface CloudResult {
  runUrl: string;
  artifactsUrl?: string;
}

const API = "https://api.github.com";

async function gh(
  path: string,
  token: string,
  init: RequestInit & { raw?: boolean } = {},
): Promise<Response> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  return res;
}

function errText(status: number, hint: string): string {
  if (status === 401) return "Token rejected (401). Check it's a valid PAT with the right scopes.";
  if (status === 403) return "Forbidden (403) — the token needs Contents:R/W + Actions:R/W on this repo.";
  if (status === 404) return `Not found (404) — ${hint}`;
  if (status === 422) return "GitHub refused the request (422) — is Actions enabled on this repo?";
  return `GitHub API error ${status}.`;
}

/* ---------------- combined project zip (web + electron + capacitor) ---------------- */

function cloudPackageJson(o: GenOpts, slug: string): string {
  return JSON.stringify(
    {
      name: slug,
      version: o.version,
      private: true,
      main: "main.js",
      scripts: {
        build: "vite build",
        android: "npm run build && npx cap sync android && cd android && ./gradlew assembleDebug",
        exe: "npm run build && electron-builder --win nsis --x64",
      },
      build: {
        appId: `com.cloneforge.${slug}`,
        productName: o.appName,
        files: ["dist/**/*", "main.js", "package.json"],
        directories: { output: "release" },
        win: { target: "nsis" },
        nsis: { oneClick: true, artifactName: `${o.appName}-Setup.exe` },
      },
      dependencies: {
        "@capacitor/android": "^6.1.2",
        "@capacitor/core": "^6.1.2",
      },
      devDependencies: {
        "@capacitor/cli": "^6.1.2",
        electron: "^31.3.0",
        "electron-builder": "^24.13.3",
        vite: "^5.4.2",
      },
    },
    null,
    2,
  );
}

function electronMain(o: GenOpts): string {
  return `const { app, BrowserWindow } = require("electron");
const path = require("path");
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 940, minHeight: 600,
    autoHideMenuBar: true, backgroundColor: "#0b0d12",
    title: ${JSON.stringify(o.appName)},
    webPreferences: { contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, "dist", "index.html"));
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
`;
}

export async function makeCloudZip(o: GenOpts): Promise<Blob> {
  const slug = slugify(o.appName);
  const zip = new JSZip();
  zip.file("index.html", workingAppHtml(o));
  zip.file("manifest.webmanifest", appManifestJson(o, slug));
  zip.file("icon.svg", appIcon(o));
  zip.file("main.js", electronMain(o));
  zip.file("package.json", cloudPackageJson(o, slug));
  zip.file(
    "capacitor.config.json",
    JSON.stringify(
      { appId: `com.cloneforge.${slug}`, appName: o.appName, webDir: "dist", server: { androidScheme: "https" } },
      null,
      2,
    ),
  );
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function appManifestJson(o: GenOpts, slug: string): string {
  return JSON.stringify(
    {
      name: o.appName,
      short_name: o.appName,
      start_url: "./index.html",
      display: "standalone",
      background_color: "#0b0d12",
      theme_color: o.accent || "#e50914",
      description: `${o.appName} — cloned from ${o.profile.url} by CloneForge`,
      icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      id: `com.cloneforge.${slug}`,
    },
    null,
    2,
  );
}

/* ---------------- the CI workflow ---------------- */

export function workflowYaml(appName: string, fromZip = true): string {
  const unpack = fromZip
    ? `      - name: Unpack app project
        run: |
          mkdir -p build-app
          cd build-app
          unzip -o ../cloneforge/app.zip

`
    : "";
  const wd = fromZip ? "build-app/" : "";
  const cwd = fromZip ? `\n        working-directory: build-app` : "";
  const pushPaths = fromZip
    ? `    paths: ["cloneforge/**", ".github/workflows/cloneforge.yml"]`
    : `    paths: [".github/workflows/cloneforge.yml", "index.html", "package.json", "main.js", "capacitor.config.json"]`;

  return `# CloneForge CI — compiles the REAL installers on GitHub's free runners.
# Android SDK + Node ship with ubuntu-latest; NSIS cross-builds the Windows EXE from Linux.
name: CloneForge Build

on:
  workflow_dispatch:
  push:
${pushPaths}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with: { node-version: 20 }

      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "17" }

${unpack}      - name: Install + build web bundle${cwd}
        run: |
          npm install --no-audit --no-fund
          npm run build

      - name: Compile Android APK${cwd}
        run: |
          yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
          npx cap add android
          npx cap sync android
          cd ${wd}android
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon

      - name: Compile Windows EXE (NSIS, cross-built from Linux)${cwd}
        run: npx electron-builder --win nsis --x64

      - name: Collect installers
        run: |
          mkdir -p out
          cp ${wd}android/app/build/outputs/apk/debug/app-debug.apk "out/${appName}-android.apk" || true
          cp ${wd}release/*.exe out/ || true
          ls -la out

      - uses: actions/upload-artifact@v4
        with:
          name: installers
          path: out
          if-no-files-found: error
`;
}

/* ---------------- zero-token push bundle ---------------- */

function pushMeMd(appName: string, slug: string): string {
  return `# ${appName} — get your real .apk + .exe (nothing to paste)

Everything in this folder IS the app + the cloud-build recipe.
GitHub's free runners compile it the moment you push it.

## Three steps

1) Install GitHub CLI (one-time):  https://cli.github.com  — or:  winget install GitHub.cli

2) Open a terminal INSIDE this folder, then run:

       gh auth login

   Choose:  GitHub.com  →  HTTPS  →  Login with a browser
   It shows a one-time code and opens your browser — you click Authorize. Done.
   (That's a browser click. No token is copied or pasted anywhere.)

3) Push everything:

       gh repo create ${slug} --public --source=. --push

## Then

Open   https://github.com/<YOU>/${slug}/actions

The run "CloneForge Build" starts by itself (push trigger).
A brand-new repo may ask for one click: "Approve and run".

~8 minutes later → open the run → Artifacts → installers → download.
You get  ${appName}-android.apk  and  ${appName}-Setup.exe  — the real installers.
`;
}

export async function makePushBundle(o: GenOpts): Promise<Blob> {
  const slug = slugify(o.appName);
  const zip = new JSZip();
  zip.file("index.html", workingAppHtml(o));
  zip.file("manifest.webmanifest", appManifestJson(o, slug));
  zip.file("icon.svg", appIcon(o));
  zip.file("main.js", electronMain(o));
  zip.file("package.json", cloudPackageJson(o, slug));
  zip.file(
    "capacitor.config.json",
    JSON.stringify(
      { appId: `com.cloneforge.${slug}`, appName: o.appName, webDir: "dist", server: { androidScheme: "https" } },
      null,
      2,
    ),
  );
  zip.file(".github/workflows/cloneforge.yml", workflowYaml(o.appName, false));
  zip.file(".gitignore", "node_modules/\ndist/\nrelease/\nandroid/\n.DS_Store\n");
  zip.file("PUSH_ME.md", pushMeMd(o.appName, slug));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export { saveBlob } from "./save";

/* ---------------- orchestration ---------------- */

async function blobToBase64(b: Blob): Promise<string> {
  const buf = await b.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin);
}

async function pushFile(
  owner: string,
  repo: string,
  path: string,
  contentB64: string,
  message: string,
  token: string,
  log: (l: CloudLog) => void,
): Promise<void> {
  // fetch current sha if the file already exists (needed to overwrite)
  let sha: string | undefined;
  const cur = await gh(`/repos/${owner}/${repo}/contents/${path}?ref=HEAD`, token);
  if (cur.ok) sha = ((await cur.json()) as { sha: string }).sha;
  else if (cur.status !== 404) throw new Error(errText(cur.status, "can't read repo contents."));

  const res = await gh(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: "PUT",
    body: JSON.stringify({ message, content: contentB64, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) throw new Error(errText(res.status, `can't write ${path}.`));
  log({ text: `PUT ${path} → ${cur.ok ? "updated" : "created"} (${Math.round(contentB64.length / 1024)} kB)`, tone: "ok" });
}

export async function forgeInCloud(opts: {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  appName: string;
  profile: SourceProfile;
  version: string;
  accent: string;
  log: (l: CloudLog) => void;
  signal: AbortSignal;
}): Promise<CloudResult> {
  const { owner, repo, branch, token, log, signal } = opts;
  const o: GenOpts = { appName: opts.appName, profile: opts.profile, version: opts.version, accent: opts.accent };

  /* 1 — verify access (repo endpoint works for both classic and fine-grained PATs;
        /user does not exist for fine-grained tokens, so it's best-effort only) */
  log({ text: `verifying token + repo access…`, tone: "info" });
  const repoRes = await gh(`/repos/${owner}/${repo}`, token);
  if (!repoRes.ok) throw new Error(errText(repoRes.status, "repo not found or token lacks access."));
  const me = await gh("/user", token).catch(() => null);
  const login = me && me.ok ? ((await me.json()) as { login: string }).login : null;
  log({
    text: `${login ? `authenticated as @${login} · ` : "token accepted · "}target ${owner}/${repo}@${branch}`,
    tone: "ok",
  });
  log({ text: `repo accessible · Actions runners: free (github-hosted)`, tone: "ok" });
  if (signal.aborted) throw new DOMException("aborted", "AbortError");

  /* 2 — push app zip + workflow */
  log({ text: `packing combined project (web + electron + capacitor)…`, tone: "info" });
  const zipBlob = await makeCloudZip(o);
  const zipB64 = await blobToBase64(zipBlob);
  log({ text: `project packed · ${(zipBlob.size / 1024).toFixed(0)} kB → base64 ${Math.round(zipB64.length / 1024)} kB`, tone: "info" });

  log({ text: `pushing files to ${owner}/${repo}…`, tone: "info" });
  await pushFile(owner, repo, "cloneforge/app.zip", zipB64, `chore(cloneforge): ${o.appName} app project`, token, log);
  const wfB64 = btoa(unescape(encodeURIComponent(workflowYaml(o.appName))));
  await pushFile(owner, repo, ".github/workflows/cloneforge.yml", wfB64, "ci(cloneforge): compile apk + exe", token, log);

  /* 3 — dispatch */
  log({ text: `POST …/actions/workflows/cloneforge.yml/dispatches`, tone: "info" });
  const disp = await gh(`/repos/${owner}/${repo}/actions/workflows/cloneforge.yml/dispatches`, token, {
    method: "POST",
    body: JSON.stringify({ ref: branch }),
  });
  if (disp.status !== 204) throw new Error(errText(disp.status, "can't start the workflow. Does the token have Actions:write?"));
  log({ text: `workflow dispatched on “${branch}” · runner is booting…`, tone: "ok" });

  /* 4 — find the run, then poll */
  await new Promise((r) => setTimeout(r, 4000));
  let runId: number | null = null;
  let runUrl = "";
  for (let attempt = 0; attempt < 10 && !runId; attempt++) {
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    const runs = await gh(`/repos/${owner}/${repo}/actions/runs?per_page=5&event=workflow_dispatch`, token);
    if (!runs.ok) throw new Error(errText(runs.status, "can't read workflow runs."));
    const list = (await runs.json()) as { workflow_runs: { id: number; html_url: string; created_at: string }[] };
    const latest = list.workflow_runs[0];
    if (latest) {
      runId = latest.id;
      runUrl = latest.html_url;
    } else {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  if (!runId) throw new Error("GitHub queued nothing — check that Actions are enabled on the repo (Settings → Actions).");
  log({ text: `run #${runId} found · live log: ${runUrl}`, tone: "ok" });

  const started = Date.now();
  let status = "queued";
  let conclusion: string | null = null;
  while (status !== "completed") {
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 6000));
    const rr = await gh(`/repos/${owner}/${repo}/actions/runs/${runId}`, token);
    if (!rr.ok) throw new Error(errText(rr.status, "lost track of the run."));
    const run = (await rr.json()) as { status: string; conclusion: string | null };
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    if (run.status !== status) {
      status = run.status;
      log({ text: `runner → ${status} (t+${mins} min)`, tone: "info" });
      if (status === "waiting" || status === "action_required")
        log({
          text: `first-time workflow run needs approval — open the run on github and click “Approve and run”`,
          tone: "warn",
        });
    }
    conclusion = run.conclusion;
    if (run.status === "completed") {
      if (run.conclusion !== "success")
        throw new Error(`Cloud build ${run.conclusion ?? "failed"} after ${mins} min — open the run log to see which step broke: ${runUrl}`);
      log({ text: `BUILD SUCCEEDED on GitHub's runner · ${mins} min`, tone: "ok" });
      break;
    }
  }

  /* 5 — fetch artifact */
  log({ text: `fetching artifact “installers” (apk + exe)…`, tone: "info" });
  const arts = await gh(`/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`, token);
  if (!arts.ok) throw new Error(errText(arts.status, "can't list artifacts."));
  const artList = (await arts.json()) as { artifacts: { id: number; name: string }[] };
  const art = artList.artifacts.find((a) => a.name === "installers");
  if (!art) throw new Error("Build succeeded but the “installers” artifact is missing — check the Collect step.");
  const artifactsUrl = `${API}/repos/${owner}/${repo}/actions/artifacts/${art.id}/zip`;
  log({ text: `✔ real installers ready: ${opts.appName}-android.apk + ${opts.appName}-Setup.exe`, tone: "ok" });

  return { runUrl, artifactsUrl };
}

/* Download the artifact zip (needs the same token) and offer it as a file. */
export async function downloadArtifact(url: string, token: string, filename: string): Promise<void> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(errText(res.status, "artifact download failed."));
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
