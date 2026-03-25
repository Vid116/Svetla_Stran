export const metadata = { title: 'Zasebnost' };

export default function ZasebnostPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold mb-8">Politika zasebnosti</h1>

      <div className="prose prose-sm text-muted-foreground space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Kdo smo</h2>
          <p>Svetla Stran je portal pozitivnih novic iz Slovenije, dostopen na svetlastran.si.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Katere podatke zbiramo</h2>
          <p>Zbiramo le vaš e-poštni naslov, če se prostovoljno prijavite na naše novičke (Dnevna doza). Drugih osebnih podatkov ne zbiramo.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Piškotki</h2>
          <p>Svetla Stran ne uporablja piškotkov za sledenje ali oglaševanje. Uporabljamo le nujne piškotke za delovanje strani (prijava urednikov).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Analitika</h2>
          <p>Za razumevanje obiskanosti uporabljamo Plausible Analytics, ki je popolnoma anonimen in ne uporablja piškotkov. Nobeni osebni podatki se ne zbirajo.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Vaše pravice</h2>
          <p>Kadarkoli lahko zahtevate izbris vašega e-poštnega naslova s seznama novičk. Za to pišite na info@svetlastran.si ali uporabite povezavo za odjavo v vsakem novičku.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Viri člankov</h2>
          <p>Naši članki temeljijo na javno dostopnih virih slovenskih medijev. Vsak članek vsebuje seznam virov in povezav do izvirnih objav.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Umetna inteligenca</h2>
          <p>Pri pripravi člankov si pomagamo z orodji umetne inteligence. Vsak članek je pregledan s strani uredništva pred objavo.</p>
        </section>
      </div>
    </main>
  );
}
