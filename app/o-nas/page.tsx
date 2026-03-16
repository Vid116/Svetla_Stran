import Link from "next/link";
import { Sun } from "lucide-react";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "O nas | Svetla Stran",
  description: "Portal pozitivnih novic iz Slovenije.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Sun className="w-6 h-6 text-gold" aria-hidden />
            <span className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-brand)' }}>
              Svetla Stran
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Vse zgodbe
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-foreground mb-8">
          O Svetli Strani
        </h1>

        <div className="space-y-6 text-foreground/85 leading-[1.85]">
          <p className="text-lg font-light">
            Mediji pogosto vodijo s strahom, jezo in cinizmom. Svetla Stran vodi drugače. Zbiramo zgodbe iz Slovenije, ki jih je vredno prebrati do konca.
          </p>

          <p>
            Ljudje, ki pomagajo. Dosežki, ki presenetijo. Skupnosti, ki držijo skupaj. Narava, ki se vrača. Vsak dan prečešemo slovenske medije in poiščemo zgodbe, ki krepijo namesto slabijo.
          </p>

          <p>
            Pišemo dejstva, ne mnenja. Vsak članek gre skozi raziskovalni postopek, kjer preverimo trditve pri primarnih virih. Pod vsako zgodbo najdete vire in podrobnosti preverbe.
          </p>

          <p>
            Pri iskanju in pisanju nam pomaga umetna inteligenca. Uredniška ekipa prebere in odobri vsako objavljeno zgodbo.
          </p>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
