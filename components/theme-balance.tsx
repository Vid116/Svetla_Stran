"use client";

import { useEffect, useState } from "react";

interface ThemeBalance {
  theme: string;
  label: string;
  inbox: number;
  published14d: number;
  color: string;
}

const THEME_CONFIG: { key: string; label: string; antidotes: string[]; color: string }[] = [
  { key: "med-nami", label: "Med nami", antidotes: ["jeza", "cinizem", "osamljenost"], color: "#f0a0a0" },
  { key: "napredek", label: "Napredek", antidotes: ["skrb", "obup"], color: "#7cc4f5" },
  { key: "heroji", label: "Heroji", antidotes: ["strah"], color: "#e8a070" },
  { key: "drobne-radosti", label: "Drobne radosti", antidotes: ["dolgcas"], color: "#f0a0c0" },
];

export function ThemeBalance() {
  const [data, setData] = useState<ThemeBalance[] | null>(null);

  useEffect(() => {
    fetch("/api/stories/theme-balance")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const maxInbox = Math.max(...data.map((d) => d.inbox), 1);
  const starving = data.filter((d) => d.published14d <= 2);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/60">
          Stanje tem
        </p>
        {starving.length > 0 && (
          <span className="text-xs text-amber-600 font-medium">
            {starving.map((s) => s.label).join(", ")} {starving.length === 1 ? "potrebuje" : "potrebujejo"} zgodbo
          </span>
        )}
      </div>

      <div className="space-y-3">
        {data.map((d) => {
          const isStarving = d.published14d <= 2;
          return (
            <div key={d.theme} className="flex items-center gap-3">
              <span className={`text-xs font-medium w-28 truncate ${isStarving ? "text-amber-600" : "text-foreground/70"}`}>
                {d.label}
              </span>
              <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(2, (d.inbox / maxInbox) * 100)}%`,
                    backgroundColor: d.color,
                    opacity: isStarving ? 1 : 0.6,
                  }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                {d.inbox} v inbox
              </span>
              <span className={`text-xs tabular-nums w-20 text-right font-medium ${
                d.published14d === 0 ? "text-red-500" :
                d.published14d <= 2 ? "text-amber-500" :
                "text-muted-foreground/50"
              }`}>
                {d.published14d} objav/14d
              </span>
            </div>
          );
        })}
      </div>

      {starving.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground/60 border-t border-border/30 pt-3">
          Danes priporočamo: zgodbo iz teme <strong className="text-foreground/80">{starving[0].label}</strong>
        </p>
      )}
    </div>
  );
}
