# ==========================================
# AppPreflight MVP - real scaffold writer
# Run from Next.js project root (has package.json)
# ==========================================

$ErrorActionPreference = "Stop"

function Write-File($path, $content) {
  $dir = Split-Path $path
  if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Set-Content -Path $path -Value $content -Encoding UTF8
  Write-Host "Wrote $path"
}

# --- Create directories (idempotent) ---
$dirs = @(
  "app",
  "app\api\scan",
  "app\scan",
  "app\privacy",
  "app\terms",
  "lib",
  "lib\scanners",
  "public"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Path $d -Force | Out-Null }

# --- layout.tsx ---
Write-File "app\layout.tsx" @'
export const metadata = {
  title: "AppPreflight",
  description: "Confidence before submission.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui" }}>{children}</body>
    </html>
  );
}
'@

# --- Landing page ---
Write-File "app\page.tsx" @'
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>AppPreflight</h1>
      <p style={{ fontSize: 18, lineHeight: 1.5, marginBottom: 20 }}>
        Confidence before submission. Scan a repo for common Apple App Store and Google Play rejection triggers.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/scan" style={btnPrimary}>Run Preflight Scan</Link>
        <Link href="/privacy" style={btnGhost}>Privacy</Link>
        <Link href="/terms" style={btnGhost}>Terms</Link>
      </div>

      <div style={{ marginTop: 28, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>What it catches (MVP)</h3>
        <ul style={{ lineHeight: 1.6 }}>
          <li><b>iOS:</b> Missing Info.plist usage strings (camera, mic, photos, location), ATS arbitrary loads flag</li>
          <li><b>Android:</b> Dangerous permissions + exported component flags, basic manifest checks</li>
          <li><b>Repo-wide:</b> Presence hints for privacy/terms/support/account deletion docs/pages</li>
        </ul>
        <p style={{ color: "#666", marginBottom: 0 }}>
          MVP scans <b>public GitHub repos</b> via ZIP download. Private repos come next.
        </p>
      </div>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: 10,
  background: "black",
  color: "white",
  textDecoration: "none",
  fontWeight: 700,
};

const btnGhost: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid #ddd",
  color: "black",
  textDecoration: "none",
  fontWeight: 700,
};
'@

# --- Scan page ---
Write-File "app\scan\page.tsx" @'
"use client";

import { useState } from "react";

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

export default function ScanPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    setError(null);
    setReport(null);
    setLoading(true);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Scan failed");
      setReport(data.report as Report);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 34, marginBottom: 6 }}>Run a Preflight Scan</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Paste a <b>public GitHub repo URL</b> (example: https://github.com/owner/repo)
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          style={{
            flex: 1,
            minWidth: 320,
            padding: "12px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />
        <button
          onClick={runScan}
          disabled={loading || repoUrl.trim().length < 8}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: loading ? "#444" : "black",
            color: "white",
            fontWeight: 800,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Scanning..." : "Run Preflight"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f3c0c0", background: "#fff5f5", borderRadius: 10 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {report && (
        <section style={{ marginTop: 24 }}>
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
                      <b>{f.priority} · {f.platform}</b>
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
        </section>
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
'@

# --- Privacy page ---
Write-File "app\privacy\page.tsx" @'
export default function Privacy() {
  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Privacy Policy</h1>
      <p>
        AppPreflight analyzes repositories to generate a compliance-style report. Do not include secrets.
        For public GitHub repos, we fetch the repository ZIP via GitHub’s API to inspect relevant config files.
      </p>
      <p>
        Replace this page with your full Privacy Policy before taking payments.
      </p>
    </main>
  );
}
'@

# --- Terms page ---
Write-File "app\terms\page.tsx" @'
export default function Terms() {
  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Terms of Service</h1>
      <p>
        AppPreflight reports are advisory and do not guarantee store approval.
      </p>
      <p>
        Replace this page with your full Terms before taking payments.
      </p>
    </main>
  );
}
'@

# --- GitHub helper ---
Write-File "lib\github.ts" @'
export function normalizeGitHubRepoUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    return `https://github.com/${owner}/${repo}`;
  } catch {
    return null;
  }
}

export function getGitHubZipUrl(repoUrl: string): string {
  const u = new URL(repoUrl);
  const parts = u.pathname.split("/").filter(Boolean);
  const owner = parts[0];
  const repo = parts[1];
  return `https://api.github.com/repos/${owner}/${repo}/zipball`;
}

export async function fetchZipBytes(zipUrl: string): Promise<ArrayBuffer> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "AppPreflight-MVP",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(zipUrl, { headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub ZIP fetch failed (${res.status}). ${txt.slice(0, 250)}`);
  }
  return await res.arrayBuffer();
}
'@

# --- iOS scanner ---
Write-File "lib\scanners\ios.ts" @'
type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

export function scanIOS(textFiles: Record<string, string>, xml: any): Finding[] {
  const findings: Finding[] = [];
  const plistEntries = Object.entries(textFiles).filter(([p]) => p.endsWith("Info.plist"));

  if (plistEntries.length === 0) {
    findings.push({
      priority: "P1",
      platform: "iOS",
      title: "No Info.plist found in scanned files",
      evidence: "Could be missing from repo ZIP scope or generated at build time.",
      fix: "Ensure Info.plist is present in source or confirm build pipeline generates it with required usage strings.",
    });
    return findings;
  }

  const hints = repoUsageHints(textFiles);

  for (const [path, contents] of plistEntries) {
    if (!contents.includes("<plist")) {
      findings.push({
        priority: "P1",
        platform: "iOS",
        title: "Info.plist is not XML (MVP scanner limitation)",
        evidence: path,
        fix: "Convert Info.plist to XML in source or extend scanner to parse binary plists.",
      });
      continue;
    }

    const keys = extractPlistKeys(contents);

    const required = [
      { key: "NSCameraUsageDescription", label: "Camera" },
      { key: "NSMicrophoneUsageDescription", label: "Microphone" },
      { key: "NSPhotoLibraryUsageDescription", label: "Photo Library" },
      { key: "NSLocationWhenInUseUsageDescription", label: "Location (When In Use)" },
    ];

    for (const r of required) {
      const used = hints[r.label] === true;
      const hasKey = keys.has(r.key);

      if (used && !hasKey) {
        findings.push({
          priority: "P0",
          platform: "iOS",
          title: `Missing ${r.key} (required if using ${r.label})`,
          evidence: `Info.plist: ${path}`,
          fix: `Add "${r.key}" with a clear user-facing reason string.`,
        });
      }
    }

    if (keys.has("NSAppTransportSecurity") && contents.includes("NSAllowsArbitraryLoads") && contents.toLowerCase().includes("<true")) {
      findings.push({
        priority: "P1",
        platform: "iOS",
        title: "ATS allows arbitrary loads (review risk)",
        evidence: `Info.plist: ${path}`,
        fix: "Avoid NSAllowsArbitraryLoads in production; prefer domain exceptions with justification.",
      });
    }
  }

  return findings;
}

function extractPlistKeys(xmlText: string): Set<string> {
  const keys = new Set<string>();
  const re = /<key>([^<]+)<\/key>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xmlText))) keys.add(m[1].trim());
  return keys;
}

function repoUsageHints(textFiles: Record<string, string>): Record<string, boolean> {
  const blob = Object.values(textFiles).join("\n").toLowerCase();
  return {
    "Camera": blob.includes("avcapture") || blob.includes("imagepickercontroller") || (blob.includes("camera") && !blob.includes("camerausage")),
    "Microphone": blob.includes("avaudiosession") || blob.includes("recordaudio") || (blob.includes("microphone") && !blob.includes("microphoneusage")),
    "Photo Library": blob.includes("phphotolibrary") || blob.includes("uiimagepickercontroller") || blob.includes("photolibrary"),
    "Location (When In Use)": blob.includes("cllocationmanager") || blob.includes("requestwheninuseauthorization") || blob.includes("locationmanager"),
  };
}
'@

# --- Android scanner ---
Write-File "lib\scanners\android.ts" @'
type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

const DANGEROUS_PERMS = [
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.RECORD_AUDIO",
  "android.permission.CAMERA",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_EXTERNAL_STORAGE",
];

export function scanAndroid(textFiles: Record<string, string>, xml: any): Finding[] {
  const findings: Finding[] = [];
  const manifests = Object.entries(textFiles).filter(([p]) => p.endsWith("AndroidManifest.xml"));

  if (manifests.length === 0) {
    findings.push({
      priority: "P1",
      platform: "Android",
      title: "No AndroidManifest.xml found in scanned files",
      evidence: "Could be missing from repo ZIP scope or generated at build time.",
      fix: "Ensure AndroidManifest.xml is present in source or confirm build pipeline produces it.",
    });
    return findings;
  }

  for (const [path, contents] of manifests) {
    const presentPerms = new Set<string>();
    for (const perm of DANGEROUS_PERMS) {
      if (contents.includes(perm)) presentPerms.add(perm);
    }

    if (presentPerms.size > 0) {
      findings.push({
        priority: "P1",
        platform: "Android",
        title: "Dangerous permissions detected (must justify and disclose)",
        evidence: `${path}: ${Array.from(presentPerms).join(", ")}`,
        fix: "Remove unused permissions. For used permissions, ensure runtime permission flows and correct Play Data Safety disclosures.",
      });
    }

    if (contents.includes('android:exported="true"')) {
      findings.push({
        priority: "P1",
        platform: "Android",
        title: "Exported components detected (review/security risk)",
        evidence: `AndroidManifest.xml: ${path}`,
        fix: "Ensure exported=true is required and properly protected; avoid exporting unless needed.",
      });
    }
  }

  return findings;
}
'@

# --- Repo-wide scanner ---
Write-File "lib\scanners\repoWide.ts" @'
type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

export function scanRepoWide(textFiles: Record<string, string>): Finding[] {
  const findings: Finding[] = [];
  const paths = Object.keys(textFiles).map((p) => p.toLowerCase());

  const hasPrivacy = paths.some((p) => p.includes("privacy") && (p.endsWith(".md") || p.endsWith(".txt") || p.includes("/privacy")));
  const hasTerms = paths.some((p) => p.includes("terms") && (p.endsWith(".md") || p.endsWith(".txt") || p.includes("/terms")));
  const hasSupport = paths.some((p) => p.includes("support") || p.includes("contact") || p.includes("help"));
  const hasDelete = paths.some((p) => p.includes("delete") && p.includes("account"));

  if (!hasPrivacy) {
    findings.push({
      priority: "P0",
      platform: "Both",
      title: "No obvious Privacy Policy file/page detected",
      evidence: "Repo scan did not find privacy-related docs/pages among inspected files.",
      fix: "Add a privacy policy page (web) and ensure app/store listings link to it.",
    });
  }

  if (!hasTerms) {
    findings.push({
      priority: "P1",
      platform: "Both",
      title: "No obvious Terms of Service file/page detected",
      evidence: "Repo scan did not find terms-related docs/pages among inspected files.",
      fix: "Add a terms page before taking payments.",
    });
  }

  if (!hasSupport) {
    findings.push({
      priority: "P1",
      platform: "Both",
      title: "No obvious support/contact path detected",
      evidence: "Repo scan did not find support/contact indicators among inspected files.",
      fix: "Add a support email and/or contact page; include it in store listings.",
    });
  }

  if (!hasDelete) {
    findings.push({
      priority: "P2",
      platform: "Both",
      title: "No obvious account deletion instructions detected",
      evidence: "This becomes P0 if the app requires accounts.",
      fix: "If accounts exist, implement in-app account deletion + a public help page describing deletion.",
    });
  }

  return findings;
}
'@

# --- API route (real scanner) ---
Write-File "app\api\scan\route.ts" @'
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { nanoid } from "nanoid";
import { normalizeGitHubRepoUrl, getGitHubZipUrl, fetchZipBytes } from "@/lib/github";
import { scanIOS } from "@/lib/scanners/ios";
import { scanAndroid } from "@/lib/scanners/android";
import { scanRepoWide } from "@/lib/scanners/repoWide";

export const runtime = "nodejs";

type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const repoUrlRaw = String(body?.repoUrl || "").trim();
    if (!repoUrlRaw) return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });

    const repoUrl = normalizeGitHubRepoUrl(repoUrlRaw);
    if (!repoUrl) {
      return NextResponse.json(
        { error: "Invalid GitHub repo URL. Example: https://github.com/owner/repo" },
        { status: 400 }
      );
    }

    const zipUrl = getGitHubZipUrl(repoUrl);
    const zipBytes = await fetchZipBytes(zipUrl);

    const zip = await JSZip.loadAsync(zipBytes);
    const allPaths = Object.keys(zip.files);

    const want = (p: string) => {
      const low = p.toLowerCase();
      return (
        p.endsWith("Info.plist") ||
        p.endsWith("AndroidManifest.xml") ||
        low.includes("privacy") ||
        low.includes("terms") ||
        low.includes("support") ||
        low.includes("contact") ||
        (low.includes("delete") && low.includes("account"))
      );
    };

    const candidates = allPaths.filter(want).slice(0, 300);
    const textFiles: Record<string, string> = {};

    for (const path of candidates) {
      const f = zip.file(path);
      if (!f) continue;

      // avoid huge binaries
      const maybeSize = (zip.files[path] as any)?._data?.uncompressedSize ?? 0;
      if (maybeSize > 2_000_000) continue;

      const buf = await f.async("uint8array");
      const asText = safeDecodeUtf8(buf);
      if (asText) textFiles[path] = asText;
    }

    const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

    const findings: Finding[] = [
      ...scanIOS(textFiles, xml),
      ...scanAndroid(textFiles, xml),
      ...scanRepoWide(textFiles),
    ].sort(sortFindings);

    const iosReadiness = grade(findings.filter((f) => f.platform === "iOS" || f.platform === "Both"));
    const androidReadiness = grade(findings.filter((f) => f.platform === "Android" || f.platform === "Both"));

    const topRisks = findings
      .filter((f) => f.priority === "P0")
      .slice(0, 5)
      .map((f) => `${f.platform}: ${f.title}`);

    const report = {
      id: nanoid(10),
      repoUrl,
      summary: {
        iosReadiness,
        androidReadiness,
        topRisks: topRisks.length ? topRisks : ["No P0 risks found by the MVP ruleset."],
      },
      findings,
      meta: {
        scannedAtIso: new Date().toISOString(),
        notes: [
          "MVP scanner: deterministic rules first, no auto-fixing yet.",
          "Public GitHub repo ZIP download. Private repos will require auth.",
          `Files inspected: ${Object.keys(textFiles).length}`,
        ],
      },
    };

    return NextResponse.json({ report });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

function grade(findings: Finding[]): "PASS" | "WARN" | "FAIL" | "UNKNOWN" {
  if (!findings || findings.length === 0) return "PASS";
  if (findings.some((f) => f.priority === "P0")) return "FAIL";
  if (findings.some((f) => f.priority === "P1")) return "WARN";
  return "WARN";
}

function sortFindings(a: Finding, b: Finding) {
  const pr = (p: string) => (p === "P0" ? 0 : p === "P1" ? 1 : 2);
  return pr(a.priority) - pr(b.priority);
}

function safeDecodeUtf8(buf: Uint8Array): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (text.includes("\u0000")) return null;
    return text;
  } catch {
    return null;
  }
}
'@

Write-Host ""
Write-Host "✅ Files written. Installing dependencies..." -ForegroundColor Green

# --- Install deps required by scanner ---
npm i jszip fast-xml-parser nanoid | Out-Null

Write-Host ""
Write-Host "✅ Done. Next: npm run dev" -ForegroundColor Green
