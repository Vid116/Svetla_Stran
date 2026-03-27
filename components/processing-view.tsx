"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ANTIDOTE_LABELS } from "@/lib/article-helpers";

interface VerificationClaim {
  claim: string;
  status: string;
  source?: string;
}

interface Reference {
  url: string;
  title: string;
}

interface Draft {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  ai_score: number | null;
  category: string | null;
  antidote: string | null;
  antidote_secondary: string | null;
  ai_image_url: string | null;
  verification_passed: boolean | null;
  verification_summary: string | null;
  verification_claims: VerificationClaim[] | null;
  research_queries: string[] | null;
  research_sources_found: number | null;
  research_sources_used: number | null;
  research_references: Reference[] | null;
}

interface ProcessedHeadline {
  id: string;
  status: string; // "processing" | "picked"
  source_url: string;
  source_name: string;
  raw_title: string;
  raw_content: string | null;
  full_content: string | null;
  ai_score: number | null;
  ai_category: string | null;
  ai_headline: string | null;
  ai_antidote: string | null;
  ai_emotions: string[];
  scraped_at: string;
  drafts: Draft[];
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

export function ProcessingView() {
  const [headlines, setHeadlines] = useState<ProcessedHeadline[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProcessed = useCallback(async () => {
    try {
      const res = await fetch("/api/stories?view=processing");
      if (res.ok) {
        const data = await res.json();
        setHeadlines(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcessed();
    const hasProcessing = headlines.some((h) => h.status === "processing");
    const pollInterval = hasProcessing ? 30000 : 120000;
    const interval = setInterval(fetchProcessed, pollInterval);
    return () => clearInterval(interval);
  }, [fetchProcessed, headlines]);

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p className="text-lg">Nalagam...</p>
      </div>
    );
  }

  if (headlines.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-base">Ni clankov v obdelavi.</p>
      </div>
    );
  }

  const processing = headlines.filter((h) => h.status === "processing");
  const completed = headlines.filter((h) => h.status === "picked");

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 border-b border-border/40 pb-3">
        <h2 className="text-sm font-semibold text-foreground">V obdelavi</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky/20 text-sky-foreground px-1.5 text-xs font-semibold">
          {headlines.length}
        </span>
        {processing.length > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sky/10 px-2.5 py-0.5 text-xs font-semibold text-sky-foreground">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            {processing.length} v teku
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {headlines.map((h) => (
          <ProcessingCard
            key={h.id}
            headline={h}
            onRefresh={fetchProcessed}
          />
        ))}
      </div>
    </div>
  );
}

function ProcessingCard({
  headline,
  onRefresh,
}: {
  headline: ProcessedHeadline;
  onRefresh: () => void;
}) {
  const [rerunning, setRerunning] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const isProcessing = headline.status === "processing";
  const draft = headline.drafts?.[0] || null;
  const catInfo = CATEGORIES[headline.ai_category || ""] || { label: headline.ai_category || "Drugo", color: "bg-muted" };

  async function handleRerun() {
    setRerunning(true);
    setError(null);
    try {
      const res = await fetch("/api/research-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headlineId: headline.id,
          rawTitle: headline.raw_title,
          rawContent: headline.raw_content,
          fullContent: headline.full_content,
          source_url: headline.source_url,
          source_name: headline.source_name,
          ai_category: headline.ai_category,
          ai_emotions: headline.ai_emotions,
          ai_headline: headline.ai_headline,
          ai_antidote: headline.ai_antidote,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka pri raziskovanju");
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRerunning(false);
    }
  }

  async function handleDismiss() {
    if (!confirm("Izbrisi ta naslov in osnutek?")) return;
    setDismissing(true);
    setError(null);
    try {
      // Delete drafts first
      if (draft) {
        await fetch("/api/publish", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId: draft.id }),
        });
      }
      // Dismiss headline
      const res = await fetch("/api/stories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: headline.id, status: "dismissed", reason: "Ročno izbrisano iz obdelave" }),
      });
      if (!res.ok) throw new Error("Napaka pri brisanju");
      onRefresh();
    } catch (err: any) {
      setError(err.message);
      setDismissing(false);
    }
  }

  const claims = draft?.verification_claims || [];
  const failedClaims = claims.filter((c: VerificationClaim) => c.status !== "confirmed" && c.status !== "verified");
  const confirmedCount = claims.filter((c: VerificationClaim) => c.status === "confirmed" || c.status === "verified" || c.status === "ok").length;
  const refs = draft?.research_references || [];

  return (
    <Card
      className={`border-border/50 cursor-pointer transition-all hover:shadow-md ${isProcessing ? "bg-sky/5 border-sky/30" : "bg-card/80"}`}
      onClick={() => !isProcessing && setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        {/* Status row */}
        <div className="mb-2 flex items-center gap-2">
          {isProcessing ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky/10 px-2 py-0.5 text-xs font-semibold text-sky-foreground">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Raziskujem
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-nature/10 px-2 py-0.5 text-xs font-semibold text-nature">
              Zakljuceno
            </span>
          )}
          <Badge variant="secondary" className={`rounded-full text-xs font-medium ${catInfo.color}`}>
            {catInfo.label}
          </Badge>
          {draft?.verification_passed === true && (
            <span className="text-xs text-nature" title="Preverba uspesna">Preverjeno</span>
          )}
          {draft?.verification_passed === false && (
            <span className="text-xs text-destructive" title="Preverba neuspesna">Neuspesno</span>
          )}
          {draft?.ai_score != null && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
              draft.ai_score >= 8 ? "bg-gold/20 text-gold" :
              draft.ai_score >= 6 ? "bg-sky/20 text-sky" :
              "bg-muted text-muted-foreground"
            }`}>
              {draft.ai_score}/10
            </span>
          )}
          {draft?.antidote && ANTIDOTE_LABELS[draft.antidote] && (
            <span className="inline-flex items-center rounded-full bg-warmth/15 px-2 py-0.5 text-xs text-warmth">
              {ANTIDOTE_LABELS[draft.antidote].label}
            </span>
          )}
          {draft?.antidote_secondary && ANTIDOTE_LABELS[draft.antidote_secondary] && (
            <span className="inline-flex items-center rounded-full bg-warmth/10 px-2 py-0.5 text-xs text-warmth/60">
              {ANTIDOTE_LABELS[draft.antidote_secondary].label}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-1 text-sm font-semibold leading-snug text-foreground">
          {headline.ai_headline || headline.raw_title}
        </h3>
        <p className="mb-2 text-xs text-muted-foreground line-clamp-1">
          {headline.source_name}
        </p>

        {/* Draft info */}
        {draft && (
          <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-xs font-medium text-foreground/80 line-clamp-1">
              {draft.title}
            </p>
            {draft.verification_summary && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {draft.verification_summary}
              </p>
            )}
          </div>
        )}

        {/* Expanded: verification claims + research details */}
        {expanded && draft && (
          <div className="mt-3 space-y-3 border-t border-border/50 pt-3" onClick={(e) => e.stopPropagation()}>
            {/* Verification claims */}
            {claims.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                  Preverba trditev ({confirmedCount}/{claims.length} potrjenih)
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {claims.map((c: VerificationClaim, i: number) => {
                    const ok = c.status === "confirmed" || c.status === "verified" || c.status === "ok";
                    return (
                      <div key={i} className={`rounded-md px-2.5 py-1.5 text-xs ${ok ? "bg-nature/5 text-foreground/70" : "bg-destructive/5 text-destructive"}`}>
                        <span className="mr-1.5">{ok ? "✓" : "✗"}</span>
                        {c.claim}
                        {c.source && <span className="ml-1 text-muted-foreground">({c.source})</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Research stats */}
            {(draft.research_queries?.length || draft.research_sources_found) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Raziskava</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {draft.research_queries && (
                    <span>{draft.research_queries.length} poizvedb</span>
                  )}
                  {draft.research_sources_found != null && (
                    <span>{draft.research_sources_found} virov najdenih</span>
                  )}
                  {draft.research_sources_used != null && (
                    <span>{draft.research_sources_used} virov uporabljenih</span>
                  )}
                </div>
              </div>
            )}

            {/* Research references */}
            {refs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                  Viri raziskave ({refs.length})
                </p>
                <ol className="space-y-1">
                  {refs.map((ref: Reference, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-xs text-muted-foreground/50 mt-0.5 shrink-0">{i + 1}.</span>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-foreground/70 hover:text-primary transition-colors line-clamp-1"
                      >
                        {ref.title || ref.url}
                        <span className="ml-0.5 text-primary">↗</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
        )}

        {/* Actions */}
        {!isProcessing && (
          <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            {draft && (
              <a
                href={`/urednik/osnutki/${draft.id}`}
                className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20"
              >
                Odpri osnutek
              </a>
            )}
            <button
              onClick={handleRerun}
              disabled={rerunning}
              className="rounded-lg bg-sky/10 px-3 py-1.5 text-xs font-medium text-sky-foreground transition-all hover:bg-sky/20 disabled:opacity-50"
            >
              {rerunning ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Ponavljam...
                </span>
              ) : "Ponovi"}
            </button>
            <a
              href={headline.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              Vir
            </a>
            <button
              onClick={handleDismiss}
              disabled={dismissing || rerunning}
              className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-all hover:bg-destructive/20 disabled:opacity-50"
            >
              {dismissing ? "Brisem..." : "Izbrisi"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
