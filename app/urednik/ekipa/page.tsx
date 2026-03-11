import { requireAuth } from "@/lib/require-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EditorManagement } from "@/components/editor-management";

export const dynamic = "force-dynamic";

export default async function EkipaPage() {
  const session = await requireAuth();

  // Only admin can access
  if (session.user.role !== "admin") {
    redirect("/urednik");
  }

  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-lavender-soft via-background to-background" />
        <div className="relative mx-auto max-w-4xl px-6 py-12 text-center">
          <Link
            href="/urednik"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group mb-6"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
            Nazaj na inbox
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Upravljanje ekipe
          </h1>
          <p className="mt-2 text-muted-foreground">
            Dodaj, uredi ali deaktiviraj urednike
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <EditorManagement />
      </div>
    </main>
  );
}
