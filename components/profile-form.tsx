"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function ProfileForm({
  currentUsername,
  currentName,
}: {
  currentUsername: string;
  currentName: string;
}) {
  return (
    <>
      {/* Name (read-only) */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Ime</h3>
        <p className="text-sm text-muted-foreground">
          {currentName}
        </p>
        <p className="mt-2 text-xs text-muted-foreground/60">
          Ime nastavlja administrator.
        </p>
      </div>

      <UsernameForm currentUsername={currentUsername} />
      <PasswordForm />
    </>
  );
}

function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const [username, setUsername] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) {
      setError("Uporabnisko ime mora imeti vsaj 3 znake");
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(trimmed)) {
      setError("Samo male crke, stevilke, pike, podcrke in pomisljaji");
      return;
    }
    if (trimmed === currentUsername) {
      setError("Uporabnisko ime je enako");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka");
      }
      setSuccess(true);
      // Need to re-login since auth email changed
      setTimeout(() => {
        window.location.href = "/prijava";
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Uporabnisko ime</h3>
      <div>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
        />
      </div>
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
      {success && (
        <div className="rounded-lg bg-nature/10 p-3 text-xs text-nature">
          Uporabnisko ime spremenjeno. Preusmerja na prijavo ...
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Shranjujem..." : "Spremeni"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("Geslo mora imeti vsaj 6 znakov");
      return;
    }
    if (password !== confirm) {
      setError("Gesli se ne ujemata");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Spremeni geslo</h3>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Novo geslo</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Potrdi geslo</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
        />
      </div>
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
      {success && <div className="rounded-lg bg-nature/10 p-3 text-xs text-nature">Geslo uspesno spremenjeno.</div>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Shranjujem..." : "Spremeni geslo"}
      </button>
    </form>
  );
}
