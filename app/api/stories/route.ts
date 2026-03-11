import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, getAuthEditor } from "@/lib/require-auth-api";
import { getInboxHeadlines, dismissHeadline } from "@/lib/db";

// GET — inbox headlines (filtered by user's categories)
export async function GET() {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const editor = await getAuthEditor();
    const categories = editor?.categories || [];
    const role = editor?.role;

    // Admin sees all, uredniki see only their categories
    const headlines = await getInboxHeadlines(
      role === "admin" ? undefined : categories
    );

    return NextResponse.json(headlines);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — update headline status (dismiss)
export async function PUT(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const { id, status } = await req.json();
    if (status === "dismissed") {
      await dismissHeadline(id);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
