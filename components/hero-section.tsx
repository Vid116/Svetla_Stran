"use client";

import { motion } from "motion/react";
import { Sun } from "lucide-react";

export function HeroSection({ articleCount }: { articleCount: number }) {
  return (
    <section className="relative overflow-hidden border-b border-border/30">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-heaven-glow/40 via-heaven/60 to-background" />
      <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-gold-soft/25 blur-[80px] pointer-events-none" />
      <div className="absolute -top-10 right-1/4 h-64 w-64 rounded-full bg-sky-soft/20 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-nature-soft/15 blur-[60px] pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-6 pt-16 pb-14 sm:pt-20 sm:pb-16 text-center">
        {/* Animated sun icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6"
        >
          <Sun className="w-10 h-10 sm:w-12 sm:h-12 text-gold mx-auto" aria-hidden />
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight text-foreground mb-4"
          style={{ fontFamily: "var(--font-brand)" }}
        >
          Dobre zgodbe iz Slovenije
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8"
        >
          Preverjene zgodbe o ljudeh, dosežkih in napredku.
          <br className="hidden sm:block" />
          {" "}Vsak dan nekaj, kar je vredno prebrati.
        </motion.p>

        {/* Stats pill */}
        {articleCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border/50 px-4 py-2 text-xs text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-nature animate-pulse" />
              {articleCount} {articleCount === 1 ? "zgodba" : articleCount === 2 ? "zgodbi" : articleCount <= 4 ? "zgodbe" : "zgodb"} objavljenih
            </span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
