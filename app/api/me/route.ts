import { NextRequest, NextResponse } from "next/server";
import { getAuthEditor } from "@/lib/require-auth-api";
import { signOut } from "@/lib/auth";
import { updateEditor, getEditorByUsername } from "@/lib/db";

export async function GET() {
  const editor = await getAuthEditor();
  if (!editor) {
    return NextResponse.json({ error: "Neprijavljen" }, { status: 401 });
  }
  return NextResponse.json({
    id: editor.id,
    username: editor.username,
    name: editor.name,
    role: editor.role,
    categories: editor.categories,
  });
}

export async function PUT(req: NextRequest) {
  const editor = await getAuthEditor();
  if (!editor) {
    return NextResponse.json({ error: "Neprijavljen" }, { status: 401 });
  }

  try {
    const { username } = await req.json();
    if (!username || username.length < 3) {
      return NextResponse.json({ error: "Uporabnisko ime mora imeti vsaj 3 znake" }, { status: 400 });
    }
    if (!/^[a-z0-9._-]+$/.test(username)) {
      return NextResponse.json({ error: "Samo male crke, stevilke, pike, podcrke in pomisljaji" }, { status: 400 });
    }

    const existing = await getEditorByUsername(username);
    if (existing && existing.id !== editor.id) {
      return NextResponse.json({ error: "Uporabnisko ime je ze zasedeno" }, { status: 409 });
    }

    await updateEditor(editor.id, { username });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  await signOut();
  return NextResponse.json({ ok: true });
}
