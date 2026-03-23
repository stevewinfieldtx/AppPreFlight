// /app/api/interview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { InterviewInputSchema } from "@/lib/schema";
import { SYSTEM_INTERVIEW_PROMPT } from "@/lib/prompts";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InterviewInputSchema.parse(body);

    const messages: Array<{ role: "system" | "assistant" | "user"; content: string }> = [
      { role: "system", content: SYSTEM_INTERVIEW_PROMPT },
      ...parsed.messages.map((m) => ({
        role: m.role as "assistant" | "user",
        content: m.content
      }))
    ];

    const reply = await callOpenRouter(messages);

    return NextResponse.json({
      ok: true,
      message: reply,
      complete: reply.includes("__INTERVIEW_COMPLETE__")
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
