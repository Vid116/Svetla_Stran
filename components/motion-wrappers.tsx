"use client";

import { motion, stagger } from "motion/react";
import type { ReactNode } from "react";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
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
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: stagger(staggerDelay),
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
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
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.45, ease: "easeOut" },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Hero text entrance — fade up with spring */
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
