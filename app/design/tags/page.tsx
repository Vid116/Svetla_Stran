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
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gradient-to-br from-stone-500 via-stone-600 to-stone-800">
      {/* Mimic the dark overlay on real card images */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
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
}: {
  label: string;
  classes: string;
  style?: PillStyle;
  textOverride?: (s: string) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SAMPLES.map((slug) => {
          const theme = THEMES[slug];
          const text = textOverride ? textOverride(theme.label) : undefined;
          return (
            <Card key={slug}>
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
  // Common baseline classes
  const base = "rounded-full font-semibold uppercase";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 space-y-14">
      <header className="space-y-2">
        <h1 className="text-3xl font-light tracking-tight">Theme ribbon — playground</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Tri vzorčne teme po dolžini (kratka 6 znakov / srednja 8 / dolga 16 znakov) na isti
          siv kartici. Pod vsako vrsto je zapis Tailwind class — ko najdeš, kar ti je všeč,
          povej kateri ID.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Trenutno na produkciji: <code className="px-1.5 py-0.5 rounded bg-muted">A1 baseline</code>
        </p>
      </header>

      {/* ── A · Baseline ── */}
      <Section title="A — Baseline (current)">
        <Row
          label="A1 · px-4 py-2 · text-[11px] · tracking-[0.1em] · uppercase · semibold · rounded-full"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
        />
      </Section>

      {/* ── B · Shape ── */}
      <Section title="B — Shape">
        <Row
          label="B1 · rounded-full"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase font-semibold rounded-full`}
        />
        <Row
          label="B2 · rounded-lg (12px corners)"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase font-semibold rounded-lg`}
        />
        <Row
          label="B3 · rounded-md (6px corners)"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase font-semibold rounded-md`}
        />
        <Row
          label="B4 · rounded-sm (2px corners)"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase font-semibold rounded-sm`}
        />
        <Row
          label="B5 · rounded-none (true ribbon)"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase font-semibold rounded-none`}
        />
      </Section>

      {/* ── C · Size & padding scale ── */}
      <Section title="C — Size scale (proportional)">
        <Row
          label="C1 · text-[10px] · px-3 py-1.5 (compact)"
          classes={`${base} px-3 py-1.5 text-[10px] tracking-[0.1em]`}
        />
        <Row
          label="C2 · text-[11px] · px-4 py-2 (current)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
        />
        <Row
          label="C3 · text-[12px] · px-4 py-2 (slightly larger text)"
          classes={`${base} px-4 py-2 text-[12px] tracking-[0.1em]`}
        />
        <Row
          label="C4 · text-[12px] · px-5 py-2.5 (generous)"
          classes={`${base} px-5 py-2.5 text-[12px] tracking-[0.1em]`}
        />
        <Row
          label="C5 · text-[13px] · px-5 py-3 (large)"
          classes={`${base} px-5 py-3 text-[13px] tracking-[0.1em]`}
        />
      </Section>

      {/* ── D · Tracking ── */}
      <Section title="D — Tracking (letter-spacing)">
        <Row
          label="D1 · tracking-normal (no letter-spacing)"
          classes={`${base} px-4 py-2 text-[11px] tracking-normal`}
        />
        <Row
          label="D2 · tracking-[0.05em] (subtle)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.05em]`}
        />
        <Row
          label="D3 · tracking-[0.1em] (current)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
        />
        <Row
          label="D4 · tracking-[0.14em] (wide)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.14em]`}
        />
        <Row
          label="D5 · tracking-[0.2em] (very wide — needs more px)"
          classes={`${base} px-5 py-2 text-[11px] tracking-[0.2em]`}
        />
      </Section>

      {/* ── E · Weight ── */}
      <Section title="E — Weight">
        <Row
          label="E1 · font-normal"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase rounded-full font-normal`}
        />
        <Row
          label="E2 · font-medium"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase rounded-full font-medium`}
        />
        <Row
          label="E3 · font-semibold (current)"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase rounded-full font-semibold`}
        />
        <Row
          label="E4 · font-bold"
          classes={`px-4 py-2 text-[11px] tracking-[0.1em] uppercase rounded-full font-bold`}
        />
      </Section>

      {/* ── F · Case ── */}
      <Section title="F — Case (with sentence and lowercase)">
        <Row
          label="F1 · UPPERCASE (current)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
        />
        <Row
          label="F2 · Title Case (no uppercase, no tracking)"
          classes={`px-4 py-2 text-[12px] rounded-full font-semibold`}
          textOverride={(s) => s}
        />
        <Row
          label="F3 · lowercase italic (intimate, on-brand)"
          classes={`px-4 py-2 text-[12px] rounded-full font-medium italic`}
          textOverride={(s) => s.toLowerCase()}
        />
      </Section>

      {/* ── G · Visual style ── */}
      <Section title="G — Visual style (color treatment)">
        <Row
          label="G1 · Filled (current — fill bg, activeText fg)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
          style="filled"
        />
        <Row
          label="G2 · Soft (lighter bg, darker text — gentler)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
          style="soft"
        />
        <Row
          label="G3 · Outlined (white bg, theme border)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
          style="outlined"
        />
        <Row
          label="G4 · Ghost (white-on-blur, color-agnostic)"
          classes={`${base} px-4 py-2 text-[11px] tracking-[0.1em]`}
          style="ghost"
        />
        <Row
          label="G5 · Dot prefix (filled + leading dot)"
          classes={`${base} px-3 py-1.5 text-[11px] tracking-[0.1em]`}
          style="dot"
        />
        <Row
          label="G6 · Underline only (no pill, theme color underline)"
          classes={`px-1 py-1 text-[12px] tracking-[0.05em] uppercase font-semibold rounded-none`}
          style="underline"
        />
      </Section>

      {/* ── H · Hybrid candidates (best of) ── */}
      <Section title="H — Hybrid candidates">
        <Row
          label="H1 · Soft + larger + Title Case (intimate, breathy, on-brand)"
          classes={`px-4 py-2 text-[12px] rounded-full font-medium`}
          textOverride={(s) => s}
          style="soft"
        />
        <Row
          label="H2 · Filled + lowercase + tracking 0.05em (calm, modern)"
          classes={`px-4 py-2 text-[12px] rounded-full font-medium tracking-[0.05em]`}
          textOverride={(s) => s.toLowerCase()}
        />
        <Row
          label="H3 · Outlined + Title Case (subtle, lets the photo breathe)"
          classes={`px-4 py-2 text-[12px] rounded-full font-medium`}
          textOverride={(s) => s}
          style="outlined"
        />
        <Row
          label="H4 · Ghost + tiny dot (color-agnostic for any image)"
          classes={`px-3 py-1.5 text-[11px] tracking-[0.08em] uppercase font-semibold rounded-full`}
          style="dot"
        />
        <Row
          label="H5 · rounded-md + filled + uppercase (square ribbon)"
          classes={`px-3 py-1.5 text-[11px] tracking-[0.1em] uppercase font-semibold rounded-md`}
        />
      </Section>

      <footer className="pt-12 border-t border-border/30 text-xs text-muted-foreground/60">
        Pa povej kateri ID ti je všeč in spravim ga v produkcijo.
      </footer>
    </main>
  );
}
