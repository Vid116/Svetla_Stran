import { notFound } from "next/navigation";
import Link from "next/link";
import { getDraftById } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import {
  CATEGORY_ICONS,
  CATEGORY_ACCENT_BAR,
  formatDate,
} from "@/lib/article-helpers";
import { DraftActions } from "./draft-actions";
import { ImagePosition } from "./image-position";
import { ImageAdder } from "./image-adder";
import { ResearchDetails } from "@/components/research-details";
import { LongFormSection } from "@/components/long-form-section";

export const dynamic = "force-dynamic";

export default async function DraftPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) notFound();

  const paragraphs = (draft.body || "")
    .split(/\n\n+/)
    .map((p: string) => p.trim())
    .filter(Boolean);

  const accentBar = CATEGORY_ACCENT_BAR[draft.category] ?? "bg-primary";
  const references = draft.research_references || [];

  return (
    <div className="min-h-screen">
      {/* Hero image with adjustable position, or image adder */}
      {draft.image_url ? (
        <ImagePosition
          draftId={draft.id}
          imageUrl={draft.image_url}
          initialPosition={draft.image_position ?? 33}
        />
      ) : (
        <ImageAdder draftId={draft.id} />
      )}

      {/* Article header */}
      <header className={`relative ${draft.image_url ? "-mt-24" : "border-b border-border/30"}`}>
        {!draft.image_url && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-heaven-glow/60 via-heaven to-background" />
            <div className="absolute -top-8 left-1/3 h-48 w-64 rounded-full bg-gold-soft/30 blur-3xl pointer-events-none" />
            <div className="absolute -top-8 right-1/3 h-48 w-64 rounded-full bg-sky-soft/25 blur-3xl pointer-events-none" />
          </>
        )}

        <div className="relative mx-auto max-w-3xl px-6 pt-8 pb-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-xl">
              {CATEGORY_ICONS[draft.category] ?? "📰"}
            </span>
            <time className="text-xs text-muted-foreground" dateTime={draft.created_at}>
              {formatDate(draft.created_at)}
            </time>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-foreground mb-5">
            {draft.title}
          </h1>

          {draft.subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light">
              {draft.subtitle}
            </p>
          )}
        </div>
      </header>

      {/* Article body */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className={`h-[3px] w-16 rounded-full ${accentBar} opacity-50 mb-10`} />

        <div className="space-y-6">
          {paragraphs.map((p: string, i: number) => (
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

        {/* Long-form article (if available) */}
        {draft.long_form && (
          <LongFormSection longForm={draft.long_form} accentBar={accentBar} />
        )}

        {/* Sources */}
        {(draft.source_url || references.length > 0) && (
          <div className="mt-10 p-5 rounded-xl bg-muted/40 border border-border/40">
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/60 mb-3">
              Viri
            </p>
            <ol className="space-y-2">
              {draft.source_url && (
                <li className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground/50 mt-0.5 shrink-0">1.</span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/80">{draft.source_name}</p>
                    <a
                      href={draft.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline underline-offset-2 line-clamp-1"
                    >
                      {draft.source_url}
                      <span className="ml-0.5" aria-hidden>↗</span>
                    </a>
                  </div>
                </li>
              )}
              {references
                .filter((ref: any) => ref.url !== draft.source_url)
                .map((ref: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground/50 mt-0.5 shrink-0">{i + 2}.</span>
                    <div className="min-w-0">
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-foreground/80 hover:text-primary transition-colors line-clamp-1"
                      >
                        {ref.title}
                        <span className="ml-0.5 text-xs text-primary" aria-hidden>↗</span>
                      </a>
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        )}

        {/* Expandable research & verification details */}
        <ResearchDetails
          verification={{
            passed: draft.verification_passed ?? null,
            summary: draft.verification_summary || null,
            claims: draft.verification_claims || [],
          }}
          research={{
            queries: draft.research_queries || [],
            sourcesFound: draft.research_sources_found ?? null,
            sourcesUsed: draft.research_sources_used ?? null,
          }}
          references={references}
        />
      </main>

      {/* Editor sticky footer */}
      <div className="sticky bottom-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/urednik/osnutki"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
              Osnutki
            </Link>
            <span className="text-border">|</span>
            {draft.verification_passed === true && (
              <span className="inline-flex items-center gap-1 rounded-full bg-nature/10 px-2.5 py-1 text-xs font-medium text-nature">
                Preverjeno
              </span>
            )}
            {draft.verification_passed === false && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                Preverba neuspesna
              </span>
            )}
          </div>
          <DraftActions draftId={draft.id} hasImage={!!draft.image_url} />
        </div>

        {draft.verification_summary && (
          <div className="mx-auto max-w-3xl px-6 pb-3">
            <p className="text-xs text-muted-foreground/70">{draft.verification_summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
