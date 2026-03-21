"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-card/90 border border-border/60 shadow-md backdrop-blur-sm text-muted-foreground/70 hover:text-foreground hover:shadow-lg hover:border-border transition-all duration-200 cursor-pointer"
      aria-label="Na vrh"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}
