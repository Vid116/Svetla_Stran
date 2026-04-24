"use client";

import { useState } from "react";
import { Sun } from "lucide-react";
import { THEMES, TOPICAL_THEME_ORDER, RITUAL_THEME_ORDER } from "@/lib/article-helpers";
import { ThemePickerModal } from "@/components/theme-picker-modal";

const ALL_THEMES = [...TOPICAL_THEME_ORDER, ...RITUAL_THEME_ORDER];

interface Props {
  /** "hero" = large with description, "inline" = compact for article footer, "afterglow" = end-of-article intimate */
  variant?: "hero" | "inline" | "afterglow";
  /** Pre-select this theme slug in the picker modal */
  theme?: string;
}

export function NewsletterSignup({ variant = "hero", theme }: Props) {
  const [email, setEmail] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([...ALL_THEMES]);
  const [showTopics, setShowTopics] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  const toggleTheme = (slug: string) => {
    setSelectedThemes((prev) => {
      if (prev.includes(slug)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== slug);
      }
      return [...prev, slug];
    });
  };

  const allSelected = selectedThemes.length === ALL_THEMES.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;

    // If user hasn't manually picked themes, show the modal
    if (!showTopics && allSelected) {
      setShowModal(true);
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          themes: allSelected ? [] : selectedThemes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Nekaj je šlo narobe.");
        return;
      }

      setStatus("success");
      setMessage(data.message || "Naročilo sprejeto. Vidimo se jutri zjutraj.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Nekaj je šlo narobe. Poskusi znova.");
    }
  };

  if (status === "success") {
    return (
      <div className={variant === "hero" ? "text-center py-8" : "py-4"}>
        <div className="inline-flex items-center gap-2 rounded-xl bg-nature/10 px-5 py-3">
          <Sun className="w-4 h-4 text-gold" aria-hidden />
          <p className="text-sm font-medium text-nature">
            {message}
          </p>
        </div>
        {variant === "hero" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Prvo pismo pride jutri zjutraj.
          </p>
        )}
      </div>
    );
  }

  if (variant === "afterglow") {
    return (
      <div className="rounded-xl border border-border/40 bg-card/50 p-6">
        <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground/60 mb-2">
          Dnevna doza dobrega
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          Svet ni tak kot ga kažejo. Dokaži si vsak dan.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ti@email.si"
            required
            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {status === "loading" ? "…" : "Pošlji mi"}
          </button>
        </form>
        {status === "error" && (
          <p className="mt-2 text-xs text-destructive">{message}</p>
        )}
        <button
          type="button"
          onClick={() => setShowTopics(!showTopics)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTopics ? "Skrij teme" : "Izberi teme"} {showTopics ? "↑" : "↓"}
        </button>
        {showTopics && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ALL_THEMES.map((slug) => {
              const t = THEMES[slug];
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleTheme(slug)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all ${
                    selectedThemes.includes(slug)
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
        {showModal && (
          <ThemePickerModal
            email={email}
            initialTheme={theme}
            onComplete={() => {
              setShowModal(false);
              setStatus("success");
              setMessage("Naročilo sprejeto. Vidimo se jutri zjutraj.");
              setEmail("");
            }}
          />
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-4 h-4 text-gold" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            Ena dobra zgodba na dan
          </h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Kratki članki, preverjene zgodbe. Vsako jutro v tvoj nabiralnik.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ti@email.si"
            required
            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {status === "loading" ? "…" : "Naroči se"}
          </button>
        </form>
        {status === "error" && (
          <p className="mt-2 text-xs text-destructive">{message}</p>
        )}
        <button
          type="button"
          onClick={() => setShowTopics(!showTopics)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTopics ? "Skrij teme" : "Izberi teme"} {showTopics ? "↑" : "↓"}
        </button>
        {showTopics && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ALL_THEMES.map((slug) => {
              const t = THEMES[slug];
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleTheme(slug)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all ${
                    selectedThemes.includes(slug)
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
        {showModal && (
          <ThemePickerModal
            email={email}
            initialTheme={theme}
            onComplete={() => {
              setShowModal(false);
              setStatus("success");
              setMessage("Naročilo sprejeto. Vidimo se jutri zjutraj.");
              setEmail("");
            }}
          />
        )}
      </div>
    );
  }

  // Hero variant
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-gold-soft/30 via-card to-sky-soft/20 p-8 sm:p-10">
      <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-gold-soft/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-sky-soft/30 blur-3xl pointer-events-none" />

      <div className="relative text-center max-w-lg mx-auto">
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
          Dnevna doza dobrega
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Ena dobra zgodba na dan. Brez klikanja, brez doom-scrollinga.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ti@email.si"
            required
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {status === "loading" ? "…" : "Naroči se"}
          </button>
        </form>

        {status === "error" && (
          <p className="mt-3 text-xs text-destructive">{message}</p>
        )}

        <button
          type="button"
          onClick={() => setShowTopics(!showTopics)}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTopics ? "Skrij teme" : "Izberi teme"} {showTopics ? "↑" : "↓"}
        </button>

        {showTopics && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ALL_THEMES.map((slug) => {
              const t = THEMES[slug];
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleTheme(slug)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedThemes.includes(slug)
                      ? "bg-foreground text-background scale-105"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted opacity-60 hover:opacity-100"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground/50">
          Vsako jutro. Odjavi se kadarkoli.
        </p>
      </div>
      {showModal && (
        <ThemePickerModal
          email={email}
          onComplete={() => {
            setShowModal(false);
            setStatus("success");
            setMessage("Naročilo sprejeto. Vidimo se jutri zjutraj.");
            setEmail("");
          }}
        />
      )}
    </div>
  );
}
