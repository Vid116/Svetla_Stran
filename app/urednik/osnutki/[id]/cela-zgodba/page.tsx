import { notFound } from "next/navigation";
import Link from "next/link";
import { getDraftById } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import {
  CATEGORY_ACCENT_BAR,
  formatDate,
  readingMinutes,
  getThemeForArticle,
} from "@/lib/article-helpers";

export const dynamic = "force-dynamic";

// Mirror of /clanki/[slug]/cela-zgodba but reading from drafts table for editor
// preview. Same template, same typography, auth-gated.

type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "pullquote"; text: string };

function parseLongFormBody(body: string): Block[] {
  return body
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b): Block => {
      if (b.startsWith("## ")) return { type: "heading", text: b.slice(3).trim() };
      if (b.startsWith("> ")) return {
        type: "pullquote",
        text: b.replace(/^>\s*/gm, "").trim(),
      };
      return { type: "paragraph", text: b };
    });
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

export default async function DraftCelaZgodbaPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const row = await getDraftById(id);
  if (!row) notFound();

  const longForm = typeof row.long_form === "string"
    ? (() => { try { return JSON.parse(row.long_form); } catch { return null; } })()
    : row.long_form;

  if (!longForm) notFound();

  const accentBar = CATEGORY_ACCENT_BAR[row.category] ?? "bg-primary";
  const articleTheme = getThemeForArticle(row.antidote ?? null, row.category ?? null);
  const blocks = parseLongFormBody(longForm.body || "");

  let sectionCount = 0;
  const renderedBlocks: { node: React.ReactNode; key: string }[] = [];
  let firstParagraphRendered = false;

  blocks.forEach((b, i) => {
    if (b.type === "heading") {
      sectionCount += 1;
      renderedBlocks.push({
        key: `h-${i}`,
        node: (
          <div className="my-12 sm:my-14">
            <div className="flex items-center gap-4 mb-4">
              <span
                className="font-longform-display text-xs uppercase tracking-[0.2em] text-foreground/40"
                style={{ fontVariationSettings: '"opsz" 14, "SOFT" 50' }}
              >
                {ROMAN[sectionCount] ?? sectionCount}
              </span>
              <span className={`h-px flex-1 ${accentBar} opacity-40`} />
            </div>
            <h2
              className="font-longform-display text-2xl sm:text-3xl md:text-4xl font-medium leading-[1.15] text-foreground tracking-tight"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              {b.text}
            </h2>
          </div>
        ),
      });
    } else if (b.type === "pullquote") {
      renderedBlocks.push({
        key: `q-${i}`,
        node: (
          <blockquote className="my-10 sm:my-14 relative pl-6 sm:pl-8">
            <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-full ${accentBar} opacity-60`} />
            <p
              className="font-longform-display italic text-xl sm:text-2xl md:text-[28px] leading-[1.4] text-foreground/90"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 80' }}
            >
              {b.text}
            </p>
          </blockquote>
        ),
      });
    } else {
      const isFirst = !firstParagraphRendered;
      firstParagraphRendered = true;
      renderedBlocks.push({
        key: `p-${i}`,
        node: (
          <p
            className={`font-longform-body leading-[1.8] text-foreground/85 ${
              isFirst
                ? "longform-lede text-[19px] sm:text-[20px]"
                : "text-[18px] sm:text-[19px]"
            } mb-6`}
          >
            {b.text}
          </p>
        ),
      });
    }
  });

  return (
    <div
      className="min-h-screen pb-16"
      style={{ backgroundColor: "hsl(40, 30%, 98%)" }}
    >
      {/* Editor banner — clearly marks this as a preview, not a public page */}
      <div className="sticky top-0 z-50 bg-foreground/95 backdrop-blur-sm text-background px-4 py-2 text-center text-xs">
        <span className="opacity-60">Predogled cele zgodbe (osnutek)</span>
        <span className="mx-3 opacity-40">·</span>
        <Link href={`/urednik/osnutki/${row.id}`} className="underline underline-offset-2 hover:opacity-80">
          ← Nazaj na osnutek
        </Link>
      </div>

      {/* Hero */}
      {(row.ai_image_url || row.image_url) && (
        <div className="relative h-56 sm:h-72 md:h-[24rem] overflow-hidden">
          <img
            src={row.ai_image_url || row.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${row.image_position ?? 50}%` }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(40, 30%, 98%) 0%, hsla(40, 30%, 98%, 0.5) 30%, transparent 70%)" }} />
        </div>
      )}

      {/* Header */}
      <header className={`relative ${(row.ai_image_url || row.image_url) ? "-mt-20" : ""}`}>
        <div className="relative mx-auto max-w-2xl px-6 pt-8 pb-12">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span
              className="font-longform-display text-[10px] uppercase tracking-[0.25em] text-foreground/50"
              style={{ fontVariationSettings: '"opsz" 12, "SOFT" 60' }}
            >
              Cela zgodba
            </span>
            <span className="text-xs text-muted-foreground/40">·</span>
            <time className="text-xs text-muted-foreground" dateTime={row.created_at}>
              {formatDate(row.created_at)}
            </time>
            <span className="text-xs text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground">
              {readingMinutes(longForm.body || "")} min branja
            </span>
          </div>

          <h1
            className="font-longform-display text-4xl sm:text-5xl md:text-6xl font-medium leading-[1.05] text-foreground tracking-tight mb-6"
            style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
          >
            {longForm.title || row.title}
          </h1>

          {longForm.subtitle && (
            <p className="font-longform-body italic text-lg sm:text-xl text-foreground/65 leading-[1.55] font-normal">
              {longForm.subtitle}
            </p>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-2xl px-6 pb-12">
        <div className="flex justify-center mb-10">
          <span className={`h-[3px] w-12 rounded-full ${accentBar} opacity-40`} />
        </div>

        <article className="longform-prose">
          {renderedBlocks.map((b) => (
            <div key={b.key}>{b.node}</div>
          ))}
        </article>

        <div className="flex justify-center mt-16 mb-10">
          <span className="text-foreground/25 tracking-[0.5em] text-sm">∗ ∗ ∗</span>
        </div>

        {articleTheme && (
          <div className="text-center text-xs text-muted-foreground/60">
            Tema: {articleTheme.label}
          </div>
        )}
      </main>
    </div>
  );
}
