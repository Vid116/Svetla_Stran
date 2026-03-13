import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { publishDraft, getDraftById, deleteDraft, updateDraft } from "@/lib/db";

export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const data = await req.json();

    const draftId = data.id || data.draftId;
    if (!draftId) {
      return NextResponse.json({ error: "Draft ID je obvezen" }, { status: 400 });
    }

    // Get slug before publishing (draft gets deleted after)
    const draft = await getDraftById(draftId);
    await publishDraft(draftId);
    return NextResponse.json({ ok: true, slug: draft?.slug });
  } catch (err: any) {
    console.error("Publish API error:", err);
    return NextResponse.json({ error: err.message || "Napaka pri objavi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const data = await req.json();
    const draftId = data.id || data.draftId;
    if (!draftId) {
      return NextResponse.json({ error: "Draft ID je obvezen" }, { status: 400 });
    }

    const { draftId: _, id: __, ...updates } = data;
    await updateDraft(draftId, updates);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Napaka pri posodobitvi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const data = await req.json();
    const draftId = data.id || data.draftId;
    if (!draftId) {
      return NextResponse.json({ error: "Draft ID je obvezen" }, { status: 400 });
    }

    await deleteDraft(draftId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Napaka pri brisanju" }, { status: 500 });
  }
}
