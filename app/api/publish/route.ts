import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { publishDraft } from "@/lib/db";

export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const data = await req.json();

    const draftId = data.id || data.draftId;
    if (!draftId) {
      return NextResponse.json({ error: "Draft ID je obvezen" }, { status: 400 });
    }

    await publishDraft(draftId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Publish API error:", err);
    return NextResponse.json({ error: err.message || "Napaka pri objavi" }, { status: 500 });
  }
}
