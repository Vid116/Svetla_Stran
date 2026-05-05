"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

function useInView(rootMargin = "-80px") {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

/** Fade + slide up on scroll into view. Set skip=true to render instantly. */
export function RevealOnScroll({
  children,
  className,
  delay = 0,
  skip = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  skip?: boolean;
}) {
  if (skip) return <div className={className}>{children}</div>;

  return <RevealInner className={className} delay={delay}>{children}</RevealInner>;
}

function RevealInner({
  children,
  className,
  delay,
}: {
  children: ReactNode;
  className?: string;
  delay: number;
}) {
  const { ref, inView } = useInView("-80px");
  return (
    <div
      ref={ref}
      className={`anim-reveal${inView ? " anim-reveal-in" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/** Container that staggers its children's entrance. Set skip=true to render instantly. */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.08,
  skip = false,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  skip?: boolean;
}) {
  if (skip) return <div className={className}>{children}</div>;

  return (
    <StaggerInner className={className} staggerDelay={staggerDelay}>
      {children}
    </StaggerInner>
  );
}

function StaggerInner({
  children,
  className,
  staggerDelay,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay: number;
}) {
  const { ref, inView } = useInView("-60px");
  const cloned = Children.map(children, (child, i) => {
    if (!isValidElement(child)) return child;
    const childEl = child as ReactElement<{ style?: CSSProperties }>;
    const existingStyle = childEl.props.style ?? {};
    return cloneElement(childEl, {
      style: { ...existingStyle, animationDelay: `${i * staggerDelay}s` },
    });
  });
  return (
    <div
      ref={ref}
      className={`${inView ? "anim-stagger-fire " : ""}${className ?? ""}`}
    >
      {cloned}
    </div>
  );
}

/** Individual stagger child — use inside StaggerContainer. Set skip=true to render instantly. */
export function StaggerItem({
  children,
  className,
  skip = false,
}: {
  children: ReactNode;
  className?: string;
  skip?: boolean;
}) {
  if (skip) return <div className={className}>{children}</div>;
  return (
    <div className={`anim-stagger-item${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

/** Hero text entrance — fade up with easing, fires on mount. */
export function HeroReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`anim-hero${className ? ` ${className}` : ""}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
