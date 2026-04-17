// Server component — reads NODE_ENV at render time. Only rendered inside /urednik,
// so it's only visible to editors, and only when the dev server is running.

export function LocalPipelineBanner() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="sticky top-0 z-[60] w-full border-b border-amber-500/40 bg-amber-400/90 text-amber-950 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-6 py-1.5 text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-700 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-800" />
        </span>
        <span className="tracking-wide uppercase">Lokalni cevovod</span>
        <span className="text-amber-900/70">
          — raziskava teče na tvojem računalniku, ne na VPS. Logi v <code className="rounded bg-amber-950/10 px-1 font-mono text-[0.7rem]">npm run dev</code> terminalu.
        </span>
      </div>
    </div>
  );
}
