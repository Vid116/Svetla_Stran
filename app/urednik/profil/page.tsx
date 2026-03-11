import { requireAuth } from "@/lib/require-auth";
import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await requireAuth();

  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-soft via-background to-background" />
        <div className="relative mx-auto max-w-lg px-6 py-12 text-center">
          <Link
            href="/urednik"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group mb-6"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
            Nazaj na inbox
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Profil
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {session.user.name}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-6 py-10 space-y-6">
        <ProfileForm
          currentUsername={session.user.username}
          currentName={session.user.name}
        />
      </div>
    </main>
  );
}
