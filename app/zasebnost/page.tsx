import Link from "next/link";
import { LogoLink } from "@/components/logo-link";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Zasebnost",
  description: "Politika zasebnosti portala Svetla Stran.",
};

export default function ZasebnostPage() {
  return (
    <main className="min-h-screen">
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

      <article className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold mb-8 text-foreground">Politika zasebnosti</h1>

        <div className="space-y-6 text-foreground/85 leading-[1.85]">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Kdo smo</h2>
            <p>Svetla Stran je portal pozitivnih novic iz Slovenije, dostopen na svetlastran.si.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Katere podatke zbiramo</h2>
            <p>Zbiramo le tvoj e-poštni naslov, če se prostovoljno prijaviš na našo dnevno dozo. Drugih osebnih podatkov ne zbiramo.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Piškotki</h2>
            <p>Svetla Stran ne uporablja piškotkov za sledenje ali oglaševanje. Uporabljamo le nujne piškotke za delovanje strani (prijava urednikov).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Analitika</h2>
            <p>Za razumevanje obiskanosti uporabljamo Plausible Analytics, ki je popolnoma anonimen in ne uporablja piškotkov. Nobeni osebni podatki se ne zbirajo.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Tvoje pravice</h2>
            <p>Kadarkoli lahko zahtevaš izbris svojega e-poštnega naslova s seznama. Piši na info@svetlastran.si ali uporabi povezavo za odjavo na dnu vsakega pisma.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Viri člankov</h2>
            <p>Naši članki temeljijo na javno dostopnih virih slovenskih medijev. Vsak članek vsebuje seznam virov in povezav do izvirnih objav.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Umetna inteligenca</h2>
            <p>Pri pripravi člankov si pomagamo z orodji umetne inteligence. Vsak članek je pregledan s strani uredništva pred objavo.</p>
          </section>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
