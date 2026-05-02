import Link from "next/link";

interface LongFormData {
  title?: string;
  body?: string;
}

/**
 * Two-CTA pattern for the short article: a callout above the body inviting
 * readers who came to invest, and a smaller hand-off below for those who
 * finished the short and want more. Both link to /clanki/{slug}/cela-zgodba.
 */
export function LongFormTopCta({
  slug,
  longForm,
  accentBar,
}: {
  slug: string;
  longForm: LongFormData;
  accentBar: string;
}) {
  const minutes = Math.max(2, Math.round((longForm.body?.split(/\s+/).filter(Boolean).length ?? 0) / 200));

  return (
    <Link
      href={`/clanki/${slug}/cela-zgodba`}
      className="group block mb-10 rounded-2xl border border-border/50 bg-gradient-to-br from-gold-soft/40 via-heaven/30 to-gold-soft/20 p-5 sm:p-6 transition-all hover:border-gold/40 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        <div className={`mt-1 h-10 w-1 rounded-full ${accentBar} opacity-70 shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="font-longform-display text-[10px] uppercase tracking-[0.25em] text-foreground/50 mb-2">
            Cela zgodba
          </p>
          <p className="font-longform-display text-lg sm:text-xl text-foreground leading-snug mb-1">
            {longForm.title || "Beri daljšo različico"}
          </p>
          <p className="text-xs text-muted-foreground/80">
            {minutes} min branja, druga oblika iste zgodbe.
          </p>
        </div>
        <span
          className="font-longform-display text-xl text-foreground/40 group-hover:text-gold group-hover:translate-x-1 transition-all shrink-0 mt-1"
          aria-hidden
        >
          →
        </span>
      </div>
    </Link>
  );
}

export function LongFormBottomCta({
  slug,
  longForm,
  accentBar,
}: {
  slug: string;
  longForm: LongFormData;
  accentBar: string;
}) {
  const minutes = Math.max(2, Math.round((longForm.body?.split(/\s+/).filter(Boolean).length ?? 0) / 200));

  return (
    <div className="mt-14 mb-4">
      <div className="flex items-center gap-4 mb-6">
        <span className="h-px flex-1 bg-border/50" />
        <span className="font-longform-display text-[10px] uppercase tracking-[0.25em] text-foreground/40">
          Še niste končali?
        </span>
        <span className="h-px flex-1 bg-border/50" />
      </div>

      <Link
        href={`/clanki/${slug}/cela-zgodba`}
        className="group block rounded-xl border border-border/50 bg-heaven/40 p-6 transition-all hover:border-gold/40 hover:shadow-md"
      >
        <div className={`h-[3px] w-12 rounded-full ${accentBar} opacity-50 mb-4`} />
        <h2 className="font-longform-display text-2xl text-foreground leading-tight mb-2">
          {longForm.title || "Cela zgodba"}
        </h2>
        <p className="text-sm text-muted-foreground/80 mb-4">
          {minutes} min branja, druga oblika iste zgodbe.
        </p>
        <span className="font-longform-display italic text-sm text-gold-foreground inline-flex items-center gap-2 group-hover:gap-3 transition-all">
          Beri celo zgodbo
          <span aria-hidden>→</span>
        </span>
      </Link>
    </div>
  );
}
