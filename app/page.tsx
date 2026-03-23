// /app/page.tsx
"use client";

import { useState } from "react";
import ScanPanel from "@/components/ScanPanel";
import InterviewChat from "@/components/InterviewChat";
import LaunchDashboard from "@/components/LaunchDashboard";

type ScanReport = {
  id: string;
  repoUrl: string;
  summary: {
    iosReadiness: string;
    androidReadiness: string;
    topRisks: string[];
  };
  findings: Array<{
    priority: string;
    platform: string;
    title: string;
    evidence?: string;
    fix?: string;
  }>;
  meta: { scannedAtIso: string; notes: string[] };
};

type GeneratedResult = {
  app: Record<string, unknown>;
  pages: { about: string; privacy: string; support: string };
};

type Mode = "home" | "scan" | "interview" | "dashboard";

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("home");
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);

  function handleScanComplete(report: ScanReport) {
    setScanReport(report);
  }

  function startInterview() {
    setMode("interview");
  }

  function handleGenerated(result: GeneratedResult) {
    setGeneratedResult(result);
    setMode("dashboard");
  }

  // Build scan context string for the generation prompt
  const scanContext = scanReport
    ? scanReport.findings
        .map((f) => `[${f.priority}] ${f.platform}: ${f.title}`)
        .join("\n")
    : undefined;

  return (
    <main style={styles.main}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => setMode("home")}>
          <span style={{ fontWeight: 900, fontSize: 20, cursor: "pointer" }}>
            AppPreflight
          </span>
        </div>
        {mode === "dashboard" && (
          <button
            onClick={() => {
              setMode("home");
              setGeneratedResult(null);
              setScanReport(null);
            }}
            style={styles.newBtn}
          >
            + New app
          </button>
        )}
      </header>

      {/* Hero */}
      {mode === "home" && (
        <div style={styles.hero}>
          <div style={styles.badge}>App store submission engine</div>
          <h1 style={styles.h1}>
            Scan. Interview. Launch.
          </h1>
          <p style={styles.subtitle}>
            One conversation turns your app into everything Apple and Google
            need — privacy pages, support pages, marketing copy, hosted and
            ready to link.
          </p>

          <div style={styles.cards}>
            <div
              style={styles.card}
              onClick={() => setMode("scan")}
              role="button"
              tabIndex={0}
            >
              <div style={styles.cardIcon}>↗</div>
              <div style={styles.cardTitle}>Start with a scan</div>
              <div style={styles.cardDesc}>
                Paste a public GitHub URL. We'll audit for missing
                privacy policies, terms, support pages, and store
                rejection risks.
              </div>
              <div style={styles.cardCta}>Free — run preflight scan →</div>
            </div>

            <div
              style={styles.card}
              onClick={() => setMode("interview")}
              role="button"
              tabIndex={0}
            >
              <div style={styles.cardIcon}>◉</div>
              <div style={styles.cardTitle}>Start the interview</div>
              <div style={styles.cardDesc}>
                Our AI interviews you about your app. Extracts your
                tone, story, and compliance info. Generates everything
                in one sitting.
              </div>
              <div style={styles.cardCta}>Build launch package →</div>
            </div>
          </div>

          <div style={styles.flow}>
            <FlowStep n="1" label="Scan your repo" sub="(optional)" />
            <FlowArrow />
            <FlowStep n="2" label="AI interview" sub="5-10 min" />
            <FlowArrow />
            <FlowStep n="3" label="Pages generated" sub="Privacy, support, about" />
            <FlowArrow />
            <FlowStep n="4" label="Launch dashboard" sub="Copy, paste, submit" />
          </div>
        </div>
      )}

      {/* Scan mode */}
      {mode === "scan" && (
        <div style={styles.container}>
          <button onClick={() => setMode("home")} style={styles.backBtn}>
            ← Back
          </button>
          <div style={styles.sectionLabel}>Preflight scan</div>
          <h2 style={styles.h2}>
            Audit your repo for store submission risks
          </h2>
          <p style={styles.sectionSub}>
            Paste a public GitHub repo URL. We'll check for missing
            privacy policies, terms, manifests, and common rejection
            triggers.
          </p>
          <ScanPanel onScanComplete={handleScanComplete} />

          {scanReport && (
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  border: "1px solid #1e3a1e",
                  background: "rgba(29,158,117,0.04)"
                }}
              >
                <div style={{ fontSize: 13, color: "#1d9e75", fontWeight: 700, marginBottom: 6 }}>
                  Scan complete — want to fix everything at once?
                </div>
                <p style={{ color: "#aaa", fontSize: 14, margin: "0 0 14px" }}>
                  Our AI interview will gather everything needed to
                  generate your missing pages, marketing copy, and app
                  store assets. Scan results are carried forward
                  automatically.
                </p>
                <button onClick={startInterview} style={styles.ctaBtn}>
                  Start AI interview →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interview mode */}
      {mode === "interview" && (
        <div style={styles.container}>
          <button
            onClick={() => (scanReport ? setMode("scan") : setMode("home"))}
            style={styles.backBtn}
          >
            ← Back
          </button>
          {scanReport && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #1e3a1e",
                background: "rgba(29,158,117,0.04)",
                fontSize: 13,
                color: "#1d9e75"
              }}
            >
              Scan from {scanReport.repoUrl} attached — {scanReport.findings.length} findings will inform your launch package.
            </div>
          )}
          <div style={styles.sectionLabel}>AI interview</div>
          <h2 style={styles.h2}>
            Tell us about your app
          </h2>
          <p style={styles.sectionSub}>
            Answer a few questions. We'll generate your privacy policy,
            support page, about page, and app store marketing copy —
            all hosted and ready to link.
          </p>
          <InterviewChat
            scanContext={scanContext}
            scanReportId={scanReport?.id}
            onGenerated={handleGenerated}
          />
        </div>
      )}

      {/* Dashboard mode */}
      {mode === "dashboard" && generatedResult && (
        <div style={styles.container}>
          <LaunchDashboard
            app={generatedResult.app as any}
            pages={generatedResult.pages}
          />
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={{ color: "#444" }}>
          AppPreflight — Confidence before submission.
        </span>
      </footer>
    </main>
  );
}

function FlowStep({ n, label, sub }: { n: string; label: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", flex: "0 0 auto" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid #333",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 800,
          marginBottom: 6,
          color: "#999"
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#ccc" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#555" }}>{sub}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div
      style={{
        flex: "1 1 0",
        height: 1,
        background: "#2a2a2a",
        alignSelf: "center",
        marginTop: -14,
        minWidth: 24
      }}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#050505",
    color: "#fff",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    maxWidth: 1060,
    margin: "0 auto",
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  newBtn: {
    padding: "8px 18px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "transparent",
    color: "#888",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13
  },
  hero: {
    maxWidth: 1060,
    margin: "0 auto",
    padding: "48px 24px 40px"
  },
  badge: {
    display: "inline-block",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.8,
    color: "#666",
    marginBottom: 16,
    padding: "5px 12px",
    borderRadius: 999,
    border: "1px solid #222"
  },
  h1: {
    fontSize: "clamp(36px, 6vw, 64px)",
    lineHeight: 1.05,
    margin: "0 0 16px",
    fontWeight: 900,
    letterSpacing: "-0.02em"
  },
  subtitle: {
    color: "#888",
    maxWidth: 620,
    fontSize: 18,
    lineHeight: 1.6,
    margin: "0 0 36px"
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
    marginBottom: 48
  },
  card: {
    padding: 24,
    borderRadius: 16,
    border: "1px solid #1e1e1e",
    background: "#0a0a0a",
    cursor: "pointer",
    transition: "border-color 0.15s"
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 12,
    color: "#555"
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 8
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#888",
    marginBottom: 16
  },
  cardCta: {
    fontSize: 14,
    fontWeight: 700,
    color: "#fff"
  },
  flow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center"
  },
  container: {
    maxWidth: 1060,
    margin: "0 auto",
    padding: "20px 24px 60px"
  },
  backBtn: {
    background: "none",
    border: "1px solid #222",
    borderRadius: 8,
    color: "#888",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 20
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#555",
    marginBottom: 8
  },
  h2: {
    fontSize: 32,
    fontWeight: 900,
    margin: "0 0 8px",
    letterSpacing: "-0.01em"
  },
  sectionSub: {
    color: "#888",
    fontSize: 16,
    lineHeight: 1.6,
    margin: "0 0 24px",
    maxWidth: 600
  },
  ctaBtn: {
    padding: "12px 24px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#fff",
    color: "#000",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 15
  },
  footer: {
    maxWidth: 1060,
    margin: "0 auto",
    padding: "40px 24px",
    borderTop: "1px solid #111",
    fontSize: 13
  }
};
