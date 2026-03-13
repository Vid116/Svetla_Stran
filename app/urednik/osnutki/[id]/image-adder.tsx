"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImageAdder({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handlePreview() {
    if (!url.trim()) return;
    setPreview(url.trim());
    setError(null);
  }

  async function handleSave() {
    if (!url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, image_url: url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka pri shranjevanju");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative bg-muted/50 border-2 border-dashed border-border/60 rounded-xl">
      {preview ? (
        <div className="relative h-64 sm:h-80 md:h-[28rem] overflow-hidden rounded-xl">
          <img
            src={preview}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 33%" }}
            onError={() => { setError("Slike ni mogoce naloziti"); setPreview(null); }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 sm:h-64">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Clanek nima slike</p>
            <p className="text-xs text-muted-foreground/60">Dodaj URL slike za objavo</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm rounded-b-xl border-t border-border/40">
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handlePreview(); }}
            placeholder="https://... URL slike"
            className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {!preview ? (
            <button
              onClick={handlePreview}
              disabled={!url.trim()}
              className="rounded-lg bg-sky/10 px-3 py-2 text-xs font-medium text-sky-foreground transition-all hover:bg-sky/20 disabled:opacity-50"
            >
              Predogled
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => { setPreview(null); setUrl(""); }}
                className="rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-accent"
              >
                Preklic
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-nature px-3 py-2 text-xs font-medium text-nature-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Shranjujem..." : "Shrani"}
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
