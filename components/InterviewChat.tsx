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

export default function InterviewChat({
  scanContext,
  scanReportId
}: {
  scanContext?: string;
  scanReportId?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: STARTER }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedResult | null>(null);

  const transcript = useMemo(
    () => messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n"),
    [messages]
  );

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          latestUserMessage: trimmed
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Interview failed");

      const reply = String(data.message).replace("__INTERVIEW_COMPLETE__", "").trim();
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      if (data.complete) {
        const fullTranscript = `${transcript}\n\nUSER: ${trimmed}\n\nASSISTANT: ${reply}`;
        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: fullTranscript,
            scanContext,
            scanReportId
          })
        });
        const genData = await genRes.json();
        if (!genData.ok) throw new Error(genData.error || "Generation failed");
        setGenerated(genData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something broke";
      setMessages((prev) => [
        ...prev,
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
      </div>

      {/* Input */}
      {!generated && (
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
      )}

      {/* Generated results */}
      {generated && (
        <div
          style={{
            marginTop: 28,
            padding: 24,
            borderRadius: 16,
            border: "1px solid #1e3a1e",
            background: "rgba(29,158,117,0.04)"
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "#1d9e75",
              marginBottom: 8
            }}
          >
            Launch assets generated
          </div>
          <h2 style={{ fontSize: 26, margin: "0 0 6px", color: "#fff" }}>
            {String((generated.app as Record<string, unknown>).appName || "Your App")}
          </h2>
          <p style={{ color: "#999", margin: "0 0 20px", fontSize: 15 }}>
            {String((generated.app as Record<string, unknown>).oneLiner || "")}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <a href={generated.pages.about} target="_blank" style={linkStyle}>
              About page →
            </a>
            <a href={generated.pages.privacy} target="_blank" style={linkStyle}>
              Privacy policy →
            </a>
            <a href={generated.pages.support} target="_blank" style={linkStyle}>
              Support page →
            </a>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary
              style={{
                cursor: "pointer",
                color: "#888",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8
              }}
            >
              View raw JSON
            </summary>
            <pre
              style={{
                overflowX: "auto",
                padding: 16,
                borderRadius: 12,
                background: "#0a0a0a",
                border: "1px solid #1e1e1e",
                fontSize: 12,
                color: "#aaa",
                lineHeight: 1.5
              }}
            >
              {JSON.stringify(generated.app, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 20px",
  borderRadius: 10,
  border: "1px solid #2a2a2a",
  background: "#141414",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14
};
