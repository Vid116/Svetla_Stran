import Link from "next/link";
import { SourcesManager } from "@/components/sources-manager";
import { requireAuth } from "@/lib/require-auth";

export default async function ViriPage() {
  await requireAuth();
  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-soft via-background to-background" />
        <div className="absolute top-0 left-1/4 h-64 w-96 rounded-full bg-gold-soft/40 blur-3xl" />
        <div className="absolute top-0 right-1/4 h-64 w-96 rounded-full bg-lavender-soft/40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 py-12 text-center">
          <p className="mb-3 text-sm font-medium tracking-widest uppercase text-primary/60">
            Upravljanje virov
          </p>
          <h1 className="text-3xl font-light tracking-tight text-foreground sm:text-4xl">
            Viri zgodb
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
            Dodaj, odstrani ali izklopi vire ki jih scraper preverja
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/urednik"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20"
            >
              &larr; Inbox
            </Link>
            <Link
              href="/clanki"
              className="inline-flex items-center gap-1.5 rounded-full bg-nature/10 px-4 py-1.5 text-sm font-medium text-nature transition-all hover:bg-nature/20"
            >
              Objavljeni clanki &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Sources manager */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <SourcesManager />
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        Svetla Stran &middot; Portal pozitivnih novic iz Slovenije
      </footer>
    </main>
  );
}
