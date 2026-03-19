import Link from "next/link";
import { EditorTabs } from "@/components/editor-tabs";
import { UserMenu } from "@/components/user-menu";
import { requireAuth } from "@/lib/require-auth";
import { getPendingCommentCount } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function UrednikPage() {
  const session = await requireAuth();
  const pendingComments = await getPendingCommentCount();

  return (
    <main className="min-h-screen">
      {/* Heavenly gradient header */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-soft via-background to-background" />
        <div className="absolute top-0 left-1/4 h-64 w-96 rounded-full bg-gold-soft/40 blur-3xl" />
        <div className="absolute top-0 right-1/4 h-64 w-96 rounded-full bg-lavender-soft/40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center">
          <div className="absolute right-6 top-6">
            <UserMenu />
          </div>
          <p className="mb-3 text-sm font-medium tracking-widest uppercase text-primary/60">
            Urednistvo
          </p>
          <h1 className="text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Svetla Stran
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Za vsak strup, ki ga mediji dajejo, imamo zdravilo
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/urednik/osnutki"
              className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-4 py-1.5 text-sm font-medium text-gold-foreground transition-all hover:bg-gold/20"
            >
              Osnutki
            </Link>
            <Link
              href="/urednik/viri"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20"
            >
              Viri
            </Link>
            <Link
              href="/urednik/komentarji"
              className="inline-flex items-center gap-1.5 rounded-full bg-rose/10 px-4 py-1.5 text-sm font-medium text-rose-foreground transition-all hover:bg-rose/20"
            >
              Komentarji
              {pendingComments > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-[10px] font-bold text-white">
                  {pendingComments}
                </span>
              )}
            </Link>
            {session.user.role === "admin" && (
              <Link
                href="/urednik/ekipa"
                className="inline-flex items-center gap-1.5 rounded-full bg-lavender/10 px-4 py-1.5 text-sm font-medium text-lavender-foreground transition-all hover:bg-lavender/20"
              >
                Ekipa
              </Link>
            )}
            <Link
              href="/urednik/profil"
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              Profil
            </Link>
          </div>
        </div>
      </div>

      {/* Tabbed content */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <EditorTabs />
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        Svetla Stran &middot; Portal pozitivnih novic iz Slovenije
      </footer>
    </main>
  );
}
