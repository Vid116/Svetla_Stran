"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { THEMES, RITUAL_THEME_ORDER } from "@/lib/article-helpers";

// Only ritual themes that editors tag manually. Topical themes are derived from
// antidote/category automatically, events is stubbed, archive is time-based — so
// only tiho-delo and nedeljska-zgodba show up here.
const TAGGABLE_THEMES = RITUAL_THEME_ORDER.filter((slug) =>
  ["tiho-delo", "nedeljska-zgodba"].includes(slug)
);

export function DraftThemeTags({
  draftId,
  initialThemes,
}: {
  draftId: string;
  initialThemes: string[];
}) {
  const router = useRouter();
  const [themes, setThemes] = useState<string[]>(initialThemes || []);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggle(slug: string) {
    const next = themes.includes(slug)
      ? themes.filter((t) => t !== slug)
      : [...themes, slug];
    setThemes(next);
    setError(null);
    try {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftId, themes: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka pri shranjevanju");
      }
      startTransition(() => router.refresh());
    } catch (err: any) {
      setError(err.message);
      // Revert optimistic update
      setThemes(themes);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border/40 bg-muted/20 p-4">
      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/60 mb-3">
        Dodatne teme
      </p>
      <div className="flex flex-wrap gap-2">
        {TAGGABLE_THEMES.map((slug) => {
          const theme = THEMES[slug];
          const isOn = themes.includes(slug);
          return (
            <button
              key={slug}
              type="button"
              onClick={() => toggle(slug)}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: isOn ? theme.colors.soft : "transparent",
                color: isOn ? theme.colors.activeText : theme.colors.text,
                borderColor: isOn ? theme.colors.fill : `${theme.colors.text}30`,
              }}
            >
              <span className="text-base leading-none">{isOn ? "✓" : "+"}</span>
              {theme.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground/60">
        Ko se članek objavi, bodo te teme prenesene v članek in se bodo prikazale na ustreznih straneh.
      </p>
    </div>
  );
}
