"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_ACCENT_BAR,
  ANTIDOTE_LABELS,
  formatDate,
} from "@/lib/article-helpers";

interface Reference {
  url: string;
  title: string;
  type?: "primary" | "secondary";
}

interface VerificationClaim {
  claim: string;
  status: "ok" | "nepreverljivo" | "napačno" | "napacno";
  evidence?: "primarni" | "vec_neodvisnih" | "en_medij" | "le_izvirnik";
  note?: string;
}

interface Draft {
  id: string;
  headline_id: string | null;
  title: string;
  subtitle: string | null;
  body: string;
  slug: string;
  image_url: string | null;
  category: string | null;
  emotions: string[];
  antidote: string | null;
  antidote_secondary: string | null;
  ai_score: number | null;
  ai_image_url: string | null;
  source_name: string | null;
  source_url: string | null;
  research_queries: string[] | null;
  research_sources_found: number | null;
  research_sources_used: number | null;
  research_references: Reference[] | null;
  verification_passed: boolean | null;
  verification_summary: string | null;
  verification_claims: VerificationClaim[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const EVIDENCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  primarni: { label: "Primarni vir", color: "text-nature", bg: "bg-nature/10" },
  vec_neodvisnih: { label: "Vec neodvisnih", color: "text-primary", bg: "bg-primary/10" },
  en_medij: { label: "En medij", color: "text-gold-foreground", bg: "bg-gold/10" },
  le_izvirnik: { label: "Le izvirnik", color: "text-destructive", bg: "bg-destructive/10" },
};

/** Find ALL reference URLs mentioned in a claim note */
function findRefUrls(note: string | undefined, refs: Reference[]): Reference[] {
  if (!note) return [];
  const noteLower = note.toLowerCase();
  const matched: Reference[] = [];
  for (const ref of refs) {
    const domain = ref.url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    if (noteLower.includes(domain.toLowerCase()) ||
        (ref.title && noteLower.includes(ref.title.toLowerCase().slice(0, 15)))) {
      matched.push(ref);
    }
  }
  return matched;
}

export function DraftsView() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", subtitle: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "research" | "claims">("preview");
  const [fullPage, setFullPage] = useState(false);

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts");
      if (res.ok) setDrafts(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  // Close full-page on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullPage(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function startEditing(draft: Draft) {
    setEditingId(draft.id);
    setEditForm({ title: draft.title, subtitle: draft.subtitle || "", body: draft.body });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (res.ok) {
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...editForm } : d)));
        setEditingId(null);
      }
    } catch {} finally { setSaving(false); }
  }

  async function handlePublish(id: string) {
    setPublishing(id);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: id }),
      });
      if (res.ok) { setDrafts((prev) => prev.filter((d) => d.id !== id)); setSelectedId(null); setFullPage(false); }
    } catch {} finally { setPublishing(null); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/drafts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { setDrafts((prev) => prev.filter((d) => d.id !== id)); if (selectedId === id) { setSelectedId(null); setFullPage(false); } }
    } catch {}
  }

  async function handleImageUpdate(id: string, newUrl: string) {
    try {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, image_url: newUrl }),
      });
      if (res.ok) {
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, image_url: newUrl } : d)));
      }
    } catch {}
  }

  async function handleSlugUpdate(id: string, newSlug: string) {
    const cleaned = newSlug.trim().toLowerCase().replace(/[^a-z0-9čšžćđ-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!cleaned) return;
    try {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, slug: cleaned }),
      });
      if (res.ok) {
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, slug: cleaned } : d)));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Napaka pri shranjevanju slug-a");
      }
    } catch {}
  }

  if (loading) return <div className="py-24 text-center text-muted-foreground"><p className="text-lg">Nalagam osnutke...</p></div>;
  if (drafts.length === 0) return <div className="py-24 text-center text-muted-foreground"><p className="text-lg font-light">Ni osnutkov za pregled.</p><p className="mt-2 text-sm">Pojdi v inbox in zazeni pisanje za kaksen clanek.</p></div>;

  const selected = drafts.find((d) => d.id === selectedId);

  // ── Full-page preview overlay ──
  if (fullPage && selected) {
    return (
      <FullPagePreview
        draft={selected}
        onClose={() => setFullPage(false)}
        onPublish={() => handlePublish(selected.id)}
        onEdit={() => { setFullPage(false); startEditing(selected); }}
        onDelete={() => handleDelete(selected.id)}
        onImageUpdate={(url) => handleImageUpdate(selected.id, url)}
        onSlugUpdate={(s) => handleSlugUpdate(selected.id, s)}
        isPublishing={publishing === selected.id}
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {drafts.length} {drafts.length === 1 ? "osnutek" : drafts.length < 5 ? "osnutki" : "osnutkov"} za pregled
      </p>

      {/* Draft cards list */}
      <div className="grid gap-3">
        {drafts.map((draft) => {
          const refs = draft.research_references || [];
          const primaryRefs = refs.filter((r) => r.type === "primary");
          const claims = draft.verification_claims || [];
          const isSelected = selectedId === draft.id;

          return (
            <button
              key={draft.id}
              onClick={() => { setSelectedId(isSelected ? null : draft.id); setActiveTab("preview"); }}
              className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                isSelected ? "border-primary/40 bg-primary/5 shadow-md" : "border-border/50 bg-card/80 hover:border-border"
              }`}
            >
              <div className="flex gap-4">
                {(draft.image_url || draft.ai_image_url) && (
                  <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
                    <img src={draft.image_url || draft.ai_image_url || ''} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {draft.category && (
                      <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0">
                        {CATEGORY_LABELS[draft.category] || draft.category}
                      </Badge>
                    )}
                    {draft.verification_passed !== null && (
                      <Badge variant="default" className={`rounded-full text-[10px] px-2 py-0 ${
                        draft.verification_passed ? "bg-nature/15 text-nature border-nature/30" : "bg-destructive/15 text-destructive border-destructive/30"
                      }`}>
                        {draft.verification_passed ? "Preverjeno" : "Pozor"}
                      </Badge>
                    )}
                    {draft.ai_score != null && (
                      <Badge variant="default" className={`rounded-full text-[10px] px-2 py-0 font-bold ${
                        draft.ai_score >= 8 ? "bg-gold/20 text-gold border-gold/30" :
                        draft.ai_score >= 6 ? "bg-sky/20 text-sky border-sky/30" :
                        "bg-muted text-muted-foreground border-border"
                      }`}>
                        {draft.ai_score}/10
                      </Badge>
                    )}
                    {draft.antidote && ANTIDOTE_LABELS[draft.antidote] && (
                      <Badge variant="default" className="rounded-full text-[10px] px-2 py-0 bg-warmth/15 text-warmth border-warmth/30">
                        {ANTIDOTE_LABELS[draft.antidote].label}
                      </Badge>
                    )}
                    {draft.antidote_secondary && ANTIDOTE_LABELS[draft.antidote_secondary] && (
                      <Badge variant="default" className="rounded-full text-[10px] px-2 py-0 bg-warmth/10 text-warmth/60 border-warmth/20">
                        {ANTIDOTE_LABELS[draft.antidote_secondary].label}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {refs.length} virov{primaryRefs.length > 0 && ` (${primaryRefs.length} prim.)`} · {claims.length} trditev
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(draft.created_at).toLocaleDateString("sl-SI")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{draft.title}</h3>
                  {draft.subtitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{draft.subtitle}</p>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <Card className="border-primary/20 bg-card shadow-lg">
          <CardContent className="p-0">
            {/* Tabs + full page button */}
            <div className="flex border-b border-border/50">
              {(["preview", "research", "claims"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "preview" ? "Predogled" : tab === "research" ? "Viri" : "Preverba"}
                </button>
              ))}
              <button
                onClick={() => setFullPage(true)}
                className="ml-auto px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                Celoten pogled
              </button>
            </div>

            {activeTab === "preview" && (
              <div className="p-6">
                {editingId === selected.id ? (
                  <EditForm form={editForm} onChange={setEditForm} onSave={() => saveEdit(selected.id)} onCancel={() => setEditingId(null)} saving={saving} />
                ) : (
                  <ArticlePreviewCompact
                    draft={selected}
                    onEdit={() => startEditing(selected)}
                    onPublish={() => handlePublish(selected.id)}
                    onDelete={() => handleDelete(selected.id)}
                    onFullPage={() => setFullPage(true)}
                    onImageUpdate={(url) => handleImageUpdate(selected.id, url)}
                    onSlugUpdate={(s) => handleSlugUpdate(selected.id, s)}
                    isPublishing={publishing === selected.id}
                  />
                )}
              </div>
            )}
            {activeTab === "research" && <SourcesPanel draft={selected} />}
            {activeTab === "claims" && <ClaimsPanel draft={selected} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Full Page Preview (matches published article layout) ───────── */

function EditableSlug({ slug, onSave }: { slug: string; onSave: (s: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slug);

  if (!editing) {
    return (
      <button
        onClick={() => { setValue(slug); setEditing(true); }}
        className="text-xs text-muted-foreground/50 font-mono hover:text-primary cursor-pointer"
        title="Klikni za urejanje slug-a"
      >
        /{slug} ✏️
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-muted-foreground/50 font-mono">/</span>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(value); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="text-xs font-mono bg-muted/50 border border-border rounded px-1.5 py-0.5 w-64 focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button onClick={() => { onSave(value); setEditing(false); }} className="text-xs text-nature hover:text-nature/80">✓</button>
      <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">✗</button>
    </span>
  );
}

function FullPagePreview({
  draft, onClose, onPublish, onEdit, onDelete, onImageUpdate, onSlugUpdate, isPublishing,
}: {
  draft: Draft; onClose: () => void; onPublish: () => void; onEdit: () => void; onDelete: () => void;
  onImageUpdate: (url: string) => void; onSlugUpdate: (s: string) => void; isPublishing: boolean;
}) {
  const paragraphs = draft.body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const accentBar = CATEGORY_ACCENT_BAR[draft.category || ""] ?? "bg-primary";
  const refs = draft.research_references || [];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Floating toolbar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="mx-auto max-w-4xl px-6 py-2.5 flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <span>←</span> Nazaj
          </button>
          <EditableSlug slug={draft.slug} onSave={onSlugUpdate} />
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onPublish} disabled={isPublishing} className="rounded-lg bg-nature px-4 py-1.5 text-xs font-medium text-nature-foreground hover:opacity-90 disabled:opacity-50">
              {isPublishing ? "Objavljam..." : "Objavi"}
            </button>
            <button onClick={onEdit} className="rounded-lg bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
              Uredi
            </button>
            <button onClick={onDelete} className="rounded-lg bg-destructive/10 px-4 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20">
              Zavrzi
            </button>
          </div>
        </div>
      </div>

      {/* Hero image */}
      {draft.image_url ? (
        <div className="relative h-64 sm:h-80 md:h-[28rem] overflow-hidden">
          <img src={draft.image_url} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      ) : (
        <ImagePlaceholder draft={draft} onImageUpdate={onImageUpdate} />
      )}

      {/* Header */}
      <header className={`relative ${draft.image_url ? "-mt-24" : ""}`}>
        <div className="relative mx-auto max-w-3xl px-6 pt-8 pb-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-xl">{CATEGORY_ICONS[draft.category || ""] ?? "📰"}</span>
            {draft.source_name && <span className="text-xs text-muted-foreground">iz {draft.source_name}</span>}
            <time className="text-xs text-muted-foreground">{formatDate(draft.created_at)}</time>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-foreground mb-5">
            {draft.title}
          </h1>
          {draft.subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light">{draft.subtitle}</p>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className={`h-[3px] w-16 rounded-full ${accentBar} opacity-50 mb-10`} />
        <div className="space-y-6">
          {paragraphs.map((p, i) => (
            <p key={i} className={`leading-[1.85] text-foreground/85 ${i === 0 ? "text-lg font-light" : "text-base"}`}>
              {p}
            </p>
          ))}
        </div>

        {/* Sources */}
        {refs.length > 0 && (
          <div className="mt-10 p-5 rounded-xl bg-muted/40 border border-border/40">
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/60 mb-3">Viri</p>
            <ol className="space-y-2">
              {refs.map((ref, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground/50 mt-0.5 shrink-0">{i + 1}.</span>
                  <div className="min-w-0">
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground/80 hover:text-primary transition-colors line-clamp-1">
                      {ref.title || ref.url}
                      {ref.type === "primary" && <span className="ml-1.5 text-[9px] font-semibold text-nature bg-nature/10 px-1.5 py-0.5 rounded">PRIMARNI</span>}
                      <span className="ml-0.5 text-xs text-primary" aria-hidden>↗</span>
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Image search if no image */}
        {!draft.image_url && (
          <div className="mt-8">
            <ImagePlaceholder draft={draft} onImageUpdate={onImageUpdate} />
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Image placeholder with search ──────────────────────────────── */

function ImagePlaceholder({ draft, onImageUpdate }: { draft: Draft; onImageUpdate: (url: string) => void }) {
  const [searching, setSearching] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showManual, setShowManual] = useState(false);

  async function searchImage() {
    setSearching(true);
    try {
      // Use Unsplash API to search for relevant images
      const query = encodeURIComponent(draft.title.split(" ").slice(0, 4).join(" "));
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=6&orientation=landscape`, {
        headers: { Authorization: "Client-ID YOUR_UNSPLASH_KEY" }, // TODO: add real key
      });
      if (!res.ok) {
        // Fallback: open Unsplash search in new tab
        window.open(`https://unsplash.com/s/photos/${query}`, "_blank");
      }
    } catch {
      const query = encodeURIComponent(draft.title.split(" ").slice(0, 4).join(" "));
      window.open(`https://unsplash.com/s/photos/${query}`, "_blank");
    } finally {
      setSearching(false);
      setShowManual(true);
    }
  }

  function submitManualUrl() {
    if (imageUrl.trim()) {
      onImageUpdate(imageUrl.trim());
      setImageUrl("");
      setShowManual(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-8 text-center">
      <div className="text-3xl opacity-30 mb-3">{CATEGORY_ICONS[draft.category || ""] ?? "📷"}</div>
      <p className="text-sm text-muted-foreground mb-4">Ni slike ali slika ni dovolj kakovostna</p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={searchImage}
          disabled={searching}
          className="rounded-lg bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {searching ? "Iscem..." : "Poisci sliko"}
        </button>
        <button
          onClick={() => setShowManual(!showManual)}
          className="rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
        >
          Vnesi URL
        </button>
      </div>
      {showManual && (
        <div className="mt-4 flex items-center gap-2 max-w-lg mx-auto">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={submitManualUrl}
            disabled={!imageUrl.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Shrani
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Compact Article Preview (in panel) ─────────────────────────── */

function ArticlePreviewCompact({
  draft, onEdit, onPublish, onDelete, onFullPage, onImageUpdate, onSlugUpdate, isPublishing,
}: {
  draft: Draft; onEdit: () => void; onPublish: () => void; onDelete: () => void;
  onFullPage: () => void; onImageUpdate: (url: string) => void; onSlugUpdate: (s: string) => void; isPublishing: boolean;
}) {
  return (
    <article className="max-w-2xl mx-auto">
      {draft.image_url ? (
        <div className="rounded-xl overflow-hidden mb-6 aspect-[2/1] bg-muted">
          <img src={draft.image_url} alt={draft.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
        </div>
      ) : (
        <div className="mb-6"><ImagePlaceholder draft={draft} onImageUpdate={onImageUpdate} /></div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {draft.category && <Badge variant="secondary" className="rounded-full text-xs">{CATEGORY_LABELS[draft.category] || draft.category}</Badge>}
        {draft.source_name && <span className="text-xs text-muted-foreground">iz {draft.source_name}</span>}
        <span className="text-xs text-muted-foreground">{new Date(draft.created_at).toLocaleDateString("sl-SI")}</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">{draft.title}</h1>
      {draft.subtitle && <p className="text-base text-muted-foreground leading-relaxed mb-6">{draft.subtitle}</p>}

      <div className="prose prose-sm max-w-none text-foreground/85 leading-relaxed">
        {draft.body.split("\n\n").map((paragraph, i) => <p key={i} className="mb-4">{paragraph}</p>)}
      </div>

      <div className="mt-6 pt-4 border-t border-border/30">
        <EditableSlug slug={draft.slug} onSave={onSlugUpdate} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={onFullPage} className="rounded-lg bg-muted px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Celoten pogled
        </button>
        <button onClick={onPublish} disabled={isPublishing} className="rounded-lg bg-nature px-5 py-2.5 text-sm font-medium text-nature-foreground shadow-sm hover:opacity-90 disabled:opacity-50">
          {isPublishing ? "Objavljam..." : "Objavi"}
        </button>
        <button onClick={onEdit} className="rounded-lg bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/20">Uredi</button>
        <button onClick={onDelete} className="rounded-lg bg-destructive/10 px-5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20">Zavrzi</button>
        {draft.source_url && (
          <a href={draft.source_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-muted px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            Izvirni vir
          </a>
        )}
      </div>
    </article>
  );
}

/* ── Edit Form ──────────────────────────────────────────────────── */

function EditForm({ form, onChange, onSave, onCancel, saving }: {
  form: { title: string; subtitle: string; body: string }; onChange: (f: typeof form) => void;
  onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Naslov</label>
        <input type="text" value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Podnaslov</label>
        <input type="text" value={form.subtitle} onChange={(e) => onChange({ ...form, subtitle: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Vsebina</label>
        <textarea value={form.body} onChange={(e) => onChange({ ...form, body: e.target.value })} rows={16}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50">
          {saving ? "Shranjujem..." : "Shrani"}
        </button>
        <button onClick={onCancel} className="rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent">Preklic</button>
      </div>
    </div>
  );
}

/* ── Sources Panel ──────────────────────────────────────────────── */

function SourcesPanel({ draft }: { draft: Draft }) {
  const refs = draft.research_references || [];
  const primaryRefs = refs.filter((r) => r.type === "primary");
  const secondaryRefs = refs.filter((r) => r.type !== "primary");

  return (
    <div className="p-6 space-y-6">
      {draft.verification_summary && (
        <div className={`rounded-lg border p-4 ${draft.verification_passed ? "bg-nature/5 border-nature/20" : "bg-destructive/5 border-destructive/20"}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-lg ${draft.verification_passed ? "text-nature" : "text-destructive"}`}>{draft.verification_passed ? "\u2713" : "\u2717"}</span>
            <p className="text-sm font-medium">{draft.verification_passed ? "Preverba uspesna" : "Preverba: pozor"}</p>
          </div>
          <p className="text-sm text-muted-foreground">{draft.verification_summary}</p>
        </div>
      )}

      {draft.research_queries && draft.research_queries.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Iskalne poizvedbe ({draft.research_queries.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            {draft.research_queries.map((q, i) => <span key={i} className="text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground">{q}</span>)}
          </div>
        </div>
      )}

      {primaryRefs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-nature mb-3">Primarni viri ({primaryRefs.length})</h3>
          <div className="space-y-2">{primaryRefs.map((ref, i) => <SourceCard key={i} ref_={ref} isPrimary />)}</div>
        </div>
      )}

      {secondaryRefs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Medijski viri ({secondaryRefs.length})</h3>
          <div className="space-y-2">{secondaryRefs.map((ref, i) => <SourceCard key={i} ref_={ref} />)}</div>
        </div>
      )}

      {refs.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Ni podatkov o virih.</p>}
    </div>
  );
}

function SourceCard({ ref_, isPrimary }: { ref_: Reference; isPrimary?: boolean }) {
  const domain = ref_.url.replace(/^https?:\/\//, "").split("/")[0];
  return (
    <a href={ref_.url} target="_blank" rel="noopener noreferrer"
      className={`block rounded-lg border p-3 transition-all hover:shadow-sm ${isPrimary ? "border-nature/20 bg-nature/5 hover:border-nature/40" : "border-border/50 bg-muted/30 hover:border-border"}`}>
      <div className="flex items-start gap-3">
        {isPrimary && <span className="shrink-0 mt-0.5 text-nature"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg></span>}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{ref_.title || domain}</p>
          <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{domain}</p>
        </div>
        <span className="shrink-0 ml-auto text-muted-foreground/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
        </span>
      </div>
    </a>
  );
}

/* ── Claims Panel ───────────────────────────────────────────────── */

function ClaimsPanel({ draft }: { draft: Draft }) {
  const claims = draft.verification_claims || [];
  const refs = draft.research_references || [];
  const okCount = claims.filter((c) => c.status === "ok").length;
  const uncheckCount = claims.filter((c) => c.status === "nepreverljivo").length;
  const failCount = claims.filter((c) => c.status === "napačno" || c.status === "napacno").length;

  const evidenceCounts: Record<string, number> = {};
  claims.forEach((c) => { if (c.evidence) evidenceCounts[c.evidence] = (evidenceCounts[c.evidence] || 0) + 1; });

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="h-5 w-5 rounded-full bg-nature/20 text-nature flex items-center justify-center text-xs font-bold">{okCount}</span>
          <span className="text-muted-foreground">potrjenih</span>
        </div>
        {uncheckCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="h-5 w-5 rounded-full bg-gold/20 text-gold-foreground flex items-center justify-center text-xs font-bold">{uncheckCount}</span>
            <span className="text-muted-foreground">nepreverljivih</span>
          </div>
        )}
        {failCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="h-5 w-5 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-xs font-bold">{failCount}</span>
            <span className="text-muted-foreground">napacnih</span>
          </div>
        )}
      </div>

      {Object.keys(evidenceCounts).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(evidenceCounts).map(([key, count]) => {
            const label = EVIDENCE_LABELS[key];
            if (!label) return null;
            return <span key={key} className={`text-xs px-2.5 py-1 rounded-full ${label.bg} ${label.color} font-medium`}>{count}x {label.label}</span>;
          })}
        </div>
      )}

      <div className="space-y-2">
        {claims.map((c, i) => {
          const matchedRefs = findRefUrls(c.note, refs);
          return (
            <div key={i} className={`rounded-lg border p-3 ${
              c.status === "ok" ? "border-border/30 bg-card" : c.status === "nepreverljivo" ? "border-gold/20 bg-gold/5" : "border-destructive/20 bg-destructive/5"
            }`}>
              <div className="flex items-start gap-2.5">
                <span className={`shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  c.status === "ok" ? "bg-nature/20 text-nature" : c.status === "nepreverljivo" ? "bg-gold/20 text-gold-foreground" : "bg-destructive/20 text-destructive"
                }`}>
                  {c.status === "ok" ? "\u2713" : c.status === "nepreverljivo" ? "?" : "\u2717"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90">{c.claim}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {c.evidence && EVIDENCE_LABELS[c.evidence] && (
                      <span className={`text-[10px] font-semibold ${EVIDENCE_LABELS[c.evidence].color}`}>{EVIDENCE_LABELS[c.evidence].label}</span>
                    )}
                    {c.note && <span className="text-xs text-muted-foreground/70">{c.note}</span>}
                  </div>
                  {matchedRefs.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {matchedRefs.map((ref, j) => (
                        <a key={j} href={ref.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline group">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50 group-hover:opacity-100">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          <span className="truncate">{ref.url}</span>
                          {ref.type === "primary" && <span className="shrink-0 text-[9px] font-semibold text-nature bg-nature/10 px-1.5 py-0.5 rounded">PRIMARNI</span>}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {claims.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Ni podatkov o preverjenih trditvah.</p>}
    </div>
  );
}
