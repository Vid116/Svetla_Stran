"use client";

import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export function LogoLink() {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (pathname === "/") {
      // Already on homepage — fire event to reset category instantly, then scroll
      window.dispatchEvent(new CustomEvent("svetla-reset"));
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    } else {
      router.push("/");
    }
  }

  return (
    <a href="/" onClick={handleClick} className="flex items-center gap-2.5 shrink-0">
      <Logo size={28} />
      <span className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-brand)" }}>
        Svetla Stran
      </span>
    </a>
  );
}
