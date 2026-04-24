import Link from "next/link";
import { Sun } from "lucide-react";
import { LogoLink } from "@/components/logo-link";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Strani ni",
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <LogoLink />
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Vse zgodbe
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <Sun className="w-12 h-12 text-gold/40 mb-6" aria-hidden />
        <p className="text-2xl font-light text-foreground mb-3">
          Tu se zgodba izgubi.
        </p>
        <p className="text-sm text-muted-foreground max-w-md mb-8">
          Strani, ki jo iščeš, ni — morda je bila premaknjena ali pa povezava ni več sveža.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-amber-600 text-white px-6 py-2.5 text-sm font-semibold transition-all hover:scale-105 hover:bg-amber-500 active:scale-100"
        >
          Nazaj na zgodbe
        </Link>
      </div>

      <SiteFooter />
    </main>
  );
}
