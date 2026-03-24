"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RemoveImageButton({ draftId }: { draftId: string }) {
  const [removing, setRemoving] = useState(false);
  const router = useRouter();

  async function handleRemove() {
    if (!confirm("Odstrani sliko?")) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftId, image_url: null, ai_image_url: null }),
      });
      if (res.ok) router.refresh();
    } catch {} finally {
      setRemoving(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={removing}
      className="absolute top-3 right-3 z-10 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
    >
      {removing ? "..." : "✕ Odstrani sliko"}
    </button>
  );
}
