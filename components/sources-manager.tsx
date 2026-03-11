"use client";

import { useState, useEffect, useCallback } from "react";

interface RSSSource {
  name: string;
  url: string;
  category?: string;
  active: boolean;
}

interface HTMLSource {
  name: string;
  url: string;
  linkSelector: string;
  linkPattern: string;
  category?: string;
  active: boolean;
}

interface SourcesData {
  rss: RSSSource[];
  html: HTMLSource[];
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  SPORT: { label: "Sport", color: "bg-sky text-sky-foreground" },
  ZIVALI: { label: "Zivali", color: "bg-warmth text-warmth-foreground" },
  SKUPNOST: { label: "Skupnost", color: "bg-lavender text-lavender-foreground" },
  NARAVA: { label: "Narava", color: "bg-nature text-nature-foreground" },
  INFRASTRUKTURA: { label: "Infrastruktura", color: "bg-gold text-gold-foreground" },
  PODJETNISTVO: { label: "Podjetnistvo", color: "bg-gold text-gold-foreground" },
  SLOVENIJA_V_SVETU: { label: "Slovenija v svetu", color: "bg-sky text-sky-foreground" },
  JUNAKI: { label: "Junaki", color: "bg-rose text-rose-foreground" },
  KULTURA: { label: "Kultura", color: "bg-lavender text-lavender-foreground" },
};

const ALL_CATEGORIES = Object.keys(CATEGORIES);

type SourceType = "rss" | "html";

export function SourcesManager() {
  const [sources, setSources] = useState<SourcesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addType, setAddType] = useState<SourceType>("rss");

  // Add form state
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLinkSelector, setNewLinkSelector] = useState("a");
  const [newLinkPattern, setNewLinkPattern] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      if (!res.ok) throw new Error("Napaka pri nalaganju virov");
      const data = await res.json();
      setSources(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  async function toggleActive(url: string, active: boolean) {
    try {
      const res = await fetch("/api/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, updates: { active: !active } }),
      });
      if (!res.ok) throw new Error("Napaka pri posodabljanju");
      await fetchSources();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteSource(url: string, name: string) {
    if (!confirm(`Res zelis odstraniti vir "${name}"?`)) return;
    try {
      const res = await fetch("/api/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Napaka pri brisanju");
      await fetchSources();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) {
      setError("Ime in URL sta obvezna");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const source: any = {
        name: newName.trim(),
        url: newUrl.trim(),
        active: true,
      };
      if (newCategory) source.category = newCategory;
      if (addType === "html") {
        source.linkSelector = newLinkSelector.trim() || "a";
        source.linkPattern = newLinkPattern.trim();
        if (!source.linkPattern) {
          setError("HTML vir potrebuje linkPattern");
          setSaving(false);
          return;
        }
      }
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: addType, source }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka pri dodajanju");
      }
      // Reset form
      setNewName("");
      setNewUrl("");
      setNewCategory("");
      setNewLinkSelector("a");
      setNewLinkPattern("");
      setAdding(false);
      await fetchSources();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Nalagam vire...
      </div>
    );
  }

  if (!sources) {
    return (
      <div className="py-16 text-center text-destructive">
        Napaka pri nalaganju virov
      </div>
    );
  }

  // Combine all sources with type tag
  type TaggedSource = (RSSSource | HTMLSource) & { _type: SourceType };
  const allSources: TaggedSource[] = [
    ...sources.rss.map((s) => ({ ...s, _type: "rss" as SourceType })),
    ...sources.html.map((s) => ({ ...s, _type: "html" as SourceType })),
  ];

  // Group by category
  const grouped: Record<string, TaggedSource[]> = {};
  for (const s of allSources) {
    const cat = s.category || "BREZ_KATEGORIJE";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  // Get categories in display order
  const displayCategories = [
    ...ALL_CATEGORIES.filter((c) => grouped[c]),
    ...(grouped["BREZ_KATEGORIJE"] ? ["BREZ_KATEGORIJE"] : []),
  ];

  const filteredCategories = filterCategory
    ? displayCategories.filter((c) => c === filterCategory)
    : displayCategories;

  return (
    <div>
      {/* Category filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            filterCategory === null
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          Vse ({allSources.length})
        </button>
        {displayCategories.map((cat) => {
          const info = CATEGORIES[cat] || { label: "Splošno", color: "bg-muted" };
          const count = grouped[cat]?.length || 0;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                filterCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {info.label} ({count})
            </button>
          );
        })}

        <button
          onClick={() => setAdding(!adding)}
          className="ml-auto rounded-lg bg-nature px-4 py-1.5 text-sm font-medium text-nature-foreground shadow-sm transition-all hover:opacity-90"
        >
          {adding ? "Preklici" : "+ Dodaj vir"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive">
            ✕
          </button>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Dodaj nov vir</h3>

          {/* Type toggle */}
          <div className="mb-4 flex items-center gap-1 rounded-full bg-secondary p-0.5 w-fit">
            <button
              onClick={() => setAddType("rss")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                addType === "rss"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              RSS
            </button>
            <button
              onClick={() => setAddType("html")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                addType === "html"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              HTML Scraping
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Ime</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="npr. RTV SLO"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">URL</label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={addType === "rss" ? "https://example.com/feed/" : "https://example.com"}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategorija (opcijsko)</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Brez (AI doloci)</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORIES[cat].label}
                  </option>
                ))}
              </select>
            </div>
            {addType === "html" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Link Selector
                  </label>
                  <input
                    type="text"
                    value={newLinkSelector}
                    onChange={(e) => setNewLinkSelector(e.target.value)}
                    placeholder="a"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Link Pattern (regex)
                  </label>
                  <input
                    type="text"
                    value={newLinkPattern}
                    onChange={(e) => setNewLinkPattern(e.target.value)}
                    placeholder="/(novice|clanki)/"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-lg bg-nature px-5 py-2 text-sm font-medium text-nature-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Shranjujem..." : "Dodaj"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground transition-all hover:bg-accent"
            >
              Preklici
            </button>
          </div>
        </div>
      )}

      {/* Sources by category */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => {
          const info = CATEGORIES[cat] || { label: "Splošno (AI doloci kategorijo)", color: "bg-muted text-muted-foreground" };
          const items = grouped[cat] || [];

          return (
            <div key={cat}>
              <div className="mb-3 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${info.color}`}>
                  {info.label}
                </span>
                <span className="text-xs text-muted-foreground">{items.length} virov</span>
              </div>

              <div className="space-y-2">
                {items.map((source) => (
                  <div
                    key={source.url}
                    className={`flex items-center gap-3 rounded-lg border border-border/50 bg-card/80 px-4 py-3 transition-all ${
                      !source.active ? "opacity-50" : ""
                    }`}
                  >
                    {/* Active toggle */}
                    <button
                      onClick={() => toggleActive(source.url, source.active)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        source.active ? "bg-nature" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          source.active ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{source.name}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          source._type === "rss"
                            ? "bg-sky/10 text-sky-foreground"
                            : "bg-gold/10 text-gold-foreground"
                        }`}>
                          {source._type}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{source.url}</p>
                      {source._type === "html" && (
                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                          Pattern: <code className="rounded bg-muted px-1 text-[10px]">{(source as HTMLSource).linkPattern}</code>
                        </p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteSource(source.url, source.name)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Odstrani vir"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mt-8 rounded-lg bg-muted/50 p-4 text-center text-xs text-muted-foreground">
        {sources.rss.filter((s) => s.active).length} RSS virov + {sources.html.filter((s) => s.active).length} HTML virov = {allSources.filter((s) => s.active).length} aktivnih virov
      </div>
    </div>
  );
}
