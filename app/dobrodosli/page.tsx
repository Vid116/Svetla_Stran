import Link from "next/link";
import { Logo } from "@/components/logo";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { getPublishedArticlesLight } from "@/lib/db";
import { pluralize } from "@/lib/article-helpers";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dobrodošli",
  description: "Brez kriminala. Brez politike. Brez drame. Svet ni tak kot ga kažejo.",
};

// Display groups — same as article-grid.tsx
const SHOWCASE_GROUPS: { label: string; categories: string[] }[] = [
  { label: "Junaki",   categories: ["JUNAKI"] },
  { label: "Divjina",  categories: ["NARAVA", "ZIVALI"] },
  { label: "Napredek", categories: ["PODJETNISTVO", "INFRASTRUKTURA"] },
  { label: "Ponos",    categories: ["SLOVENIJA_V_SVETU", "SPORT"] },
];

// Scoring for welcome page — heavily favors recent articles
// An old 9/10 should NOT beat a fresh 7/10 on the landing page
function scoreArticle(a: any) {
  const daysOld = (Date.now() - new Date(a.published_at || a.created_at).getTime()) / 86400000;
  const recencyPenalty = daysOld * 2; // lose 2 points per day old
  return (a.ai_score || 5) - recencyPenalty;
}

// Pick the best story from each of 4 groups — same ranking as homepage featured
function pickShowcase(articles: any[]) {
  const withImages = articles.filter((a) => a.ai_image_url || a.image_url);
  const scored = withImages.map((a) => ({ ...a, _score: scoreArticle(a) }));
  scored.sort((a, b) => b._score - a._score);

  return SHOWCASE_GROUPS.map((group) => {
    const best = scored.find((a) => group.categories.includes(a.category));
    return best ? { ...best, groupLabel: group.label } : null;
  }).filter(Boolean);
}

export default async function WelcomePage() {
  const rows = await getPublishedArticlesLight();
  const showcase = pickShowcase(rows);
  const articleCount = rows.length;

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero section ── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold/8 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-warmth/6 blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-sky/6 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <Logo size={64} />
          </div>

          {/* The three lines */}
          <div className="text-center space-y-8">
            {/* Line 1 — clears the table */}
            <p className="text-sm sm:text-base tracking-wide text-muted-foreground/50 font-medium">
              <span>Brez kriminala.</span>
              <span className="mx-2 text-border/30">·</span>
              <span>Brez politike.</span>
              <span className="mx-2 text-border/30">·</span>
              <span>Brez drame.</span>
            </p>

            {/* Line 2 — the reframe */}
            <h1 className="font-brand text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground/70 leading-tight">
              Svet ni tak kot ga kažejo.
            </h1>

            {/* Line 3 — the brand promise */}
            <p className="text-lg sm:text-xl text-muted-foreground/60 font-light">
              Za vsak temen dan obstaja{" "}
              <span className="font-brand font-semibold text-amber-600">svetla stran</span>.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-amber-600 text-white px-8 py-3 text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg hover:bg-amber-500 active:scale-100"
            >
              Odkrij zgodbe
            </Link>
            <p className="text-xs text-muted-foreground/50">
              {articleCount} {pluralize(articleCount, ["preverjena zgodba", "preverjeni zgodbi", "preverjene zgodbe", "preverjenih zgodb"])} in raste
            </p>
          </div>
        </div>
      </section>

      {/* ── Showcase articles ── */}
      {showcase.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {showcase.map((article) => (
              <Link
                key={article.slug}
                href={`/clanki/${article.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48 sm:h-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.ai_image_url || article.image_url}
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-medium text-white/90 mb-2">
                      {article.groupLabel}
                    </span>
                    <h3 className="text-base sm:text-lg font-semibold text-white leading-snug line-clamp-2">
                      {article.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── What this is section ── */}
      <section className="mx-auto max-w-2xl px-6 py-12">
        <div className="text-center space-y-6">
          <h2 className="font-brand text-2xl font-semibold text-foreground/70">
            Preverjene zgodbe iz Slovenije
          </h2>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Vsak dan preberemo stotine člankov iz slovenskih medijev
              in poiščemo zgodbe ki navdihujejo, ganijo ali presenetijo.
            </p>
            <p>
              Vsako zgodbo preverimo pri izvirnih virih
              in jo napišemo tako da jo razume vsak.
            </p>
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="mx-auto max-w-xl px-6 py-12 pb-20">
        <NewsletterSignup variant="hero" />
      </section>

      {/* ── Footer link ── */}
      <footer className="text-center py-8 border-t border-border/30">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Vstopi na Svetla Stran →
        </Link>
      </footer>
    </main>
  );
}
