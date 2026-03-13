"use client";

import { useState } from "react";

interface VerificationClaim {
  claim: string;
  status: string;
  source?: string;
}

export function ResearchDetails({
  verification,
  research,
  references,
}: {
  verification?: {
    passed: boolean | null;
    summary: string | null;
    claims: VerificationClaim[];
  };
  research?: {
    queries: string[];
    sourcesFound: number | null;
    sourcesUsed: number | null;
  };
  references?: { url: string; title: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  const claims = verification?.claims || [];
  const hasData = claims.length > 0 || (research?.queries?.length ?? 0) > 0 || (references?.length ?? 0) > 0;

  if (!hasData) return null;

  const confirmedCount = claims.filter(
    (c) => c.status === "confirmed" || c.status === "verified"
  ).length;

  return (
    <div className="mt-4 rounded-xl bg-muted/30 border border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/60">
          Podrobnosti raziskave
        </span>
        <div className="flex items-center gap-3">
          {verification?.passed === true && (
            <span className="text-xs text-nature font-medium">Preverjeno ({confirmedCount}/{claims.length})</span>
          )}
          {verification?.passed === false && (
            <span className="text-xs text-destructive font-medium">Neuspesno ({confirmedCount}/{claims.length})</span>
          )}
          <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-4 border-t border-border/30 pt-3">
          {/* Verification summary */}
          {verification?.summary && (
            <p className="text-xs text-muted-foreground">{verification.summary}</p>
          )}

          {/* Verification claims */}
          {claims.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Preverba trditev ({confirmedCount}/{claims.length})
              </p>
              <div className="space-y-1">
                {claims.map((c, i) => {
                  const ok = c.status === "confirmed" || c.status === "verified" || c.status === "ok";
                  return (
                    <div
                      key={i}
                      className={`rounded-md px-3 py-2 text-xs ${
                        ok
                          ? "bg-nature/5 text-foreground/70"
                          : "bg-destructive/5 text-destructive"
                      }`}
                    >
                      <span className="mr-1.5">{ok ? "✓" : "✗"}</span>
                      {c.claim}
                      {c.source && (
                        <span className="ml-1 text-muted-foreground">({c.source})</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Research stats */}
          {(research?.queries?.length || research?.sourcesFound) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Raziskava</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {research?.queries?.length ? (
                  <span>{research.queries.length} poizvedb</span>
                ) : null}
                {research?.sourcesFound != null && (
                  <span>{research.sourcesFound} virov najdenih</span>
                )}
                {research?.sourcesUsed != null && (
                  <span>{research.sourcesUsed} virov uporabljenih</span>
                )}
              </div>
            </div>
          )}

          {/* All references */}
          {references && references.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                Viri raziskave ({references.length})
              </p>
              <ol className="space-y-1">
                {references.map((ref, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-xs text-muted-foreground/50 mt-0.5 shrink-0">
                      {i + 1}.
                    </span>
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
    </div>
  );
}
