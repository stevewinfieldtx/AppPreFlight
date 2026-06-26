// /app/api/session/route.ts
//
// Server-side autosave for in-progress flow state. The browser writes here
// after every stage so progress survives a crash, a closed tab, or a switch to
// another device. Failures here are intentionally soft (HTTP 200, ok:false) so
// a transient database problem never surfaces as a scary error — the browser's
// localStorage copy is always the first line of defense.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveSession, getSession } from "@/lib/db";

function msg(e: unknown) {
  return e instanceof Error ? e.message : "error";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body?.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    }
    const stage = body?.stage != null ? String(body.stage) : null;
    const state =
      body?.state && typeof body.state === "object"
        ? (body.state as Record<string, unknown>)
        : {};

    await saveSession(id, stage, state);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Soft-fail: don't block the UI on a persistence hiccup.
    return NextResponse.json({ ok: false, error: msg(error) }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    }
    const session = await getSession(id);
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    return NextResponse.json({ ok: false, error: msg(error), session: null }, { status: 200 });
  }
}
