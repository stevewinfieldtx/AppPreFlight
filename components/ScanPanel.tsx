// /components/ScanPanel.tsx
"use client";

import { useState } from "react";

type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

type ScanReport = {
  id: string;
  repoUrl: string;
  summary: {
    iosReadiness: string;
    androidReadiness: string;
    topRisks: string[];
  };
  findings: Finding[];
  meta: { scannedAtIso: string; notes: string[] };
};

export default function ScanPanel({
  onScanComplete
}: {
  onScanComplete?: (report: ScanReport) => void;
}) {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    setError(null);
    setReport(null);
    setLoading(true);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Scan failed");

      setReport(data.report);
      onScanComplete?.(data.report);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function badge(v: string) {
    const colors: Record<string, { bg: string; border: string }> = {
      PASS: { bg: "rgba(29,158,117,0.12)", border: "rgba(29,158,117,0.4)" },
      WARN: { bg: "rgba(239,159,39,0.12)", border: "rgba(239,159,39,0.4)" },
      FAIL: { bg: "rgba(226,75,74,0.12)", border: "rgba(226,75,74,0.4)" },
      UNKNOWN: { bg: "rgba(136,135,128,0.12)", border: "rgba(136,135,128,0.4)" }
    };
    const c = colors[v] || colors.UNKNOWN;
    return (
      <span
        style={{
          padding: "3px 12px",
          borderRadius: 999,
          border: `1px solid ${c.border}`,
          background: c.bg,
          fontWeight: 700,
          fontSize: 13
        }}
      >
        {v}
      </span>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          style={{
            flex: 1,
            minWidth: 280,
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid #2a2a2a",
            background: "#0c0c0c",
            color: "#fff",
            fontSize: 15
          }}
        />
        <button
          onClick={runScan}
          disabled={loading || repoUrl.trim().length < 8}
          style={{
            padding: "14px 24px",
            borderRadius: 12,
            border: "1px solid #333",
            background: loading ? "#333" : "#fff",
            color: loading ? "#999" : "#000",
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 15
          }}
        >
          {loading ? "Scanning..." : "Run preflight scan"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: "1px solid rgba(226,75,74,0.3)",
            background: "rgba(226,75,74,0.06)",
            borderRadius: 12,
            color: "#ff8080"
          }}
        >
          {error}
        </div>
      )}

      {report && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              padding: 20,
              border: "1px solid #222",
              borderRadius: 16,
              background: "#0b0b0b"
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#666", marginBottom: 10 }}>
              Scan results
            </div>
            <p style={{ margin: "6px 0", color: "#aaa", fontSize: 14 }}>
              {report.repoUrl}
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "12px 0" }}>
              <span>iOS: {badge(report.summary.iosReadiness)}</span>
              <span>Android: {badge(report.summary.androidReadiness)}</span>
            </div>

            {report.summary.topRisks.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#888", marginBottom: 6 }}>Top risks</div>
                {report.summary.topRisks.map((r, i) => (
                  <div key={i} style={{ color: "#ccc", fontSize: 14, lineHeight: 1.6 }}>
                    • {r}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#888", marginBottom: 8 }}>
                {report.findings.length} finding{report.findings.length !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {report.findings.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      border: "1px solid #1e1e1e",
                      borderRadius: 10,
                      background: "#0e0e0e"
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background:
                            f.priority === "P0"
                              ? "rgba(226,75,74,0.15)"
                              : f.priority === "P1"
                              ? "rgba(239,159,39,0.15)"
                              : "rgba(136,135,128,0.1)",
                          color:
                            f.priority === "P0"
                              ? "#ff6b6b"
                              : f.priority === "P1"
                              ? "#ffb347"
                              : "#999"
                        }}
                      >
                        {f.priority}
                      </span>
                      <span style={{ fontSize: 11, color: "#666" }}>{f.platform}</span>
                      <span style={{ fontSize: 14, color: "#ddd" }}>{f.title}</span>
                    </div>
                    {f.fix && (
                      <div style={{ marginTop: 6, fontSize: 13, color: "#888" }}>
                        Fix: {f.fix}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
