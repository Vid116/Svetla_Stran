"use client";

import { useState, useEffect, useCallback } from "react";

interface Editor {
  id: string;
  username: string;
  name: string;
  role: string;
  categories: string[];
  active: boolean;
  created_at: string;
}

const ALL_CATEGORIES = [
  "SPORT", "ZIVALI", "SKUPNOST", "NARAVA", "INFRASTRUKTURA",
  "PODJETNISTVO", "SLOVENIJA_V_SVETU", "JUNAKI", "KULTURA",
];

const CATEGORY_LABELS: Record<string, string> = {
  SPORT: "Sport", ZIVALI: "Zivali", SKUPNOST: "Skupnost", NARAVA: "Narava",
  INFRASTRUKTURA: "Infrastruktura", PODJETNISTVO: "Podjetnistvo",
  SLOVENIJA_V_SVETU: "Slovenija v svetu", JUNAKI: "Junaki", KULTURA: "Kultura",
};

export function EditorManagement() {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("urednik");
  const [categories, setCategories] = useState<string[]>([]);

  const fetchEditors = useCallback(async () => {
    try {
      const res = await fetch("/api/editors");
      if (res.ok) setEditors(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEditors(); }, [fetchEditors]);

  function resetForm() {
    setName("");
    setUsername("");
    setPassword("");
    setRole("urednik");
    setCategories([]);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function startEdit(editor: Editor) {
    setName(editor.name);
    setUsername(editor.username);
    setPassword("");
    setRole(editor.role);
    setCategories(editor.categories || []);
    setEditingId(editor.id);
    setShowForm(true);
    setError(null);
  }

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const body: any = { id: editingId, name, username, role, categories };
        if (password) body.password = password;
        const res = await fetch("/api/editors", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Napaka");
        }
      } else {
        if (!password) { setError("Geslo je obvezno"); setSaving(false); return; }
        const res = await fetch("/api/editors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, username, password, role, categories }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Napaka");
        }
      }
      resetForm();
      fetchEditors();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(editor: Editor) {
    try {
      await fetch("/api/editors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editor.id, active: !editor.active }),
      });
      fetchEditors();
    } catch {}
  }

  if (loading) {
    return <p className="text-center text-muted-foreground py-12">Nalagam...</p>;
  }

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="mb-6 rounded-lg bg-nature px-5 py-2.5 text-sm font-medium text-nature-foreground shadow-sm hover:opacity-90 transition-all"
        >
          + Dodaj urednika
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            {editingId ? "Uredi urednika" : "Nov urednik"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Ime (pravo ime — ni spremenljivo za urednika)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Uporabnisko ime
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                pattern="[a-z0-9._-]+"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="uporabnisko.ime"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Geslo {editingId && <span className="text-muted-foreground/50">(pusti prazno za brez spremembe)</span>}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingId}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Vloga</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="urednik">Urednik</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {role === "urednik" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Kategorije</label>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      categories.includes(cat)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Shranjujem..." : editingId ? "Shrani" : "Dodaj"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent"
            >
              Preklici
            </button>
          </div>
        </form>
      )}

      {/* Editors list */}
      <div className="space-y-3">
        {editors.map((editor) => (
          <div
            key={editor.id}
            className={`rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4 ${
              !editor.active ? "opacity-50" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{editor.name}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  editor.role === "admin"
                    ? "bg-lavender/10 text-lavender-foreground"
                    : "bg-sky/10 text-sky-foreground"
                }`}>
                  {editor.role}
                </span>
                {!editor.active && (
                  <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    neaktiven
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">@{editor.username}</p>
              {editor.categories && editor.categories.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {editor.categories.map((cat) => (
                    <span key={cat} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => startEdit(editor)}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                Uredi
              </button>
              <button
                onClick={() => toggleActive(editor)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  editor.active
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-nature/10 text-nature hover:bg-nature/20"
                }`}
              >
                {editor.active ? "Deaktiviraj" : "Aktiviraj"}
              </button>
            </div>
          </div>
        ))}

        {editors.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Ni urednikov.</p>
        )}
      </div>
    </div>
  );
}
