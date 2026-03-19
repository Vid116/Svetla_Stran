"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
}

function ScoreRing({ score }: { score: number }) {
  const size = 48;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color =
    score >= 8 ? "stroke-nature" : score >= 6 ? "stroke-gold" : "stroke-muted-foreground";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className={color} />
      </svg>
      <span className="absolute text-sm font-semibold text-foreground">{score}</span>
    </div>
  );
}

function EmotionPill({ emotion }: { emotion: string }) {
  const colors: Record<string, string> = {
    PONOS: "bg-gold-soft text-gold-foreground",
    TOPLINA: "bg-rose-soft text-warmth-foreground",
    OLAJSANJE: "bg-nature-soft text-nature-foreground",
    CUDESENJE: "bg-lavender-soft text-primary",
    UPANJE: "bg-sky-soft text-primary",
  };
  const labels: Record<string, string> = {
    PONOS: "Ponos", TOPLINA: "Toplina", OLAJSANJE: "Olajsanje", CUDESENJE: "Cudesenje", UPANJE: "Upanje",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[emotion] || "bg-muted text-muted-foreground"}`}>
      {labels[emotion] || emotion}
    </span>
  );
}

export function StoryCard({
  dbStory,
  categoryInfo,
  antidoteLabel,
  isNew = true,
  onToggleReviewed,
  onStatusChange,
  onRefresh,
}: {
  dbStory: Headline;
  categoryInfo: { label: string; color: string };
  antidoteLabel: string | null;
  isNew?: boolean;
  onToggleReviewed?: () => void;
  onStatusChange?: (status: string, reason?: string) => void;
  onRefresh?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [showDismissReasons, setShowDismissReasons] = useState(false);

  async function handleResearchWrite() {
    setResearching(true);
    setError(null);
    try {
      // Fire the request — API sets status to "processing" immediately
      const res = await fetch("/api/research-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headlineId: dbStory.id,
          rawTitle: dbStory.raw_title,
          rawContent: dbStory.raw_content,
          fullContent: dbStory.full_content,
          source_url: dbStory.source_url,
          source_name: dbStory.source_name,
          ai_category: dbStory.ai_category,
          ai_emotions: dbStory.ai_emotions,
          ai_headline: dbStory.ai_headline,
          ai_antidote: dbStory.ai_antidote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Napaka pri raziskovanju");
      }
      if (data.skipped) {
        setError(data.reason || "Podobna zgodba že obstaja");
        onRefresh?.();
        return;
      }
      setSent(true);
      onRefresh?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResearching(false);
    }
  }

  if (sent) {
    return (
      <Card className="border-nature/40 bg-nature/5">
        <CardContent className="p-5 text-center">
          <p className="text-sm font-medium text-nature">
            Zakljuceno — najdes ga v sekciji &quot;V obdelavi&quot;
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`group cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5 ${
        (dbStory.ai_score || 0) >= 8 ? "ring-1 ring-gold/30" : ""
      } ${isNew ? "border-l-2 border-l-nature" : ""}`}
      onClick={() => !researching && setExpanded(!expanded)}
    >
      <CardContent className="p-5">
        {/* Status badges */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isNew && (
              <span className="inline-flex items-center gap-1 rounded-full bg-nature/10 px-2 py-0.5 text-xs font-semibold text-nature">
                <span className="h-1.5 w-1.5 rounded-full bg-nature" /> Nova
              </span>
            )}
            {researching && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky/10 px-2 py-0.5 text-xs font-semibold text-sky-foreground">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Raziskujem
              </span>
            )}
          </div>
          {onToggleReviewed && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleReviewed(); }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                isNew ? "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground" : "bg-nature/10 text-nature hover:bg-nature/20"
              }`}
            >
              {isNew ? "Pregledano" : "Vrni med nove"}
            </button>
          )}
        </div>

        {/* Category + score */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={`rounded-full text-xs font-medium ${categoryInfo.color}`}>
              {categoryInfo.label}
            </Badge>
            {antidoteLabel && (
              <Badge variant="outline" className="rounded-full border-primary/20 text-xs text-primary/70">
                {antidoteLabel}
              </Badge>
            )}
          </div>
          <ScoreRing score={dbStory.ai_score || 0} />
        </div>

        <h3 className="mb-1.5 text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {dbStory.ai_headline || dbStory.raw_title}
        </h3>
        <p className="mb-3 text-sm text-muted-foreground line-clamp-1">{dbStory.raw_title}</p>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {(dbStory.ai_emotions || []).map((e) => <EmotionPill key={e} emotion={e} />)}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{dbStory.ai_reason}</p>

        {/* Expanded */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{dbStory.source_name}</span>
              <a href={dbStory.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
                Odpri vir
              </a>
            </div>

            {(dbStory.full_content || dbStory.raw_content) && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Vsebina vira</p>
                <p className="text-xs leading-relaxed text-foreground/80 line-clamp-6">
                  {((dbStory.full_content || dbStory.raw_content) || "").slice(0, 500)}
                  {((dbStory.full_content || dbStory.raw_content) || "").length > 500 && "..."}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleResearchWrite(); }}
                disabled={researching}
                className="rounded-lg bg-nature px-4 py-2 text-xs font-medium text-nature-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
              >
                {researching ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Raziskujem...
                  </span>
                ) : "Raziskaj in napisi"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDismissReasons(!showDismissReasons); }}
                className="rounded-lg bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive transition-all hover:bg-destructive/20"
              >
                Zavrni
              </button>
            </div>

            {showDismissReasons && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-medium text-muted-foreground mb-2">Zakaj zavrnis?</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "ni_pozitivna", label: "Ni pozitivna" },
                    { key: "prestara", label: "Prestara" },
                    { key: "premalo_vsebine", label: "Premalo vsebine" },
                    { key: "nepomembno", label: "Nepomembno" },
                    { key: "duplikat", label: "Duplikat" },
                  ].map((r) => (
                    <button
                      key={r.key}
                      onClick={() => onStatusChange?.("dismissed", r.key)}
                      className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive transition-all hover:bg-destructive/20"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
