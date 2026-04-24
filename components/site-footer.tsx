import Link from "next/link";
import { Logo } from "@/components/logo";
import { THEMES, TOPICAL_THEME_ORDER, RITUAL_THEME_ORDER } from "@/lib/article-helpers";

const FOOTER_THEMES = [...TOPICAL_THEME_ORDER, ...RITUAL_THEME_ORDER];

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

          {/* Themes */}
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/50 mb-3">
              Teme
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {FOOTER_THEMES.map((slug) => {
                const theme = THEMES[slug];
                return (
                  <li key={slug}>
                    <Link
                      href={`/tema/${slug}`}
                      className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                    >
                      {theme.label}
                    </Link>
                  </li>
                );
              })}
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
                <Link href="/arhiv" className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors">
                  Arhiv
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
