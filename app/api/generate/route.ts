// /app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildGenerationPrompt } from "@/lib/prompts";
import { GeneratedAppSchema } from "@/lib/schema";
import { slugify } from "@/lib/slugify";
import { saveApp } from "@/lib/db";
import { callOpenRouterJSON } from "@/lib/openrouter";

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

    // Normalize slug
    generated.slug = slugify(generated.slug || generated.appName || "untitled-app");

    // Ensure privacy object exists, then fallback support email if missing
    if (!generated.privacy) {
      generated.privacy = {};
    }
    if (!generated.privacy.contactEmail && generated.support?.email) {
      generated.privacy.contactEmail = generated.support.email;
    }

    // Attach scan reference if available
    if (scanReportId) {
      generated.scanReportId = scanReportId;
    }

    const parsed = GeneratedAppSchema.parse(generated);
    await saveApp(parsed);

    return NextResponse.json({
      ok: true,
      app: parsed,
      pages: {
        about: `/apps/${parsed.slug}/about`,
        privacy: `/apps/${parsed.slug}/privacy`,
        support: `/apps/${parsed.slug}/support`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
