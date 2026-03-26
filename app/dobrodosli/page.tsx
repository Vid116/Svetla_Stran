import Link from "next/link";
import { Logo } from "@/components/logo";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { getPublishedArticles } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/article-helpers";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dobrodošli | Svetla Stran",
  description: "Brez kriminala. Brez politike. Brez drame. Svet ni tak kot ga kažejo.",
};

// Pick 4 diverse, high-scoring articles with images
function pickShowcase(articles: any[]) {
  const withImages = articles
    .filter((a) => a.ai_image_url && a.ai_score >= 7)
    .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));

  const picked: any[] = [];
  const usedCategories = new Set<string>();

  for (const a of withImages) {
    if (picked.length >= 4) break;
    if (usedCategories.has(a.category)) continue;
    usedCategories.add(a.category);
    picked.push(a);
  }

  // Fill remaining if not enough diverse categories
  for (const a of withImages) {
    if (picked.length >= 4) break;
    if (picked.some((p) => p.slug === a.slug)) continue;
    picked.push(a);
  }

  return picked;
}

export default async function WelcomePage() {
  const rows = await getPublishedArticles();
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
            <p className="text-sm sm:text-base tracking-wide text-muted-foreground/70 font-medium">
              <span>Brez kriminala.</span>
              <span className="mx-2 text-border/40">·</span>
              <span>Brez politike.</span>
              <span className="mx-2 text-border/40">·</span>
              <span>Brez drame.</span>
            </p>

            {/* Line 2 — the reframe */}
            <h1 className="font-brand text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground leading-tight">
              Svet ni tak kot ga kažejo.
            </h1>

            {/* Line 3 — the brand promise */}
            <p className="text-lg sm:text-xl text-muted-foreground font-light">
              Za vsak temen dan obstaja{" "}
              <span className="font-brand font-semibold text-foreground">svetla stran</span>.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-8 py-3 text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg active:scale-100"
            >
              Odkrij zgodbe
            </Link>
            <p className="text-xs text-muted-foreground/50">
              {articleCount} preverjenih zgodb in raste
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
                    src={article.ai_image_url}
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-medium text-white/90 mb-2">
                      {CATEGORY_LABELS[article.category] || article.category}
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
          <h2 className="font-brand text-2xl font-semibold text-foreground">
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
            <p>
              Brez senzacionalizma. Brez moraliziranja. Samo zgodbe ki si jih povedal prijatelju.
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
