import { NextRequest, NextResponse } from "next/server";

// Legacy ?antidote=X → /tema/{slug}. Lives in middleware so the homepage
// doesn't need to read searchParams (which would force dynamic rendering and
// defeat ISR).
const ANTIDOTE_TO_THEME: Record<string, string> = {
  jeza: "med-nami",
  cinizem: "med-nami",
  skrb: "naprej",
  obup: "naprej",
  osamljenost: "med-nami",
  strah: "heroji",
  dolgcas: "drobne-radosti",
};

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    const antidote = req.nextUrl.searchParams.get("antidote");
    if (antidote && ANTIDOTE_TO_THEME[antidote]) {
      return NextResponse.redirect(
        new URL(`/tema/${ANTIDOTE_TO_THEME[antidote]}`, req.url),
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
