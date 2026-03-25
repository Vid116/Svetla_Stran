import Link from "next/link";
import { Logo } from "@/components/logo";
import { CATEGORY_LABELS } from "@/lib/article-helpers";
import { CategoryIcon } from "@/lib/category-icons";

const ALL_CATEGORIES = [
  "SPORT", "NARAVA", "SKUPNOST", "PODJETNISTVO", "KULTURA",
  "JUNAKI", "ZIVALI", "INFRASTRUKTURA", "SLOVENIJA_V_SVETU",
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/30 bg-heaven/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
              <Logo variant={2} size={24} />
              <span className="text-base font-semibold" style={{ fontFamily: 'var(--font-brand)' }}>Svetla Stran</span>
            </Link>
            <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-xs">
              Zgodbe iz Slovenije, ki jih je vredno prebrati do konca. Dejstva, ne mnenja.
            </p>
          </div>

          {/* Categories */}
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/50 mb-3">
              Kategorije
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {ALL_CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/?kategorija=${cat}`}
                    className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                  >
                    <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                    {CATEGORY_LABELS[cat]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/50 mb-3">
              Povezave
            </p>
            <ul className="space-y-1.5">
              <li>
                <Link href="/o-nas" className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors">
                  O nas
                </Link>
              </li>
              <li>
                <Link href="/zasebnost" className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors">
                  Zasebnost
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/20 text-center">
          <p className="text-xs text-muted-foreground/40">
            © {new Date().getFullYear()} Svetla Stran · made by the makers <span className="text-red-500">♥</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
