"use client";

import { useState } from "react";

/**
 * Image that falls back to children (e.g. CategoryGradient) if the src fails to load.
 */
export function SafeImage({
  src,
  alt = "",
  className,
  style,
  fallback,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
