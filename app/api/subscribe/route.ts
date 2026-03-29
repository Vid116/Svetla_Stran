import { NextRequest, NextResponse } from "next/server";
import { getSQL } from "@/lib/neon";

const ALL_CATEGORIES = [
  "JUNAKI", "PODJETNISTVO", "SKUPNOST", "SPORT", "NARAVA",
  "ZIVALI", "INFRASTRUKTURA", "SLOVENIJA_V_SVETU", "KULTURA",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, categories } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email je obvezen." }, { status: 400 });
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json({ error: "Neveljaven email naslov." }, { status: 400 });
    }

    let selectedCategories = ALL_CATEGORIES;
    if (categories && Array.isArray(categories) && categories.length > 0) {
      selectedCategories = categories.filter((c: string) => ALL_CATEGORIES.includes(c));
      if (selectedCategories.length === 0) selectedCategories = ALL_CATEGORIES;
    }

    const sql = getSQL();

    const existing = await sql`SELECT id, status FROM subscribers WHERE email = ${emailTrimmed}`;

    if (existing.length > 0) {
      const row = existing[0];
      if (row.status === "active") {
        await sql`UPDATE subscribers SET categories = ${selectedCategories} WHERE id = ${row.id}`;
        return NextResponse.json({ success: true, message: "Nastavitve posodobljene." });
      }

      await sql`
        UPDATE subscribers SET status = 'active', categories = ${selectedCategories}, unsubscribed_at = null
        WHERE id = ${row.id}
      `;
      return NextResponse.json({ success: true, message: "Dobrodošli nazaj!" });
    }

    await sql`
      INSERT INTO subscribers (email, categories, source)
      VALUES (${emailTrimmed}, ${selectedCategories}, 'website')
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
