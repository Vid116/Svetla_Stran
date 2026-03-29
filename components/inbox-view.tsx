"use client";

import { useState, useEffect, useCallback } from "react";
import { StoryCard } from "./story-card";

// Headlines table shape
interface Headline {
  id: string;
  status: string;
  source_url: string;
  source_name: string;
  raw_title: string;
  raw_content: string | null;
  full_content: string | null;
  ai_score: number | null;
  ai_emotions: string[];
  ai_reason: string | null;
  ai_category: string | null;
  ai_headline: string | null;
  ai_antidote: string | null;
  ai_rejected_because: string | null;
  scraped_at: string;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  SPORT: { label: "Sport", color: "bg-sky text-sky-foreground" },
  ZIVALI: { label: "Zivali", color: "bg-warmth text-warmth-foreground" },
  SKUPNOST: { label: "Skupnost", color: "bg-lavender text-lavender-foreground" },
  NARAVA: { label: "Narava", color: "bg-nature text-nature-foreground" },
  INFRASTRUKTURA: { label: "Infrastruktura", color: "bg-gold text-gold-foreground" },
  PODJETNISTVO: { label: "Podjetnistvo", color: "bg-gold text-gold-foreground" },
  SLOVENIJA_V_SVETU: { label: "Slovenija v svetu", color: "bg-sky text-sky-foreground" },
  JUNAKI: { label: "Junaki", color: "bg-rose text-rose-foreground" },
  KULTURA: { label: "Kultura", color: "bg-lavender text-lavender-foreground" },
};

const ANTIDOTES: Record<string, string> = {
  jeza: "Zdravilo za jezo",
  skrb: "Zdravilo za skrb",
  cinizem: "Zdravilo za cinizem",
  osamljenost: "Zdravilo za osamljenost",
  obup: "Zdravilo za obup",
  strah: "Zdravilo za strah",
};

const REVIEWED_KEY = "svetla-stran-reviewed";

function loadReviewed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(REVIEWED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReviewed(set: Set<string>) {
  localStorage.setItem(REVIEWED_KEY, JSON.stringify([...set]));
}

export function InboxView() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "category">("score");
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const fetchHeadlines = useCallback(async () => {
    try {
      const res = await fetch("/api/stories");
      if (res.ok) {
        const data = await res.json();
        setHeadlines(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setReviewed(loadReviewed());
    fetchHeadlines();
  }, [fetchHeadlines]);

  const toggleReviewed = useCallback((id: string) => {
    setReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReviewed(next);
      return next;
    });
  }, []);

  const markAllReviewed = useCallback(() => {
    setReviewed((prev) => {
      const next = new Set(prev);
      for (const s of headlines) next.add(s.id);
      saveReviewed(next);
      return next;
    });
  }, [headlines]);

  const handleDismiss = useCallback(async (id: string, reason?: string) => {
    setHeadlines((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch("/api/stories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "dismissed", reason }),
      });
    } catch {}
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p className="text-lg">Nalagam zgodbe...</p>
      </div>
    );
  }

  const newCount = headlines.filter((s) => !reviewed.has(s.id)).length;
  const categories = [...new Set(headlines.map((s) => s.ai_category).filter(Boolean))].sort();

  const filtered = filter
    ? headlines.filter((s) => s.ai_category === filter)
    : headlines;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return (b.ai_score || 0) - (a.ai_score || 0);
    return (a.ai_category || "").localeCompare(b.ai_category || "");
  });

  return (
    <div>
      {/* Header bar */}
      <div className="mb-6 flex items-center gap-3 border-b border-border/40 pb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Inbox
        </h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground px-1.5 text-xs font-semibold">
          {headlines.length}
        </span>

        {newCount > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-nature/10 px-2.5 py-0.5 text-xs font-semibold text-nature">
            <span className="h-1.5 w-1.5 rounded-full bg-nature animate-pulse" />
            {newCount} novih
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {newCount > 0 && (
            <button
              onClick={markAllReviewed}
              className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Oznaci vse kot pregledane
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            filter === null
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          Vse ({headlines.length})
        </button>
        {categories.map((cat) => {
          const info = CATEGORIES[cat!] || { label: cat, color: "bg-muted" };
          const count = headlines.filter((s) => s.ai_category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? null : cat!)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                filter === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {info.label} ({count})
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1 rounded-full bg-secondary p-0.5">
          <button
            onClick={() => setSortBy("score")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              sortBy === "score"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Po oceni
          </button>
          <button
            onClick={() => setSortBy("category")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              sortBy === "category"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Po kategoriji
          </button>
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-base">
            {loading ? "Nalagam..." : "Inbox je prazen."}
          </p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sorted.map((headline) => (
          <StoryCard
            key={headline.id}
            dbStory={headline}
            categoryInfo={
              CATEGORIES[headline.ai_category || ""] || {
                label: headline.ai_category || "Drugo",
                color: "bg-muted",
              }
            }
            antidoteLabel={
              headline.ai_antidote
                ? ANTIDOTES[headline.ai_antidote] || headline.ai_antidote
                : null
            }
            isNew={!reviewed.has(headline.id)}
            onToggleReviewed={() => toggleReviewed(headline.id)}
            onStatusChange={(status, reason) => {
              if (status === "dismissed") handleDismiss(headline.id, reason);
            }}
            onRefresh={fetchHeadlines}
          />
        ))}
      </div>
    </div>
  );
}
