"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

/**
 * Card-wrapping link with two prefetch modes.
 *
 *  - `eager`  (default): vanilla Next Link. Prefetches as soon as it enters
 *    the viewport. Right for hero + secondary tier (above the fold).
 *  - `intent`: prefetch=false on the Link, plus a one-shot router.prefetch on
 *    hover / touch / focus. Avoids the bandwidth bath of prefetching 30 cards
 *    on a phone, while still hiding the network roundtrip behind the user's
 *    own intent signal.
 */
export function CardLink({
  href,
  className,
  prefetchMode = "eager",
  children,
}: {
  href: string;
  className?: string;
  prefetchMode?: "eager" | "intent";
  children: ReactNode;
}) {
  if (prefetchMode === "eager") {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <IntentLink href={href} className={className}>{children}</IntentLink>;
}

function IntentLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const prefetched = useRef(false);

  function handlePrefetch() {
    if (prefetched.current) return;
    prefetched.current = true;
    router.prefetch(href);
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      onFocus={handlePrefetch}
    >
      {children}
    </Link>
  );
}
