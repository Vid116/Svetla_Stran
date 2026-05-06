import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/db";
import {
  CATEGORY_ACCENT_BAR,
  formatDate,
  readingMinutes,
  getThemeForArticle,
} from "@/lib/article-helpers";
import { ShareButton } from "@/components/share-button";
import { SiteFooter } from "@/components/site-footer";

export const revalidate = 300;

// Parse the long-form body into structured blocks. The pipeline emits a
// markdown-ish string: paragraphs separated by blank lines, `## ` for section
// headings, `> ` for pull quotes. Old long-forms (pre-prompt-rewrite) have
// neither marker — they render as a flat list of paragraphs and look like
// "lede only", which is fine until they get re-published.
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

// Roman numerals for section numbering (1-9 covers ~5-section articles comfortably).
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article?.long_form) return { title: "Cela zgodba ni najdena" };

  const lf = typeof article.long_form === "string"
    ? (() => { try { return JSON.parse(article.long_form); } catch { return null; } })()
    : article.long_form;

  if (!lf) return { title: "Cela zgodba ni najdena" };

  const imageUrl = article.ai_image_url || article.image_url || undefined;

  return {
    title: lf.title || article.title,
    description: lf.subtitle || article.subtitle,
    openGraph: {
      title: lf.title || article.title,
      description: lf.subtitle || article.subtitle,
      type: "article",
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function CelaZgodbaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getArticleBySlug(slug);
  if (!row) notFound();

  const longForm = typeof row.long_form === "string"
    ? (() => { try { return JSON.parse(row.long_form); } catch { return null; } })()
    : row.long_form;

  if (!longForm) notFound();

  const accentBar = CATEGORY_ACCENT_BAR[row.category] ?? "bg-primary";
  const articleTheme = getThemeForArticle(row.antidote ?? null, row.category ?? null);

  const blocks = parseLongFormBody(longForm.body || "");

  // Group blocks into sections so we can stamp Roman numerals on each heading.
  // First section has no heading (the lede). Subsequent sections start at each `## heading`.
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
      className="min-h-screen"
      style={{
        // Cream paper tint — signals "long-read mode"
        backgroundColor: "hsl(40, 30%, 98%)",
      }}
    >
      {/* Hero image — narrower height than short version, frames the read */}
      {(row.ai_image_url || row.image_url) && (
        <div className="relative h-56 sm:h-72 md:h-[24rem] overflow-hidden">
          <img
            src={row.ai_image_url || row.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${row.image_position ?? 50}%` }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(40, 30%, 98%) 0%, hsla(40, 30%, 98%, 0.5) 30%, transparent 70%)" }} />
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
            <Link
              href={`/clanki/${row.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/85 hover:text-white transition-colors group bg-black/25 backdrop-blur-sm rounded-full px-3 py-1.5"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
              Hitra različica
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`relative ${(row.ai_image_url || row.image_url) ? "-mt-20" : ""}`}>
        <div className="relative mx-auto max-w-2xl px-6 pt-8 pb-12">
          {!(row.ai_image_url || row.image_url) && (
            <Link
              href={`/clanki/${row.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group mb-8 block"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
              Hitra različica
            </Link>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span
              className="font-longform-display text-[10px] uppercase tracking-[0.25em] text-foreground/50"
              style={{ fontVariationSettings: '"opsz" 12, "SOFT" 60' }}
            >
              Cela zgodba
            </span>
            <span className="text-xs text-muted-foreground/40">·</span>
            <time className="text-xs text-muted-foreground" dateTime={row.published_at}>
              {formatDate(row.published_at)}
            </time>
            <span className="text-xs text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground">
              {readingMinutes(longForm.body || "")} min branja
            </span>
            <div className="ml-auto">
              <ShareButton title={longForm.title || row.title} />
            </div>
          </div>

          <h1
            className="font-longform-display text-4xl sm:text-5xl md:text-6xl font-medium leading-[1.05] text-foreground tracking-tight mb-6"
            style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
          >
            {longForm.title || row.title}
          </h1>

          {longForm.subtitle && (
            <p
              className="font-longform-body italic text-lg sm:text-xl text-foreground/65 leading-[1.55] font-normal"
            >
              {longForm.subtitle}
            </p>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-2xl px-6 pb-24">
        <div className="flex justify-center mb-10">
          <span className={`h-[3px] w-12 rounded-full ${accentBar} opacity-40`} />
        </div>

        <article className="longform-prose">
          {renderedBlocks.map((b) => (
            <div key={b.key}>{b.node}</div>
          ))}
        </article>

        {/* Closing ornament */}
        <div className="flex justify-center mt-16 mb-10">
          <span className="text-foreground/25 tracking-[0.5em] text-sm">∗ ∗ ∗</span>
        </div>

        {/* Sources — full list, same shape as the short article */}
        <div className="mt-6 p-5 rounded-xl bg-muted/40 border border-border/40">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/60 mb-3">
            Viri
          </p>
          <ol className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground/50 mt-0.5 shrink-0">1.</span>
              <div className="min-w-0">
                <p className="text-sm text-foreground/80">{row.source_name}</p>
                {row.source_url && (
                  <a
                    href={row.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline underline-offset-2 line-clamp-1"
                  >
                    {row.raw_title || row.source_url}
                    <span className="ml-0.5" aria-hidden>↗</span>
                  </a>
                )}
              </div>
            </li>
            {(row.research_references as { url: string; title: string }[] | null | undefined)
              ?.filter((ref) => ref.url !== row.source_url)
              .map((ref, i) => (
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

        {/* Back to short */}
        <div className="mt-12 text-center">
          <Link
            href={`/clanki/${row.slug}`}
            className="font-longform-display inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors italic"
            style={{ fontVariationSettings: '"opsz" 16, "SOFT" 80' }}
          >
            <span aria-hidden>←</span>
            <span>Nazaj na hitro različico</span>
          </Link>
        </div>

        {articleTheme && (
          <div className="mt-6 text-center">
            <Link
              href={`/tema/${articleTheme.slug}`}
              className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              Več zgodb iz teme: {articleTheme.label}
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
