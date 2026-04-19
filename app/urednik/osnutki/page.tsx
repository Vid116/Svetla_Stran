import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { requireAuth } from "@/lib/require-auth";
import { DraftsView } from "@/components/drafts-view";
import { SundayReserveCard } from "@/components/sunday-reserve-card";
import { getSundayReserve, getLongFormDraftsForSwap } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OsnutkiPage() {
  await requireAuth();

  const reserve = await getSundayReserve();
  const candidates = await getLongFormDraftsForSwap(reserve?.id);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-soft/40 via-background to-background" />
        <div className="relative mx-auto max-w-5xl px-6 py-12">
          <div className="absolute right-6 top-6">
            <UserMenu />
          </div>
          <p className="mb-2 text-sm font-medium tracking-widest uppercase text-gold-foreground/60">
            Osnutki
          </p>
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Clanki za pregled
          </h1>
          <p className="mt-2 text-muted-foreground">
            AI-napisani clanki, pripravljeni za urejanje in objavo.
          </p>
          <div className="mt-4 flex items-center gap-3">
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

      {/* Drafts list */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <SundayReserveCard reserve={reserve as any} candidates={candidates as any} />
        <DraftsView />
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        Svetla Stran &middot; Portal pozitivnih novic iz Slovenije
      </footer>
    </main>
  );
}
