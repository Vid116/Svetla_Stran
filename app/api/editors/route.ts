import { NextRequest, NextResponse } from "next/server";
import { getAuthEditor } from "@/lib/require-auth-api";
import { getEditors, addEditor, updateEditor, deleteEditor } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";

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

    // Create Supabase Auth user with synthetic email
    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `${username}@svetlastran.si`,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create editor record linked to auth user
    await addEditor({
      auth_id: authData.user.id,
      username,
      name,
      role: role || "urednik",
      categories: categories || [],
    });

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

    const supabase = getSupabaseAdmin();

    // Get editor to find auth_id
    const editors = await getEditors();
    const editor = editors.find((e: any) => e.id === id);
    if (!editor?.auth_id) {
      return NextResponse.json({ error: "Urednik nima auth racuna" }, { status: 400 });
    }

    // If password changed, update in Supabase Auth
    if (password) {
      await supabase.auth.admin.updateUserById(editor.auth_id, { password });
    }

    // If username changed, update in Supabase Auth and editors table
    const toUpdate: Record<string, any> = { ...updates };
    if (username && username !== editor.username) {
      await supabase.auth.admin.updateUserById(editor.auth_id, {
        email: `${username}@svetlastran.si`,
      });
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

    const editors = await getEditors();
    const editor = editors.find((e: any) => e.id === id);
    if (editor?.auth_id) {
      const supabase = getSupabaseAdmin();
      await supabase.auth.admin.deleteUser(editor.auth_id);
    }

    await deleteEditor(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
