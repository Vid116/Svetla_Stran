import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const ALL_CATEGORIES = [
  "JUNAKI", "PODJETNISTVO", "SKUPNOST", "SPORT", "NARAVA",
  "ZIVALI", "INFRASTRUKTURA", "SLOVENIJA_V_SVETU", "KULTURA",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, categories } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email je obvezen." }, { status: 400 });
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json({ error: "Neveljaven email naslov." }, { status: 400 });
    }

    // Validate categories (optional — default to all)
    let selectedCategories = ALL_CATEGORIES;
    if (categories && Array.isArray(categories) && categories.length > 0) {
      selectedCategories = categories.filter((c: string) => ALL_CATEGORIES.includes(c));
      if (selectedCategories.length === 0) {
        selectedCategories = ALL_CATEGORIES;
      }
    }

    const supabase = getSupabaseAdmin();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from("subscribers")
      .select("id, status")
      .eq("email", emailTrimmed)
      .single();

    if (existing) {
      if (existing.status === "active") {
        // Already active — update categories silently
        await supabase
          .from("subscribers")
          .update({ categories: selectedCategories })
          .eq("id", existing.id);
        return NextResponse.json({ success: true, message: "Nastavitve posodobljene." });
      }

      // Was unsubscribed — resubscribe
      await supabase
        .from("subscribers")
        .update({
          status: "active",
          categories: selectedCategories,
          unsubscribed_at: null,
        })
        .eq("id", existing.id);
      return NextResponse.json({ success: true, message: "Dobrodošli nazaj!" });
    }

    // New subscriber
    const { error } = await supabase.from("subscribers").insert({
      email: emailTrimmed,
      categories: selectedCategories,
      source: "website",
    });

    if (error) {
      if (error.code === "23505") {
        // Unique constraint — race condition, already exists
        return NextResponse.json({ success: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true, message: "Uspešno! Dobrodošli." });
  } catch (e: any) {
    console.error("[Subscribe]", e);
    return NextResponse.json(
      { error: "Nekaj je šlo narobe. Poskusite znova." },
      { status: 500 }
    );
  }
}
