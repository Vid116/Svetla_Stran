import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/db";

/** Generate pattern variants for a word — full + 1-trim + 2-trim, mirrors the
 *  declension trimming the homepage used to do client-side. */
function variantsFor(word: string): string[] {
  const w = word.toLowerCase();
  if (w.length < 3) return [];
  const variants = [w];
  if (w.length >= 5) variants.push(w.slice(0, -1));
  if (w.length >= 6) variants.push(w.slice(0, -2));
  return variants;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json([]);

  const words = q.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length === 0) return NextResponse.json([]);

  const gids: number[] = [];
  const patterns: string[] = [];
  words.forEach((word, gid) => {
    for (const v of variantsFor(word)) {
      gids.push(gid);
      patterns.push(`%${v}%`);
    }
  });

  if (gids.length === 0) return NextResponse.json([]);

  try {
    const rows = await searchArticles(gids, patterns, words.length, 50);
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
