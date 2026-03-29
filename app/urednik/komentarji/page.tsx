import Link from "next/link";
import { requireAuth } from "@/lib/require-auth";
import { getPendingComments } from "@/lib/db";
import { CommentModerationList } from "./moderation-list";

export const dynamic = "force-dynamic";

export default async function KomentarjiPage() {
  await requireAuth();
  const pending = await getPendingComments() as any[];

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Komentarji za odobritev
          </h1>
          <Link
            href="/urednik"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Nazaj
          </Link>
        </div>

        <CommentModerationList initialComments={pending} />
      </div>
    </main>
  );
}
