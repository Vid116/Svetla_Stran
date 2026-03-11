"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  source_name: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES: Record<string, string> = {
  SPORT: "Sport",
  ZIVALI: "Zivali",
  SKUPNOST: "Skupnost",
  NARAVA: "Narava",
  INFRASTRUKTURA: "Infrastruktura",
  PODJETNISTVO: "Podjetnistvo",
  SLOVENIJA_V_SVETU: "Slovenija v svetu",
  JUNAKI: "Junaki",
  KULTURA: "Kultura",
};

export function DraftsView() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", subtitle: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts");
      if (res.ok) {
        const data = await res.json();
        setDrafts(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  function startEditing(draft: Draft) {
    setEditingId(draft.id);
    setEditForm({
      title: draft.title,
      subtitle: draft.subtitle || "",
      body: draft.body,
    });
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
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, ...editForm } : d
          )
        );
        setEditingId(null);
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  async function handlePublish(id: string) {
    setPublishing(id);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: id }),
      });
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {} finally {
      setPublishing(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/drafts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p className="text-lg">Nalagam osnutke...</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <div className="text-4xl mb-4" aria-hidden>📝</div>
        <p className="text-lg font-light">Ni osnutkov za pregled.</p>
        <p className="mt-2 text-sm">Pojdi v inbox in zazeni pisanje za kaksen clanek.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {drafts.length} {drafts.length === 1 ? "osnutek" : drafts.length < 5 ? "osnutki" : "osnutkov"} za pregled
      </p>

      {drafts.map((draft) => {
        const isEditing = editingId === draft.id;
        const isPublishing = publishing === draft.id;

        return (
          <Card key={draft.id} className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {draft.category && (
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {CATEGORIES[draft.category] || draft.category}
                    </Badge>
                  )}
                  {draft.source_name && (
                    <span className="text-xs text-muted-foreground">
                      iz {draft.source_name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(draft.created_at).toLocaleDateString("sl-SI")}
                </span>
              </div>

              {isEditing ? (
                /* Edit mode */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Naslov</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Podnaslov</label>
                    <input
                      type="text"
                      value={editForm.subtitle}
                      onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Vsebina</label>
                    <textarea
                      value={editForm.body}
                      onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                      rows={12}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(draft.id)}
                      disabled={saving}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? "Shranjujem..." : "Shrani"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
                    >
                      Preklic
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    {draft.title}
                  </h2>
                  {draft.subtitle && (
                    <p className="text-sm text-muted-foreground mb-4">{draft.subtitle}</p>
                  )}
                  <div className="rounded-lg bg-muted/40 p-4 mb-4 max-h-48 overflow-y-auto">
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                      {draft.body.slice(0, 800)}
                      {draft.body.length > 800 && "..."}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handlePublish(draft.id)}
                      disabled={isPublishing}
                      className="rounded-lg bg-nature px-4 py-2 text-xs font-medium text-nature-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                    >
                      {isPublishing ? "Objavljam..." : "Objavi"}
                    </button>
                    <button
                      onClick={() => startEditing(draft)}
                      className="rounded-lg bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      Uredi
                    </button>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      className="rounded-lg bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
                    >
                      Zavrzi
                    </button>
                    {draft.source_url && (
                      <a
                        href={draft.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        Odpri vir
                      </a>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
