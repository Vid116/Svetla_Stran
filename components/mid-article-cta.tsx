"use client";

import { useState } from "react";
import { Sun } from "lucide-react";
import { ThemePickerModal } from "@/components/theme-picker-modal";

export function MidArticleCta({ category }: { category?: string }) {
  const [email, setEmail] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setShowPicker(true);
  }

  if (done) {
    return (
      <div className="my-8 flex items-center justify-center gap-2 rounded-xl bg-nature/10 px-5 py-3">
        <Sun className="w-4 h-4 text-gold" aria-hidden />
        <p className="text-sm font-medium text-nature">Naročeni! Vidimo se v ponedeljek.</p>
      </div>
    );
  }

  return (
    <>
      <div className="my-8 rounded-xl border border-border/40 bg-gradient-to-r from-gold-soft/20 via-card to-sky-soft/15 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Ti je všeč? Vsak ponedeljek 5 takih zgodb.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kratki članki, preverjene zgodbe. Vsak ponedeljek zjutraj.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 shrink-0">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.si"
              required
              className="w-40 sm:w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              Naroči se
            </button>
          </form>
        </div>
      </div>

      {showPicker && (
        <ThemePickerModal
          email={email}
          initialCategory={category}
          onComplete={() => {
            setShowPicker(false);
            setDone(true);
          }}
        />
      )}
    </>
  );
}
