// /components/InterviewChat.tsx
"use client";

import { useMemo, useState } from "react";

type Role = "assistant" | "user";
type Message = { role: Role; content: string };

type GeneratedResult = {
  app: Record<string, unknown>;
  pages: { about: string; privacy: string; support: string };
};

const STARTER = `Let's build your launch package. What's the name of your app, what does it do, and who is it for?`;

export const INTERVIEW_STARTER: Message = { role: "assistant", content: STARTER };

export default function InterviewChat({
  messages,
  onMessagesChange,
  scanContext,
  scanReportId,
  onGenerated
}: {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  scanContext?: string;
  scanReportId?: string;
  onGenerated?: (result: GeneratedResult) => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const transcript = useMemo(
    () => messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n"),
    [messages]
  );

  const canGoBack = messages.length >= 3 && !loading && !generating;

  function goBack() {
    if (!canGoBack) return;
    const lastUserMsg = messages[messages.length - 2];
    onMessagesChange(messages.slice(0, -2));
    if (lastUserMsg?.role === "user") setInput(lastUserMsg.content);
  }

  // Generation is its own function so the "Retry" button can re-run it against
  // the saved transcript — a finished interview is never thrown away.
  async function runGeneration(fullTranscript: string) {
    setGenError(null);
    setGenerating(true);
    try {
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullTranscript, scanContext, scanReportId })
      });
      const genData = await genRes.json();
      if (!genData.ok) throw new Error(genData.error || "Generation failed");
      onGenerated?.(genData);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const withUser: Message[] = [...messages, { role: "user", content: trimmed }];
    onMessagesChange(withUser);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: withUser, latestUserMessage: trimmed })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Interview failed");

      const reply = String(data.message).replace("__INTERVIEW_COMPLETE__", "").trim();
      const withReply: Message[] = [...withUser, { role: "assistant", content: reply }];
      onMessagesChange(withReply);

      if (data.complete) {
        const fullTranscript = withReply
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n\n");
        await runGeneration(fullTranscript);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something broke";
      onMessagesChange([
        ...withUser,
        { role: "assistant", content: `Error: ${errorMessage}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div>
      {/* Chat messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            style={{
              maxWidth: "80%",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              padding: 16,
              borderRadius: 16,
              border: "1px solid",
              borderColor: m.role === "user" ? "#2a2a2a" : "#1a1a1a",
              background: m.role === "user" ? "#141414" : "#0a0a0a"
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: m.role === "user" ? "#666" : "#555",
                marginBottom: 6
              }}
            >
              {m.role === "user" ? "You" : "Preflight AI"}
            </div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 15, color: "#ddd" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "12px 18px",
              borderRadius: 16,
              border: "1px solid #1a1a1a",
              background: "#0a0a0a",
              color: "#555",
              fontSize: 14
            }}
          >
            Thinking...
          </div>
        )}
        {generating && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "16px 20px",
              borderRadius: 16,
              border: "1px solid #1e3a1e",
              background: "rgba(29,158,117,0.04)",
              color: "#1d9e75",
              fontSize: 14
            }}
          >
            Generating your launch package — pages, marketing copy, and compliance assets...
          </div>
        )}
        {genError && !generating && (
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "80%",
              padding: "16px 20px",
              borderRadius: 16,
              border: "1px solid #4a2a2a",
              background: "rgba(226,75,74,0.06)"
            }}
          >
            <div style={{ color: "#E24B4A", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              Generation didn&apos;t finish
            </div>
            <div style={{ color: "#bbb", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
              Your interview is saved — nothing was lost. {genError}
            </div>
            <button
              onClick={() => runGeneration(transcript)}
              style={{
                borderRadius: 12,
                border: "1px solid #333",
                background: "#fff",
                color: "#000",
                padding: "10px 18px",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 14
              }}
            >
              Retry generating →
            </button>
          </div>
        )}
      </div>

      {/* Input + Controls */}
      {!generating && (
        <div style={{ display: "grid", gap: 10 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
            rows={3}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #2a2a2a",
              background: "#0c0c0c",
              color: "#fff",
              padding: 14,
              fontSize: 15,
              resize: "vertical"
            }}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {canGoBack && (
              <button
                onClick={goBack}
                style={{
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "transparent",
                  color: "#888",
                  padding: "12px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14
                }}
              >
                ← Go Back
              </button>
            )}
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 160,
                borderRadius: 12,
                border: "1px solid #333",
                background: loading ? "#333" : "#fff",
                color: loading ? "#999" : "#000",
                padding: "12px 16px",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15
              }}
            >
              {loading ? "Working..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
