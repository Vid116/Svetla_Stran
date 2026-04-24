"use client";

import { useState } from "react";

interface LongFormData {
  title: string;
  subtitle: string;
  body: string;
  slug: string;
}

export function LongFormSection({
  longForm,
  accentBar,
}: {
  longForm: LongFormData;
  accentBar: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const paragraphs = longForm.body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div data-longform className="mt-14 scroll-mt-20">
      {/* Divider */}
      <div className="flex items-center gap-4 mb-8">
        <span className="h-px flex-1 bg-border/50" />
        <span className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground/50">
          Celotna zgodba
        </span>
        <span className="h-px flex-1 bg-border/50" />
      </div>

      {!expanded ? (
        /* Collapsed: teaser card */
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-heaven/40 p-6 sm:p-8">
          <div className={`h-[3px] w-12 rounded-full ${accentBar} opacity-40 mb-5`} />

          <h2 className="text-xl sm:text-2xl font-semibold leading-tight text-foreground mb-3">
            {longForm.title}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xl">
            {longForm.subtitle}
          </p>

          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            <span>Odpri celotno zgodbo</span>
            <span aria-hidden>↓</span>
          </button>
        </div>
      ) : (
        /* Expanded: full long-form article */
        <div>
          <div className={`h-[3px] w-12 rounded-full ${accentBar} opacity-40 mb-6`} />

          <h2 className="text-2xl sm:text-3xl font-semibold leading-tight text-foreground mb-3">
            {longForm.title}
          </h2>

          <p className="text-base text-muted-foreground leading-relaxed font-light mb-10">
            {longForm.subtitle}
          </p>

          <div className="space-y-6">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`leading-[1.85] text-foreground/85 ${
                  i === 0 ? "text-lg font-light" : "text-base"
                }`}
              >
                {p}
              </p>
            ))}
          </div>

          <button
            onClick={() => {
              setExpanded(false);
              // Scroll back to the long-form section
              document.querySelector("[data-longform]")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
          >
            <span aria-hidden>↑</span>
            <span>Skrij</span>
          </button>
        </div>
      )}
    </div>
  );
}
