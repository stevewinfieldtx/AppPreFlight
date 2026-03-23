// /lib/db.ts
import { supabase } from "./supabase";
import { GeneratedApp } from "./schema";

export async function getApps(): Promise<GeneratedApp[]> {
  const { data, error } = await supabase
    .from("preflight_apps")
    .select("data")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[DB] Error fetching apps:", error);
    return [];
  }

  return (data || []).map((row) => row.data as GeneratedApp);
}

export async function getAppBySlug(slug: string): Promise<GeneratedApp | null> {
  const { data, error } = await supabase
    .from("preflight_apps")
    .select("data")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[DB] Error fetching app by slug:", error);
    }
    return null;
  }

  return data?.data as GeneratedApp || null;
}

export async function saveApp(app: GeneratedApp): Promise<void> {
  const { error } = await supabase
    .from("preflight_apps")
    .upsert(
      {
        slug: app.slug,
        app_name: app.appName,
        data: app,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

  if (error) {
    console.error("[DB] Error saving app:", error);
    throw new Error(`Failed to save app: ${error.message}`);
  }
}
