import { NextRequest, NextResponse } from "next/server";
import { getAuthEditor } from "@/lib/require-auth-api";
import { getEditors, addEditor, updateEditor, deleteEditor } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getSQL } from "@/lib/neon";

async function requireAdmin() {
  const editor = await getAuthEditor();
  if (!editor) return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  if (editor.role !== "admin") {
    return NextResponse.json({ error: "Samo admin" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const editors = await getEditors();
    return NextResponse.json(editors);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { username, password, name, role, categories } = await req.json();
    if (!username || !password || !name) {
      return NextResponse.json({ error: "Uporabnisko ime, geslo in ime so obvezni" }, { status: 400 });
    }

    const hash = await hashPassword(password);

    await addEditor({
      username,
      name,
      role: role || "urednik",
      categories: categories || [],
    });

    // Set password hash on the newly created editor
    const sql = getSQL();
    await sql`UPDATE editors SET password_hash = ${hash} WHERE username = ${username}`;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id, password, username, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "ID je obvezen" }, { status: 400 });

    const sql = getSQL();

    // If password changed, hash and update
    if (password) {
      const hash = await hashPassword(password);
      await sql`UPDATE editors SET password_hash = ${hash} WHERE id = ${id}`;
    }

    // If username changed, update
    const toUpdate: Record<string, any> = { ...updates };
    if (username) {
      toUpdate.username = username;
    }

    await updateEditor(id, toUpdate);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID je obvezen" }, { status: 400 });

    await deleteEditor(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
