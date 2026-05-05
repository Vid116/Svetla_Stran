"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Image that falls back to children (e.g. CategoryGradient) if the src fails to load.
 * Renders next/image in fill mode — caller wraps in a position:relative container.
 */
export function SafeImage({
  src,
  alt = "",
  className,
  style,
  fallback,
  sizes = "100vw",
  priority = false,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
