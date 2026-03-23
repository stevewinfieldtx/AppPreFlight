import { NextResponse } from "next/server";
import { getReport } from "../../../../lib/reportStore";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const report = getReport(id);

  if (!report) {
    return NextResponse.json(
      { error: "Report not found. (MVP store resets when server restarts.)" },
      { status: 404 }
    );
  }

  return NextResponse.json({ report });
}
