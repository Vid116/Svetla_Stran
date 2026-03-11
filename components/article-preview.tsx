"use client";

import { useState } from "react";

interface Article {
  title: string;
  subtitle: string;
  body: string;
  slug: string;
}

interface Source {
  rawTitle: string;
  sourceUrl: string;
  sourceName: string;
  ai: {
    score: number;
    category: string;
    emotions: string[];
    antidote_for: string | null;
  };
}

export function ArticlePreview({
  article,
  source,
  researchStats,
  verification,
  imageUrl,
  onClose,
  onPublished,
}: {
  article: Article;
  source: Source;
  researchStats?: {
    queriesUsed: string[];
    sourcesFound: number;
    sourcesUsed: number;
    references: { url: string; title: string }[];
  } | null;
  verification?: {
    passed: boolean;
    claims: { claim: string; status: "ok" | "nepreverljivo" | "napacno"; note: string }[];
    summary: string;
  } | null;
  imageUrl?: string | null;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article,
          source,
          imageUrl,
          references: researchStats?.references,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka pri objavi");
      }
      setPublished(true);
      onPublished();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 sm:p-8">
      <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Article content */}
        <div className="p-8 sm:p-10">
          {published ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-nature-soft mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-nature">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Clanek objavljen</h2>
              <p className="text-muted-foreground">
                Clanek je shranjen in objavljen.
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
              >
                Zapri
              </button>
            </div>
          ) : (
            <>
              {/* Category badge */}
              <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="uppercase tracking-wider font-medium text-primary/60">
                  Predogled clanka
                </span>
                <span className="text-border">|</span>
                <span>{source.sourceName}</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-semibold leading-tight text-foreground mb-3">
                {article.title}
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                {article.subtitle}
              </p>

              {/* Body */}
              <div className="prose prose-neutral max-w-none">
                {article.body.split("\n\n").map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-base leading-relaxed text-foreground/90 mb-4 last:mb-0"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Research stats */}
              {researchStats && (
                <div className="mt-8 rounded-lg bg-nature/5 border border-nature/20 p-4">
                  <p className="text-xs font-semibold text-nature mb-2">
                    Poglobljeno raziskano
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                    <span>{researchStats.queriesUsed.length} iskalnih poizvedb</span>
                    <span>{researchStats.sourcesFound} najdenih virov</span>
                    <span>{researchStats.sourcesUsed} uporabljenih virov</span>
                  </div>
                  {researchStats.references.length > 0 && (
                    <div className="border-t border-nature/10 pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Viri:
                      </p>
                      <ol className="space-y-1">
                        {researchStats.references.map((ref, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            <span className="text-nature font-medium mr-1">{i + 1}.</span>
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {ref.title}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Verification results */}
              {verification && (
                <div
                  className={`mt-4 rounded-lg border p-4 ${
                    verification.passed
                      ? "bg-nature/5 border-nature/20"
                      : "bg-destructive/5 border-destructive/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {verification.passed ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-nature">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destructive">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                    )}
                    <p className={`text-xs font-semibold ${verification.passed ? "text-nature" : "text-destructive"}`}>
                      {verification.passed ? "Preverba uspesna" : "Preverba: pozor"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {verification.summary}
                  </p>
                  <details className="group">
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      {verification.claims.length} trditev preverjenih — klikni za podrobnosti
                    </summary>
                    <div className="mt-2 space-y-1.5 pt-2 border-t border-border/30">
                      {verification.claims.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span
                            className={`shrink-0 mt-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              c.status === "ok"
                                ? "bg-nature/20 text-nature"
                                : c.status === "nepreverljivo"
                                  ? "bg-gold/20 text-gold-foreground"
                                  : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {c.status === "ok" ? "✓" : c.status === "nepreverljivo" ? "?" : "✗"}
                          </span>
                          <div className="min-w-0">
                            <span className="text-foreground/80">{c.claim}</span>
                            {c.note && (
                              <span className="text-muted-foreground/60 ml-1">— {c.note}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Source attribution (for non-researched articles) */}
              {!researchStats && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <span className="font-medium">Vir:</span>{" "}
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {source.rawTitle}
                  </a>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 flex gap-3 border-t border-border/50 pt-6">
                <button
                  onClick={handlePublish}
                  disabled={publishing || (verification ? !verification.passed : false)}
                  className={`rounded-lg px-6 py-2.5 text-sm font-medium shadow-sm transition-all hover:opacity-90 disabled:opacity-50 ${
                    verification && !verification.passed
                      ? "bg-gold text-gold-foreground"
                      : "bg-nature text-nature-foreground"
                  }`}
                >
                  {publishing
                    ? "Objavljam..."
                    : verification && !verification.passed
                      ? "Preverba ni uspela — preglej"
                      : "Odobri in objavi"}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-medium text-secondary-foreground transition-all hover:bg-accent"
                >
                  Zavrzi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
