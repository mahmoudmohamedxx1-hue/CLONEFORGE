/* CloneForge — Foundation Forger.
 *
 * Generates a genuine, runnable Next.js 14 (App Router) + TypeScript + Tailwind +
 * shadcn-style scaffold — the "professional application foundation" the repo audit
 * prescribes as the correct next step. Everything below is real, coherent code that
 * passes `npm run build`, with clear empty/loading/error/success states and the
 * 10-step clone workflow wired as a working seed.
 *
 * NOTE on authoring: the generated sources intentionally avoid backticks and `${}`
 * (they use string concatenation instead) so they can be embedded safely here.
 */
import JSZip from "jszip";

export interface ScaffoldOpts {
  repoName: string; // e.g. "netstream"
}

export interface ScaffoldFile {
  path: string;
  note: string;
  content: () => string;
}

/* ------------------------------------------------------------------ */
/* Config + DX files                                                   */
/* ------------------------------------------------------------------ */

function packageJson(o: ScaffoldOpts): string {
  return JSON.stringify(
    {
      name: o.repoName,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        next: "14.2.5",
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        clsx: "^2.1.1",
        "tailwind-merge": "^2.3.0",
        "class-variance-authority": "^0.7.0",
      },
      devDependencies: {
        typescript: "^5.4.5",
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        autoprefixer: "^10.4.19",
        postcss: "^8.4.38",
        tailwindcss: "^3.4.4",
        eslint: "^8",
        "eslint-config-next": "14.2.5",
      },
    },
    null,
    2,
  );
}

function tsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  );
}

function tailwindConfig(): string {
  return [
    'import type { Config } from "tailwindcss";',
    "",
    "const config: Config = {",
    "  darkMode: ['class'],",
    "  content: ['./src/**/*.{ts,tsx}'],",
    "  theme: {",
    "    extend: {",
    "      colors: {",
    "        border: 'hsl(var(--border))',",
    "        background: 'hsl(var(--background))',",
    "        foreground: 'hsl(var(--foreground))',",
    "        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },",
    "        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },",
    "        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },",
    "        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },",
    "      },",
    "      borderRadius: {",
    "        lg: 'var(--radius)',",
    "        md: 'calc(var(--radius) - 2px)',",
    "        sm: 'calc(var(--radius) - 4px)',",
    "      },",
    "    },",
    "  },",
    "  plugins: [],",
    "};",
    "export default config;",
    "",
  ].join("\n");
}

function globalsCss(): string {
  return [
    "@tailwind base;",
    "@tailwind components;",
    "@tailwind utilities;",
    "",
    "@layer base {",
    "  :root {",
    "    --background: 240 10% 4%;",
    "    --foreground: 0 0% 98%;",
    "    --muted: 240 6% 10%;",
    "    --muted-foreground: 240 5% 65%;",
    "    --border: 240 6% 14%;",
    "    --primary: 142 71% 45%;",
    "    --primary-foreground: 240 10% 4%;",
    "    --accent: 142 71% 45%;",
    "    --accent-foreground: 240 10% 4%;",
    "    --destructive: 0 63% 55%;",
    "    --destructive-foreground: 0 0% 98%;",
    "    --radius: 0.5rem;",
    "  }",
    "  * { border-color: hsl(var(--border)); }",
    "  body {",
    "    background: hsl(var(--background));",
    "    color: hsl(var(--foreground));",
    "    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;",
    "  }",
    "}",
    "",
  ].join("\n");
}

function readme(o: ScaffoldOpts): string {
  return [
    "# " + o.repoName,
    "",
    "A production-shaped Next.js 14 (App Router) + TypeScript + Tailwind + shadcn-style foundation",
    "scaffolded by **CloneForge**. This is the 'correct next step' from the repo audit: a real,",
    "runnable application foundation with the 10-step clone workflow wired as a working seed.",
    "",
    "## Local setup",
    "",
    "```bash",
    "npm install",
    "npm run dev        # http://localhost:3000",
    "npm run build      # production build",
    "npm run lint       # eslint",
    "npm run typecheck  # tsc --noEmit",
    "```",
    "",
    "## What's inside",
    "",
    "| Path | Purpose |",
    "|------|---------|",
    "| `src/app/page.tsx` | Landing / dashboard entry |",
    "| `src/app/clone/` | The 10-step clone workflow (working seed with all states) |",
    "| `src/components/ui/` | shadcn-style primitives (button, card) |",
    "| `src/components/states.tsx` | Empty / Loading / Error / Success state components |",
    "| `src/lib/pipeline.ts` | The 10-step pipeline definition + status model |",
    "| `src/lib/types.ts` | Domain types (Project, CloneJob, GeneratedFile) |",
    "| `src/lib/utils.ts` | `cn()` class helper (clsx + tailwind-merge) |",
    "",
    "## Mapping to the audit",
    "",
    "- **#2 Application foundation** — Next App Router, TS, Tailwind, shadcn-style, responsive, states. ✔ (this scaffold)",
    "- **#3 Core clone workflow** — the 10 steps are modeled in `lib/pipeline.ts` and rendered in `app/clone`. Wire real logic next.",
    "- **#4 Backend/persistence** — domain types in `lib/types.ts`; add Neon + a data layer (e.g. Drizzle) next.",
    "- **#5 Auth**, **#6 AI pipeline**, **#7 Reliability**, **#8 Security**, **#9 Testing** — follow-on work; types and seams are in place.",
    "- **#10 DX** — package.json, tsconfig, tailwind/postcss/eslint config, env example, this README. ✔",
    "",
    "Generated by CloneForge. Push this into your repo, run `npm run dev`, and build from a real foundation.",
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Library + components                                                */
/* ------------------------------------------------------------------ */

function libUtils(): string {
  return [
    'import { clsx, type ClassValue } from "clsx";',
    'import { twMerge } from "tailwind-merge";',
    "",
    "export function cn(...inputs: ClassValue[]) {",
    "  return twMerge(clsx(inputs));",
    "}",
    "",
  ].join("\n");
}

function libTypes(): string {
  return [
    "/* Domain model — mirrors the audit's data-layer requirements (#4). */",
    "",
    "export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';",
    "",
    "export interface Project {",
    "  id: string;",
    "  name: string;",
    "  ownerId: string;",
    "  createdAt: string;",
    "}",
    "",
    "export interface CloneJob {",
    "  id: string;",
    "  projectId: string;",
    "  sourceUrl: string;",
    "  status: JobStatus;",
    "  failureReason?: string;",
    "  idempotencyKey: string;",
    "  createdAt: string;",
    "}",
    "",
    "export interface GeneratedFile {",
    "  id: string;",
    "  jobId: string;",
    "  path: string;",
    "  language: string;",
    "  revision: number;",
    "}",
    "",
  ].join("\n");
}

function libPipeline(): string {
  return [
    "/* The 10-step clone workflow from the audit (#3), modeled as data. */",
    "",
    "export type StepStatus = 'pending' | 'running' | 'done' | 'error';",
    "",
    "export interface PipelineStep {",
    "  id: string;",
    "  label: string;",
    "  detail: string;",
    "}",
    "",
    "export const PIPELINE_STEPS: PipelineStep[] = [",
    "  { id: 'create',   label: 'Create project',        detail: 'Provision the clone project' },",
    "  { id: 'source',   label: 'Add source',            detail: 'URL, screenshot, or design input' },",
    "  { id: 'analyze',  label: 'Analyze source',        detail: 'Inspect structure and tokens' },",
    "  { id: 'plan',     label: 'Generate plan',         detail: 'Component + file plan' },",
    "  { id: 'generate', label: 'Generate components',   detail: 'Emit code per component' },",
    "  { id: 'preview',  label: 'Preview result',        detail: 'Render the clone live' },",
    "  { id: 'compare',  label: 'Compare to source',     detail: 'Visual + structural diff' },",
    "  { id: 'iterate',  label: 'Iterate',               detail: 'Apply change requests' },",
    "  { id: 'export',   label: 'Export',                detail: 'GitHub push or ZIP download' },",
    "  { id: 'track',    label: 'Track history',         detail: 'Versions and revisions' },",
    "];",
    "",
  ].join("\n");
}

function uiButton(): string {
  return [
    'import * as React from "react";',
    'import { cva, type VariantProps } from "class-variance-authority";',
    'import { cn } from "@/lib/utils";',
    "",
    "const buttonVariants = cva(",
    "  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',",
    "  {",
    "    variants: {",
    "      variant: {",
    "        default: 'bg-primary text-primary-foreground hover:bg-primary/90',",
    "        outline: 'border border-border bg-transparent hover:bg-muted',",
    "        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',",
    "        ghost: 'hover:bg-muted',",
    "      },",
    "      size: {",
    "        default: 'h-10 px-4 py-2',",
    "        sm: 'h-9 px-3',",
    "        lg: 'h-11 px-8',",
    "      },",
    "    },",
    "    defaultVariants: { variant: 'default', size: 'default' },",
    "  },",
    ");",
    "",
    "export interface ButtonProps",
    "  extends React.ButtonHTMLAttributes<HTMLButtonElement>,",
    "    VariantProps<typeof buttonVariants> {}",
    "",
    "const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(",
    "  ({ className, variant, size, ...props }, ref) => (",
    "    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />",
    "  ),",
    ");",
    "Button.displayName = 'Button';",
    "",
    "export { Button, buttonVariants };",
    "",
  ].join("\n");
}

function uiCard(): string {
  return [
    'import * as React from "react";',
    'import { cn } from "@/lib/utils";',
    "",
    "const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(",
    "  ({ className, ...props }, ref) => (",
    "    <div ref={ref} className={cn('rounded-lg border bg-muted/40 text-foreground shadow-sm', className)} {...props} />",
    "  ),",
    ");",
    "Card.displayName = 'Card';",
    "",
    "const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(",
    "  ({ className, ...props }, ref) => (",
    "    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />",
    "  ),",
    ");",
    "CardHeader.displayName = 'CardHeader';",
    "",
    "const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(",
    "  ({ className, ...props }, ref) => (",
    "    <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />",
    "  ),",
    ");",
    "CardTitle.displayName = 'CardTitle';",
    "",
    "const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(",
    "  ({ className, ...props }, ref) => (",
    "    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />",
    "  ),",
    ");",
    "CardContent.displayName = 'CardContent';",
    "",
    "export { Card, CardHeader, CardTitle, CardContent };",
    "",
  ].join("\n");
}

function statesComponent(): string {
  return [
    '/* Clear empty / loading / error / success states — audit requirement #2. */',
    'import { cn } from "@/lib/utils";',
    "",
    "export function EmptyState({ title, hint, className }: { title: string; hint?: string; className?: string }) {",
    "  return (",
    "    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center', className)}>",
    "      <p className='text-sm font-medium'>{title}</p>",
    "      {hint ? <p className='mt-1 max-w-sm text-sm text-muted-foreground'>{hint}</p> : null}",
    "    </div>",
    "  );",
    "}",
    "",
    "export function LoadingState({ label }: { label: string }) {",
    "  return (",
    "    <div className='flex items-center gap-3 rounded-lg border py-6 px-4' aria-live='polite'>",
    "      <span className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />",
    "      <span className='text-sm text-muted-foreground'>{label}</span>",
    "    </div>",
    "  );",
    "}",
    "",
    "export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {",
    "  return (",
    "    <div role='alert' className='rounded-lg border border-destructive/40 bg-destructive/10 p-4'>",
    "      <p className='text-sm font-medium text-destructive-foreground'>Something went wrong</p>",
    "      <p className='mt-1 text-sm text-muted-foreground'>{message}</p>",
    "      {onRetry ? (",
    "        <button onClick={onRetry} className='mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted'>",
    "          Retry",
    "        </button>",
    "      ) : null}",
    "    </div>",
    "  );",
    "}",
    "",
    "export function SuccessState({ message }: { message: string }) {",
    "  return (",
    "    <div role='status' className='rounded-lg border border-primary/40 bg-primary/10 p-4'>",
    "      <p className='text-sm font-medium text-primary-foreground'>{message}</p>",
    "    </div>",
    "  );",
    "}",
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* App Router pages                                                    */
/* ------------------------------------------------------------------ */

function rootLayout(): string {
  return [
    'import type { Metadata } from "next";',
    'import "./globals.css";',
    "",
    "export const metadata: Metadata = {",
    "  title: 'CloneForge Studio',",
    "  description: 'Clone websites and repos into mobile and desktop apps.',",
    "};",
    "",
    "export default function RootLayout({ children }: { children: React.ReactNode }) {",
    "  return (",
    "    <html lang='en' className='dark'>",
    "      <body className='min-h-screen bg-background text-foreground antialiased'>{children}</body>",
    "    </html>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function homePage(): string {
  return [
    'import Link from "next/link";',
    'import { Button } from "@/components/ui/button";',
    'import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";',
    "",
    "export default function HomePage() {",
    "  return (",
    "    <main className='mx-auto max-w-3xl px-6 py-16'>",
    "      <p className='font-mono text-xs uppercase tracking-widest text-primary'>cloneforge studio</p>",
    "      <h1 className='mt-3 text-4xl font-bold tracking-tight'>Turn a URL into an app.</h1>",
    "      <p className='mt-4 max-w-xl text-muted-foreground'>",
    "        Feed the forge a public repo or a live website. It analyzes the source, generates a plan,",
    "        and builds mobile + desktop shells you can install.",
    "      </p>",
    "      <div className='mt-8 flex gap-3'>",
    "        <Link href='/clone'>",
    "          <Button>Start a clone</Button>",
    "        </Link>",
    "        <Link href='/clone'>",
    "          <Button variant='outline'>View pipeline</Button>",
    "        </Link>",
    "      </div>",
    "",
    "      <Card className='mt-12'>",
    "        <CardHeader>",
    "          <CardTitle>The 10-step clone workflow</CardTitle>",
    "        </CardHeader>",
    "        <CardContent>",
    "          <p className='text-sm text-muted-foreground'>",
    "            Create → source → analyze → plan → generate → preview → compare → iterate → export → track.",
    "            Open the clone page to walk the pipeline with live states.",
    "          </p>",
    "        </CardContent>",
    "      </Card>",
    "    </main>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function clonePage(): string {
  return [
    'import { CloneWorkflow } from "./clone-workflow";',
    "",
    "export default function ClonePage() {",
    "  return (",
    "    <main className='mx-auto max-w-3xl px-6 py-12'>",
    "      <p className='font-mono text-xs uppercase tracking-widest text-primary'>clone pipeline</p>",
    "      <h1 className='mt-2 text-3xl font-bold tracking-tight'>Run a clone</h1>",
    "      <CloneWorkflow />",
    "    </main>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function cloneWorkflow(): string {
  return [
    '"use client";',
    "",
    'import { useEffect, useRef, useState } from "react";',
    'import { PIPELINE_STEPS, type StepStatus } from "@/lib/pipeline";',
    'import { Button } from "@/components/ui/button";',
    'import { EmptyState, LoadingState, ErrorState, SuccessState } from "@/components/states";',
    'import { cn } from "@/lib/utils";',
    "",
    "type Phase = 'idle' | 'running' | 'error' | 'done';",
    "",
    "export function CloneWorkflow() {",
    "  const [phase, setPhase] = useState<Phase>('idle');",
    "  const [current, setCurrent] = useState(0);",
    "  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);",
    "",
    "  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);",
    "",
    "  const statusOf = (i: number): StepStatus => {",
    "    if (phase === 'done') return 'done';",
    "    if (phase === 'error' && i === current) return 'error';",
    "    if (i < current) return 'done';",
    "    if (i === current && phase === 'running') return 'running';",
    "    return 'pending';",
    "  };",
    "",
    "  const advance = () => {",
    "    timer.current = setTimeout(() => {",
    "      setCurrent((c) => {",
    "        const next = c + 1;",
    "        if (next >= PIPELINE_STEPS.length) {",
    "          setPhase('done');",
    "          return c;",
    "        }",
    "        return next;",
    "      });",
    "    }, 450);",
    "  };",
    "",
    "  useEffect(() => {",
    "    if (phase !== 'running') return;",
    "    advance();",
    "    return () => { if (timer.current) clearTimeout(timer.current); };",
    "    // eslint-disable-next-line react-hooks/exhaustive-deps",
    "  }, [phase, current]);",
    "",
    "  const start = () => {",
    "    setCurrent(0);",
    "    setPhase('running');",
    "  };",
    "",
    "  const simulateFailure = () => {",
    "    setCurrent(3);",
    "    setPhase('error');",
    "  };",
    "",
    "  return (",
    "    <div className='mt-8 space-y-6'>",
    "      <ol className='space-y-2'>",
    "        {PIPELINE_STEPS.map((step, i) => {",
    "          const s = statusOf(i);",
    "          return (",
    "            <li",
    "              key={step.id}",
    "              className={cn(",
    "                'flex items-center gap-3 rounded-md border px-4 py-2.5 transition-colors',",
    "                s === 'running' && 'border-primary/60 bg-primary/5',",
    "                s === 'done' && 'border-primary/30',",
    "                s === 'error' && 'border-destructive/60 bg-destructive/10',",
    "                s === 'pending' && 'border-border opacity-60',",
    "              )}",
    "            >",
    "              <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-mono'>",
    "                {s === 'done' ? '✓' : s === 'error' ? '!' : i + 1}",
    "              </span>",
    "              <div>",
    "                <p className='text-sm font-medium'>{step.label}</p>",
    "                <p className='text-xs text-muted-foreground'>{step.detail}</p>",
    "              </div>",
    "              {s === 'running' ? (",
    "                <span className='ml-auto h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent' />",
    "              ) : null}",
    "            </li>",
    "          );",
    "        })}",
    "      </ol>",
    "",
    "      {phase === 'idle' ? (",
    "        <EmptyState title='No clone running yet' hint='Start the pipeline to walk all 10 steps with live states.' />",
    "      ) : null}",
    "      {phase === 'running' ? <LoadingState label={'Step ' + (current + 1) + ' of ' + PIPELINE_STEPS.length + '…'} /> : null}",
    "      {phase === 'error' ? (",
    "        <ErrorState message='Analysis failed on “Generate plan”. This is the error state — wire real retry logic here.' onRetry={start} />",
    "      ) : null}",
    "      {phase === 'done' ? <SuccessState message='Pipeline complete. In production this hands off to export + version tracking.' /> : null}",
    "",
    "      <div className='flex gap-3'>",
    "        <Button onClick={start} disabled={phase === 'running'}>Run pipeline</Button>",
    "        <Button variant='outline' onClick={simulateFailure} disabled={phase === 'running'}>Simulate failure</Button>",
    "      </div>",
    "    </div>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function envExample(): string {
  return ["# Database (audit #4 recommends Neon)", "DATABASE_URL=", ""].join("\n");
}

function gitignore(): string {
  return [
    "node_modules/",
    ".next/",
    "out/",
    "build/",
    ".DS_Store",
    "*.pem",
    ".env*.local",
    ".vercel",
    "*.tsbuildinfo",
    "next-env.d.ts",
    "",
  ].join("\n");
}

function eslintRc(): string {
  return JSON.stringify({ extends: "next/core-web-vitals" }, null, 2);
}

function postcssConfig(): string {
  return ["const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };", "export default config;", ""].join("\n");
}

function nextConfig(): string {
  return ["/** @type {import('next').NextConfig} */", "const nextConfig = {};", "export default nextConfig;", ""].join("\n");
}

function nextEnvDts(): string {
  return ["/// <reference types=\"next\" />", "/// <reference types=\"next/image-types/global\" />", ""].join("\n");
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

export function scaffoldFiles(o: ScaffoldOpts): ScaffoldFile[] {
  return [
    { path: "package.json", note: "deps + scripts (dev/build/lint/typecheck)", content: () => packageJson(o) },
    { path: "README.md", note: "setup, architecture, audit mapping", content: () => readme(o) },
    { path: "tsconfig.json", note: "strict TS + @/* path alias", content: tsconfig },
    { path: "next.config.mjs", note: "Next config", content: nextConfig },
    { path: "tailwind.config.ts", note: "shadcn-style theme tokens", content: tailwindConfig },
    { path: "postcss.config.mjs", note: "tailwind + autoprefixer", content: postcssConfig },
    { path: ".eslintrc.json", note: "next/core-web-vitals", content: eslintRc },
    { path: ".gitignore", note: "node_modules, .next, env", content: gitignore },
    { path: ".env.example", note: "DATABASE_URL placeholder", content: envExample },
    { path: "next-env.d.ts", note: "Next type references", content: nextEnvDts },
    { path: "src/app/layout.tsx", note: "root layout + metadata", content: rootLayout },
    { path: "src/app/globals.css", note: "tailwind + theme vars", content: globalsCss },
    { path: "src/app/page.tsx", note: "landing / dashboard entry", content: homePage },
    { path: "src/app/clone/page.tsx", note: "clone workflow page", content: clonePage },
    { path: "src/app/clone/clone-workflow.tsx", note: "10-step pipeline w/ all states", content: cloneWorkflow },
    { path: "src/components/ui/button.tsx", note: "shadcn-style button (cva)", content: uiButton },
    { path: "src/components/ui/card.tsx", note: "shadcn-style card", content: uiCard },
    { path: "src/components/states.tsx", note: "empty/loading/error/success", content: statesComponent },
    { path: "src/lib/utils.ts", note: "cn() class helper", content: libUtils },
    { path: "src/lib/types.ts", note: "Project / CloneJob / GeneratedFile", content: libTypes },
    { path: "src/lib/pipeline.ts", note: "10-step pipeline model", content: libPipeline },
  ];
}

export async function downloadScaffoldZip(o: ScaffoldOpts): Promise<void> {
  const zip = new JSZip();
  for (const f of scaffoldFiles(o)) {
    zip.file(f.path, f.content());
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = o.repoName + "-foundation.zip";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 5000);
}
