import Link from "next/link";
import type { Metadata } from "next";
import { LogoLink } from "@/components/logo-link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "O nas",
  description: "Portal pozitivnih novic iz Slovenije.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <LogoLink />
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Vse zgodbe
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
            Svetla Stran zbira pozitivne novice iz Slovenije. Verjamemo, da dobre zgodbe zaslužijo enako pozornost kot slabe, in da spreminjajo dan na bolje.
          </p>

          <p>
            Ljudje, ki pomagajo. Dosežki, ki presenetijo. Skupnosti, ki držijo skupaj. Narava, ki se vrača. Vsak dan prečešemo slovenske medije in poiščemo zgodbe, ki krepijo.
          </p>

          <p>
            Pišemo dejstva, ne mnenja. Vsak članek preverimo pri primarnih virih, pod vsako zgodbo pa najdete vire in podrobnosti preverbe.
          </p>

          <p>
            Pri iskanju in pisanju nam pomaga umetna inteligenca. Vsako objavljeno zgodbo prebere in odobri uredniška ekipa.
          </p>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
