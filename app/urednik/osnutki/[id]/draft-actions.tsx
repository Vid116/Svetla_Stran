"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DraftActions({ draftId, hasImage }: { draftId: string; hasImage: boolean }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    if (!hasImage) {
      setError("Dodaj sliko pred objavo");
      return;
    }
    if (!confirm("Objavi ta clanek?")) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka pri objavi");
      }
      const data = await res.json();
      router.push(`/clanki/${data.slug || ""}`);
    } catch (err: any) {
      setError(err.message);
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Izbrisi ta osnutek?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka pri brisanju");
      }
      router.push("/urednik/osnutki");
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <button
        onClick={handleDelete}
        disabled={deleting || publishing}
        className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-all hover:bg-destructive/20 disabled:opacity-50"
      >
        {deleting ? "Brisem..." : "Izbrisi"}
      </button>
      <button
        onClick={handlePublish}
        disabled={publishing || deleting}
        className={`rounded-lg px-4 py-1.5 text-xs font-medium shadow-sm transition-all disabled:opacity-50 ${
          hasImage
            ? "bg-nature text-nature-foreground hover:opacity-90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {publishing ? "Objavljam..." : hasImage ? "Objavi" : "Dodaj sliko"}
      </button>
    </div>
  );
}
