"use client";

import { useState, useCallback } from "react";

export function ImagePosition({
  draftId,
  imageUrl,
  initialPosition,
}: {
  draftId: string;
  imageUrl: string;
  initialPosition?: number;
}) {
  const [position, setPosition] = useState(initialPosition ?? 33);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (value: number) => {
    setSaving(true);
    try {
      await fetch("/api/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, image_position: value }),
      });
    } catch {} finally {
      setSaving(false);
    }
  }, [draftId]);

  return (
    <div className="relative h-64 sm:h-80 md:h-[28rem] overflow-hidden group">
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: `center ${position}%` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

      {/* Slider overlay — visible on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg">
        <span className="text-xs text-muted-foreground">Pozicija</span>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          onMouseUp={() => save(position)}
          onTouchEnd={() => save(position)}
          className="w-24 h-1.5 accent-primary cursor-pointer"
        />
        <span className="text-xs text-muted-foreground w-7 text-right">{position}%</span>
        {saving && <span className="text-xs text-muted-foreground">...</span>}
      </div>
    </div>
  );
}
