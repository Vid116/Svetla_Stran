import { NextRequest, NextResponse } from "next/server";
import { getSQL } from "@/lib/neon";
import { ALL_THEME_SLUGS } from "@/lib/article-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, themes } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email je obvezen." }, { status: 400 });
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json({ error: "Neveljaven email naslov." }, { status: 400 });
    }

    // Empty themes array = "send me everything" (same convention as legacy categories)
    let selectedThemes: string[] = [];
    if (themes && Array.isArray(themes) && themes.length > 0) {
      selectedThemes = themes.filter((t: string) => ALL_THEME_SLUGS.includes(t));
    }

    const sql = getSQL();

    const existing = await sql`SELECT id, status FROM subscribers WHERE email = ${emailTrimmed}`;

    if (existing.length > 0) {
      const row = existing[0];
      if (row.status === "active") {
        await sql`UPDATE subscribers SET themes = ${selectedThemes} WHERE id = ${row.id}`;
        return NextResponse.json({ success: true, message: "Nastavitve posodobljene." });
      }

      await sql`
        UPDATE subscribers SET status = 'active', themes = ${selectedThemes}, unsubscribed_at = null
        WHERE id = ${row.id}
      `;
      return NextResponse.json({ success: true, message: "Dobrodošli nazaj!" });
    }

    await sql`
      INSERT INTO subscribers (email, themes, source)
      VALUES (${emailTrimmed}, ${selectedThemes}, 'website')
      ON CONFLICT (email) DO NOTHING
    `;

    return NextResponse.json({ success: true, message: "Uspešno! Dobrodošli." });
  } catch (e: any) {
    console.error("[Subscribe]", e);
    return NextResponse.json(
      { error: "Nekaj je šlo narobe. Poskusite znova." },
      { status: 500 }
    );
  }
}
