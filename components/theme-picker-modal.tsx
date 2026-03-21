"use client";

import { useState } from "react";
import { Sun } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/article-helpers";
import { CategoryIcon } from "@/lib/category-icons";

const CATEGORIES = [
  "JUNAKI", "PODJETNISTVO", "SKUPNOST", "SPORT", "NARAVA",
  "ZIVALI", "INFRASTRUKTURA", "SLOVENIJA_V_SVETU", "KULTURA",
] as const;

interface Props {
  email: string;
  onComplete: () => void;
  /** Pre-select this category on open */
  initialCategory?: string;
}

export function ThemePickerModal({ email, onComplete, initialCategory }: Props) {
  const [selected, setSelected] = useState<string[]>(
    initialCategory ? [initialCategory] : [...CATEGORIES]
  );
  const [submitting, setSubmitting] = useState(false);

  function toggle(cat: string) {
    setSelected((prev) => {
      if (prev.includes(cat)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  }

  const allSelected = selected.length === CATEGORIES.length;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          categories: allSelected ? [] : selected,
        }),
      });
    } catch {}
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onComplete}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-2xl border border-border/50 shadow-2xl p-6 sm:p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-gold" aria-hidden />
            <h3 className="text-lg font-semibold text-foreground">
              Katere teme vas zanimajo?
            </h3>
          </div>
          <button
            onClick={onComplete}
            className="text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer p-1 -mr-1"
            aria-label="Zapri"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Izberite teme, o katerih želite prejemati zgodbe.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all cursor-pointer ${
                selected.includes(cat)
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted opacity-60 hover:opacity-100"
              }`}
            >
              <CategoryIcon category={cat} className="w-3.5 h-3.5" />
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
        >
          {submitting ? "..." : "Naroči se"}
        </button>
      </div>
    </div>
  );
}
