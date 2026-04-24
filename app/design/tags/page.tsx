/**
 * Design playground for the theme ribbon.
 * Not linked from anywhere; not indexed.
 *
 * Each variation is shown over the same card-like background, three themes
 * side-by-side (short / medium / long label) so we can see how each handles
 * different word lengths.
 */
import type { Metadata } from "next";
import { THEMES, type Theme } from "@/lib/article-helpers";

export const metadata: Metadata = {
  title: "Tag variations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SAMPLES: string[] = ["heroji", "med-nami", "nedeljska-zgodba"]; // 6 / 8 / 16 chars

// ── Sample card background ──────────────────────────────────────────────────
// Real tertiary card on the homepage: ~320px wide × 176px tall image area
// (h-44 in a 3-col grid inside max-w-6xl). That's roughly 16:9 — so we use the
// same aspect, but constrain the width so the visual proportions match what
// you actually see on the homepage.
function Card({ children, dark = true }: { children: React.ReactNode; dark?: boolean }) {
  const bg = dark
    ? "bg-gradient-to-br from-stone-500 via-stone-600 to-stone-800"
    : "bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300";
  const overlay = dark
    ? "bg-gradient-to-t from-black/55 via-black/15 to-transparent"
    : "bg-gradient-to-t from-black/30 via-black/5 to-transparent";
  return (
    <div className={`relative aspect-[16/9] w-full max-w-[320px] overflow-hidden rounded-xl ${bg}`}>
      <div className={`absolute inset-0 ${overlay}`} />
      {children}
    </div>
  );
}

// ── Pill renderer ──────────────────────────────────────────────────────────
type PillStyle =
  | "filled"        // bg = theme.fill, color = theme.activeText
  | "soft"          // bg = theme.soft, color = theme.text
  | "outlined"      // bg = transparent, border = theme.fill, color = theme.activeText (on dark bg switches to white)
  | "ghost"         // bg = white/15 backdrop, color = white
  | "dot"           // filled + leading dot of theme.fill
  | "underline";    // no bg, theme.fill underline, white text

function Pill({
  theme,
  classes,
  text,
  style = "filled",
}: {
  theme: Theme;
  classes: string;
  text?: string;
  style?: PillStyle;
}) {
  const label = (text ?? theme.label).toString();

  let css: React.CSSProperties = {};
  let extra = "";
  let prefix: React.ReactNode = null;

  if (style === "filled") {
    css = { backgroundColor: theme.colors.fill, color: theme.colors.activeText };
  } else if (style === "soft") {
    css = { backgroundColor: theme.colors.soft, color: theme.colors.text };
  } else if (style === "outlined") {
    css = { backgroundColor: "rgba(255,255,255,0.92)", color: theme.colors.activeText, border: `1px solid ${theme.colors.fill}` };
  } else if (style === "ghost") {
    css = { backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" };
    extra = "backdrop-blur-md";
  } else if (style === "dot") {
    css = { backgroundColor: theme.colors.fill, color: theme.colors.activeText };
    prefix = (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
        style={{ backgroundColor: theme.colors.activeText }}
      />
    );
  } else if (style === "underline") {
    css = { color: "#fff", boxShadow: `inset 0 -2px 0 ${theme.colors.fill}` };
  }

  return (
    <span
      className={`absolute top-3 left-3 z-10 inline-flex items-center shadow-sm leading-none ${extra} ${classes}`}
      style={css}
    >
      {prefix}
      {label}
    </span>
  );
}

// ── Section + Row helpers ──────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Row({
  label,
  classes,
  style = "filled",
  textOverride,
  showLight = false,
}: {
  label: string;
  classes: string;
  style?: PillStyle;
  textOverride?: (s: string) => string;
  /** When true, also show one card on a light/illustrated bg (matches the
   *  cream-illustration cards on the homepage). */
  showLight?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 justify-items-center">
        {SAMPLES.map((slug, idx) => {
          const theme = THEMES[slug];
          const text = textOverride ? textOverride(theme.label) : undefined;
          // Show the medium-length sample on a light bg too for contrast testing
          const useLight = showLight && idx === 1;
          return (
            <Card key={slug} dark={!useLight}>
              <Pill theme={theme} classes={classes} text={text} style={style} />
            </Card>
          );
        })}
      </div>
      <p className="font-mono text-[11px] text-muted-foreground/80">{label}</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function TagsDesignPage() {
  // Common baseline classes — uses SM sizing now (the production tertiary card size)
  const base = "rounded-full font-semibold uppercase leading-none";
  // SM-size baseline padding (matches what's actually rendered on the homepage 3-up grid)
  const smPad = "px-3 py-1.5 text-[10px]";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 space-y-14">
      <header className="space-y-2">
        <h1 className="text-3xl font-light tracking-tight">Theme ribbon — playground</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Vzorčne kartice imajo enako razmerje kot prave kartice na homepage 3-up gridu (~320×180px).
          Tri vzorčne teme po dolžini: kratka <code>Heroji</code>, srednja <code>Med nami</code>,
          dolga <code>Nedeljska zgodba</code>.
        </p>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Velikost je <strong>SM</strong> — to je velikost, ki se uporablja na 3-up gridu (kjer si
          videl težavo). Hero in secondary kartice uporabljajo MD (vse mere ×1.1–1.2). Ko izbereš
          SM, MD se proporcionalno prilagodi.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Trenutno na produkciji: <code className="px-1.5 py-0.5 rounded bg-muted">A1 baseline (SM)</code>
        </p>
      </header>

      {/* ── A · Baseline (both sizes for direct comparison) ── */}
      <Section title="A — Baseline (current production)">
        <Row
          label="A1 · SM · px-3 py-1.5 · text-[10px] · tracking-[0.1em] · uppercase · semibold · rounded-full   ← what you see on homepage"
          classes={`${base} ${smPad} tracking-[0.1em]`}
        />
        <Row
          label="A2 · MD · px-4 py-2 · text-[11px] · same as A1 otherwise   ← used on hero + secondary cards"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
        />
      </Section>

      {/* ── B · Shape ── */}
      <Section title="B — Shape (border-radius)">
        <Row
          label="B1 · rounded-full (current)"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase font-semibold leading-none rounded-full`}
        />
        <Row
          label="B2 · rounded-lg (12px corners)"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase font-semibold leading-none rounded-lg`}
        />
        <Row
          label="B3 · rounded-md (6px corners)"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase font-semibold leading-none rounded-md`}
        />
        <Row
          label="B4 · rounded-sm (2px corners — clean badge)"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase font-semibold leading-none rounded-sm`}
        />
        <Row
          label="B5 · rounded-none (sharp ribbon)"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase font-semibold leading-none rounded-none`}
        />
      </Section>

      {/* ── C · Size & padding ── */}
      <Section title="C — Size scale (proportional)">
        <Row
          label="C1 · text-[10px] · px-3 py-1.5 (current SM)"
          classes={`${base} px-3 py-1.5 text-[10px] tracking-[0.1em]`}
        />
        <Row
          label="C2 · text-[10px] · px-3.5 py-2 (more vertical breath)"
          classes={`${base} px-3.5 py-2 text-[10px] tracking-[0.1em]`}
        />
        <Row
          label="C3 · text-[11px] · px-4 py-2 (current MD)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
        />
        <Row
          label="C4 · text-[11px] · px-4 py-2.5 (taller)"
          classes={`${base} px-4 py-2.5 text-[11px] tracking-[0.1em]`}
        />
        <Row
          label="C5 · text-[12px] · px-4 py-2 (bigger text, same padding ratio)"
          classes={`${base} px-4 py-2 text-[12px] tracking-[0.1em]`}
        />
      </Section>

      {/* ── D · Tracking ── */}
      <Section title="D — Tracking (letter-spacing)">
        <Row
          label="D1 · tracking-normal"
          classes={`${base} ${smPad} tracking-normal`}
        />
        <Row
          label="D2 · tracking-[0.05em] (subtle)"
          classes={`${base} ${smPad} tracking-[0.05em]`}
        />
        <Row
          label="D3 · tracking-[0.1em] (current)"
          classes={`${base} ${smPad} tracking-[0.1em]`}
        />
        <Row
          label="D4 · tracking-[0.14em] (wide)"
          classes={`${base} px-3.5 py-1.5 text-[10px] tracking-[0.14em]`}
        />
        <Row
          label="D5 · tracking-[0.2em] (very wide)"
          classes={`${base} px-4 py-1.5 text-[10px] tracking-[0.2em]`}
        />
      </Section>

      {/* ── E · Weight ── */}
      <Section title="E — Weight">
        <Row
          label="E1 · font-normal"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase leading-none rounded-full font-normal`}
        />
        <Row
          label="E2 · font-medium"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase leading-none rounded-full font-medium`}
        />
        <Row
          label="E3 · font-semibold (current)"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase leading-none rounded-full font-semibold`}
        />
        <Row
          label="E4 · font-bold"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase leading-none rounded-full font-bold`}
        />
      </Section>

      {/* ── F · Case ── */}
      <Section title="F — Case">
        <Row
          label="F1 · UPPERCASE (current)"
          classes={`${base} ${smPad} tracking-[0.1em]`}
        />
        <Row
          label="F2 · Title Case (no uppercase, no tracking, +1px text)"
          classes={`px-3 py-1.5 text-[11px] rounded-full font-semibold leading-none`}
          textOverride={(s) => s}
        />
        <Row
          label="F3 · lowercase italic — intimate, very on-brand"
          classes={`px-3 py-1.5 text-[11px] rounded-full font-medium italic leading-none`}
          textOverride={(s) => s.toLowerCase()}
        />
      </Section>

      {/* ── G · Visual style ── */}
      <Section title="G — Visual style (color treatment)" >
        <Row
          label="G1 · Filled (current — fill bg, activeText fg)"
          classes={`${base} ${smPad} tracking-[0.1em]`}
          style="filled"
          showLight
        />
        <Row
          label="G2 · Soft (lighter bg, darker text — gentler)"
          classes={`${base} ${smPad} tracking-[0.1em]`}
          style="soft"
          showLight
        />
        <Row
          label="G3 · Outlined (white bg, theme border)"
          classes={`${base} ${smPad} tracking-[0.1em]`}
          style="outlined"
          showLight
        />
        <Row
          label="G4 · Ghost (white-on-blur, color-agnostic — works on ANY image)"
          classes={`${base} ${smPad} tracking-[0.1em]`}
          style="ghost"
          showLight
        />
        <Row
          label="G5 · Dot prefix (filled + leading dot)"
          classes={`${base} ${smPad} tracking-[0.1em]`}
          style="dot"
          showLight
        />
        <Row
          label="G6 · Underline only (no pill, theme color underline, white text)"
          classes={`px-1 py-1 text-[11px] tracking-[0.05em] uppercase font-semibold leading-none rounded-none`}
          style="underline"
          showLight
        />
      </Section>

      {/* ── H · Hybrid candidates ── */}
      <Section title="H — Hybrid candidates">
        <Row
          label="H1 · Soft + Title Case (intimate, breathy)"
          classes={`px-3 py-1.5 text-[11px] rounded-full font-medium leading-none`}
          textOverride={(s) => s}
          style="soft"
        />
        <Row
          label="H2 · Filled + lowercase + subtle tracking (calm, modern)"
          classes={`px-3 py-1.5 text-[11px] rounded-full font-medium tracking-[0.02em] leading-none`}
          textOverride={(s) => s.toLowerCase()}
        />
        <Row
          label="H3 · Outlined + Title Case (lets photo dominate)"
          classes={`px-3 py-1.5 text-[11px] rounded-full font-medium leading-none`}
          textOverride={(s) => s}
          style="outlined"
        />
        <Row
          label="H4 · Ghost + dot (color-agnostic — same on any image)"
          classes={`${smPad} text-[10px] tracking-[0.08em] uppercase font-semibold leading-none rounded-full`}
          style="ghost"
        />
        <Row
          label="H5 · rounded-md + filled (square ribbon, modern news look)"
          classes={`${smPad} text-[10px] tracking-[0.1em] uppercase font-semibold leading-none rounded-md`}
        />
      </Section>

      <footer className="pt-12 border-t border-border/30 text-xs text-muted-foreground/60">
        Povej kateri ID ti je všeč in ga spravim v produkcijo.
      </footer>
    </main>
  );
}
