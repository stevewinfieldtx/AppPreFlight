// /app/api/generate/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildGenerationPrompt } from "@/lib/prompts";
import { GeneratedAppSchema } from "@/lib/schema";
import { slugify } from "@/lib/slugify";
import { saveApp } from "@/lib/db";
import { callOpenRouterJSON } from "@/lib/openrouter";

// Shape the raw model output into something the (lenient) schema can always
// accept, and backfill the fields that have historically caused the
// post-interview crash — most notably the support / contact email.
function normalize(raw: any, scanReportId?: string) {
  const g: any = raw && typeof raw === "object" ? { ...raw } : {};

  const appName =
    (g.appName || g.app_name || g.name || "Your App").toString().trim() ||
    "Your App";
  g.appName = appName;
  g.slug = slugify((g.slug || appName || "untitled-app").toString());

  g.support = g.support && typeof g.support === "object" ? g.support : {};
  g.privacy = g.privacy && typeof g.privacy === "object" ? g.privacy : {};
  g.marketing = g.marketing && typeof g.marketing === "object" ? g.marketing : {};

  // Cross-fill the two email fields from each other so a single missing value
  // doesn't leave the package half-empty.
  const supportEmail = (g.support.email || "").toString().trim();
  const contactEmail = (g.privacy.contactEmail || "").toString().trim();
  const email = supportEmail || contactEmail;
  g.support.email = supportEmail || email;
  g.privacy.contactEmail = contactEmail || email;

  if (scanReportId) g.scanReportId = scanReportId;
  return g;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript = String(body?.transcript ?? "").trim();
    const scanContext = body?.scanContext ? String(body.scanContext) : undefined;
    const scanReportId = body?.scanReportId ? String(body.scanReportId) : undefined;

    if (!transcript) {
      return NextResponse.json({ ok: false, error: "Transcript required" }, { status: 400 });
    }

    const prompt = buildGenerationPrompt(transcript, scanContext);
    const generated = await callOpenRouterJSON(prompt);

    const normalized = normalize(generated, scanReportId);

    // safeParse + lenient schema means we always end up with a usable package
    // instead of a 400 that wipes the interview.
    const result = GeneratedAppSchema.safeParse(normalized);
    const app = result.success
      ? result.data
      : GeneratedAppSchema.parse({ appName: normalized.appName, slug: normalized.slug });

    // Persist durably, but NEVER let a database problem block the response —
    // the browser already has this package autosaved.
    try {
      await saveApp(app);
    } catch (dbErr) {
      console.error("[generate] saveApp failed (continuing):", dbErr);
    }

    return NextResponse.json({
      ok: true,
      app,
      pages: {
        about: `/apps/${app.slug}/about`,
        privacy: `/apps/${app.slug}/privacy`,
        support: `/apps/${app.slug}/support`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
