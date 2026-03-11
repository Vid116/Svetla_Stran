import { redirect } from "next/navigation";
import { getSupabaseServer, getSupabaseAdmin } from "./supabase";

/**
 * Call at the top of any protected server component.
 * Redirects to /prijava if not authenticated.
 */
export async function requireAuth() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prijava");
  }

  // Look up editor record for role + categories
  const admin = getSupabaseAdmin();
  const { data: editor } = await admin
    .from("editors")
    .select("id, username, name, role, categories, active")
    .eq("auth_id", user.id)
    .single();

  if (!editor || !editor.active) {
    redirect("/prijava");
  }

  return {
    user: {
      id: editor.id,
      username: editor.username,
      name: editor.name,
      role: editor.role,
      categories: editor.categories || [],
    },
  };
}
