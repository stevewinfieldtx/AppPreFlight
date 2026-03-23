"use client";

import { useEffect, useState } from "react";

type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

type Report = {
  id: string;
  repoUrl: string;
  summary: {
    iosReadiness: "PASS" | "WARN" | "FAIL" | "UNKNOWN";
    androidReadiness: "PASS" | "WARN" | "FAIL" | "UNKNOWN";
    topRisks: string[];
  };
  findings: Finding[];
  meta: {
    scannedAtIso: string;
    notes: string[];
  };
};

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/report/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load report");
        return data.report as Report;
      })
      .then((rep) => alive && setReport(rep))
      .catch((e: any) => alive && setError(e?.message || "Unknown error"));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 6 }}>Shared Report</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Report ID: <b>{id}</b>
      </p>

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f3c0c0", background: "#fff5f5", borderRadius: 10 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {!error && !report && <p>Loading report...</p>}

      {report && (
        <>
          <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
            <h2 style={{ marginTop: 0 }}>Executive Verdict</h2>
            <p style={{ margin: "6px 0" }}><b>Repo:</b> {report.repoUrl}</p>
            <p style={{ margin: "6px 0" }}><b>iOS readiness:</b> {badge(report.summary.iosReadiness)}</p>
            <p style={{ margin: "6px 0" }}><b>Android readiness:</b> {badge(report.summary.androidReadiness)}</p>

            <p style={{ margin: "10px 0 0 0" }}><b>Top risks:</b></p>
            <ul style={{ marginTop: 6, lineHeight: 1.6 }}>
              {report.summary.topRisks.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          <div style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
            <h2 style={{ marginTop: 0 }}>Findings</h2>
            {report.findings.length === 0 ? (
              <p>No findings detected by the MVP ruleset.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {report.findings.map((f, idx) => (
                  <div key={idx} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <b>{f.priority} - {f.platform}</b>
                      <span style={{ color: "#444" }}>{f.title}</span>
                    </div>
                    {f.evidence && <p style={{ margin: "8px 0 0 0", color: "#333" }}><b>Evidence:</b> {f.evidence}</p>}
                    {f.fix && <p style={{ margin: "8px 0 0 0", color: "#333" }}><b>Fix:</b> {f.fix}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12, color: "#444" }}>
            <b>Scan notes</b>
            <ul style={{ marginTop: 8, lineHeight: 1.6 }}>
              {report.meta.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>

          <p style={{ marginTop: 18, color: "#666" }}>
            Reports are stored permanently and can be shared via this URL.
          </p>
        </>
      )}
    </main>
  );
}

function badge(v: string) {
  const bg =
    v === "PASS" ? "#e8fff0" :
    v === "WARN" ? "#fff7e6" :
    v === "FAIL" ? "#fff0f0" : "#f4f4f4";

  const border =
    v === "PASS" ? "#a7f3c2" :
    v === "WARN" ? "#ffd999" :
    v === "FAIL" ? "#ffb3b3" : "#ddd";

  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, border: `1px solid ${border}`, background: bg, fontWeight: 800 }}>
      {v}
    </span>
  );
}
