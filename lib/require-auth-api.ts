import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "./supabase";

/**
 * Call at the top of any protected API route handler.
 * Returns a 401 response if not authenticated, or null if OK.
 */
export async function requireAuthAPI(): Promise<NextResponse | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neprijavljen" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: editor } = await admin
    .from("editors")
    .select("id, auth_id, username, name, role, categories, active")
    .eq("auth_id", user.id)
    .single();

  if (!editor || !editor.active) {
    return NextResponse.json({ error: "Neprijavljen" }, { status: 401 });
  }

  return null;
}

/**
 * Get current editor info in API routes.
 */
export async function getAuthEditor() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseAdmin();
  const { data: editor } = await admin
    .from("editors")
    .select("id, auth_id, username, name, role, categories, active")
    .eq("auth_id", user.id)
    .single();

  if (!editor || !editor.active) return null;
  return editor;
}
