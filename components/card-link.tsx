"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type MouseEvent, type ReactNode } from "react";

/**
 * Card-wrapping link with two prefetch modes + opt-in view transition.
 *
 *  - `eager`  (default): vanilla Next Link prefetch when in viewport.
 *  - `intent`: prefetch=false plus one-shot router.prefetch on hover/touch/focus.
 *
 *  Click navigation is wrapped in `document.startViewTransition` when the
 *  browser supports it — gives card→article a cross-fade instead of a hard
 *  swap. Modifier keys / middle-click skip the wrapper so opening in a new
 *  tab still works.
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
  const router = useRouter();
  const prefetched = useRef(false);

  function handleIntent() {
    if (prefetchMode !== "intent" || prefetched.current) return;
    prefetched.current = true;
    router.prefetch(href);
  }

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;
    if (typeof document === "undefined") return;
    const startVT = (document as any).startViewTransition;
    if (typeof startVT !== "function") return;

    e.preventDefault();
    startVT.call(document, () => router.push(href));
  }

  return (
    <Link
      href={href}
      prefetch={prefetchMode === "eager"}
      className={className}
      onClick={handleClick}
      onMouseEnter={prefetchMode === "intent" ? handleIntent : undefined}
      onTouchStart={prefetchMode === "intent" ? handleIntent : undefined}
      onFocus={prefetchMode === "intent" ? handleIntent : undefined}
    >
      {children}
    </Link>
  );
}
