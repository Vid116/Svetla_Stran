"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function ImageAdder({ draftId }: { draftId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handlePreview() {
    if (!url.trim()) return;
    setPreview(url.trim());
    setError(null);
  }

  async function handleSave(imageUrl?: string) {
    const finalUrl = imageUrl || url.trim();
    if (!finalUrl) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, image_url: finalUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka pri shranjevanju");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Samo slike (PNG, JPG, WebP)");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("draftId", draftId);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka pri nalaganju");

      setPreview(data.url);
      setUrl(data.url);
      // Auto-save after upload
      await handleSave(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div
      className={`relative bg-muted/50 border-2 border-dashed rounded-xl transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border/60"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {preview ? (
        <div className="relative h-64 sm:h-80 md:h-[28rem] overflow-hidden rounded-xl">
          <img
            src={preview}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 33%" }}
            onError={() => { setError("Slike ni mogoce naloziti"); setPreview(null); }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      ) : (
        <div
          className="flex items-center justify-center h-48 sm:h-64 cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-center">
            {uploading ? (
              <p className="text-sm font-medium text-muted-foreground">Nalagam sliko...</p>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {dragOver ? "Spusti sliko tukaj" : "Povleci sliko sem ali klikni"}
                </p>
                <p className="text-xs text-muted-foreground/60">PNG, JPG ali WebP · ali prilepi URL spodaj</p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm rounded-b-xl border-t border-border/40">
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handlePreview(); }}
            placeholder="https://... URL slike"
            className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {!preview ? (
            <button
              onClick={handlePreview}
              disabled={!url.trim()}
              className="rounded-lg bg-sky/10 px-3 py-2 text-xs font-medium text-sky-foreground transition-all hover:bg-sky/20 disabled:opacity-50"
            >
              Predogled
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={() => { setPreview(null); setUrl(""); }}
                className="rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-accent"
              >
                Preklic
              </button>
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="rounded-lg bg-nature px-3 py-2 text-xs font-medium text-nature-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Shranjujem..." : "Shrani"}
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
