import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { getDrafts, getDraftById, updateDraft, deleteDraft, publishDraft } from "@/lib/db";

// GET — list all drafts
export async function GET() {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const drafts = await getDrafts();
    return NextResponse.json(drafts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — update draft content (editor edits)
export async function PUT(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Draft ID je obvezen" }, { status: 400 });
    }
    await updateDraft(id, updates);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — discard a draft
export async function DELETE(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Draft ID je obvezen" }, { status: 400 });
    }
    await deleteDraft(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
