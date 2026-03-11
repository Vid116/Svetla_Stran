import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { getSourceSuggestions, updateSuggestionStatus, addSource } from "@/lib/db";

// GET — list pending suggestions
export async function GET() {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const suggestions = await getSourceSuggestions("pending");
    return NextResponse.json(suggestions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — approve or dismiss a suggestion
export async function PUT(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const { id, action } = await req.json();

    if (!id || !["approve", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "Potrebna sta id in action (approve/dismiss)" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Get the suggestion first
      const suggestions = await getSourceSuggestions("pending");
      const suggestion = suggestions.find((s: any) => s.id === id);
      if (!suggestion) {
        return NextResponse.json({ error: "Predlog ni najden" }, { status: 404 });
      }

      // Create a source from the suggestion
      await addSource({
        name: suggestion.name || suggestion.domain,
        url: suggestion.rss_url || suggestion.url,
        type: suggestion.suggested_type === "rss" ? "rss" : "html",
        category: suggestion.category || undefined,
      });

      await updateSuggestionStatus(id, "approved");
    } else {
      await updateSuggestionStatus(id, "dismissed");
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
