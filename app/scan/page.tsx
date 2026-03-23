"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";

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

type FixForm = {
  appName: string;
  companyName: string;
  supportEmail: string;
  websiteUrl: string;
  jurisdiction: string;
  effectiveDate: string; // YYYY-MM-DD
  hasAccounts: boolean;
};

export default function ScanPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fix modal state
  const [fixOpen, setFixOpen] = useState(false);
  const [fixBusy, setFixBusy] = useState(false);
  const [fixWhich, setFixWhich] = useState<"PAGES_PACK" | "PRIVACY" | "TERMS" | "SUPPORT" | "DELETE">("PAGES_PACK");

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [fixForm, setFixForm] = useState<FixForm>({
    appName: "My App",
    companyName: "My Company",
    supportEmail: "support@mycompany.com",
    websiteUrl: "https://example.com",
    jurisdiction: "United States",
    effectiveDate: todayIso,
    hasAccounts: true,
  });

  const detectedNeeds = useMemo(() => {
    const titles = (report?.findings || []).map((f) => f.title.toLowerCase());

    const needsPrivacy = titles.some((t) => t.includes("privacy policy"));
    const needsTerms = titles.some((t) => t.includes("terms"));
    const needsSupport = titles.some((t) => t.includes("support/contact"));
    const needsDelete = titles.some((t) => t.includes("account deletion"));

    return { needsPrivacy, needsTerms, needsSupport, needsDelete };
  }, [report]);

  async function runScan() {
    setError(null);
    setReport(null);
    setReportUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Scan failed");

      const rep = data.report as Report;
      setReport(rep);

      const url = (data.reportUrl as string) || (rep?.id ? `/report/${rep.id}` : null);
      setReportUrl(url);

      // best-effort autofill based on repo name
      const repoNameGuess = guessRepoName(rep.repoUrl);
      if (repoNameGuess && fixForm.appName === "My App") {
        setFixForm((p) => ({ ...p, appName: repoNameGuess }));
      }
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function openFix(which: typeof fixWhich) {
    setFixWhich(which);
    setFixOpen(true);
  }

  function closeFix() {
    if (fixBusy) return;
    setFixOpen(false);
  }

  async function downloadFixPack() {
    setFixBusy(true);
    try {
      const zip = new JSZip();

      const effective = fixForm.effectiveDate || todayIso;

      const privacyHtml = buildPrivacyHtml({
        appName: fixForm.appName,
        companyName: fixForm.companyName,
        supportEmail: fixForm.supportEmail,
        websiteUrl: fixForm.websiteUrl,
        jurisdiction: fixForm.jurisdiction,
        effectiveDate: effective,
      });

      const termsHtml = buildTermsHtml({
        appName: fixForm.appName,
        companyName: fixForm.companyName,
        supportEmail: fixForm.supportEmail,
        websiteUrl: fixForm.websiteUrl,
        jurisdiction: fixForm.jurisdiction,
        effectiveDate: effective,
      });

      const supportHtml = buildSupportHtml({
        appName: fixForm.appName,
        companyName: fixForm.companyName,
        supportEmail: fixForm.supportEmail,
        websiteUrl: fixForm.websiteUrl,
      });

      const deleteHtml = buildDeleteAccountHtml({
        appName: fixForm.appName,
        companyName: fixForm.companyName,
        supportEmail: fixForm.supportEmail,
        websiteUrl: fixForm.websiteUrl,
        hasAccounts: fixForm.hasAccounts,
      });

      // Always include all pages in the pack. Users can publish what they need.
      zip.file("privacy.html", privacyHtml);
      zip.file("terms.html", termsHtml);
      zip.file("support.html", supportHtml);
      zip.file("delete-account.html", deleteHtml);

      const checklist = buildReadmeChecklist({
        appName: fixForm.appName,
        websiteUrl: fixForm.websiteUrl,
        hasAccounts: fixForm.hasAccounts,
      });

      zip.file("README.txt", checklist);

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `apppreflight-fix-pack-${slugify(fixForm.appName)}.zip`);
    } finally {
      setFixBusy(false);
      setFixOpen(false);
    }
  }

  function downloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    downloadBlob(blob, `apppreflight-report-${report.id || "report"}.json`);
  }

  async function copyLink() {
    if (!reportUrl) return;
    const full = `${window.location.origin}${reportUrl}`;
    await navigator.clipboard.writeText(full);
    alert("Copied report link!");
  }

  return (
    <main style={{ maxWidth: 1050, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
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
            fontWeight: 900,
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

            <p style={{ margin: "6px 0" }}>
              <b>Repo:</b> {report.repoUrl}
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "10px 0" }}>
              <div><b>iOS readiness:</b> {badge(report.summary.iosReadiness)}</div>
              <div><b>Android readiness:</b> {badge(report.summary.androidReadiness)}</div>
            </div>

            <div style={{ marginTop: 12, padding: 14, border: "2px solid #000", borderRadius: 12 }}>
              <div style={{ fontWeight: 1000, marginBottom: 10 }}>Fix it now (one click)</div>
              <div style={{ color: "#444", marginBottom: 12 }}>
                Generates a ZIP with Privacy, Terms, Support, and Delete Account pages + a store checklist.
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => openFix("PAGES_PACK")} style={btnPrimary}>
                  Generate Fix Pack (ZIP)
                </button>

                <button onClick={downloadJson} style={btnGhost}>
                  Download Report JSON
                </button>

                {reportUrl && (
                  <button onClick={copyLink} style={btnGhost}>
                    Copy Report Link
                  </button>
                )}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
                Detected missing items:{" "}
                <b>
                  {[
                    detectedNeeds.needsPrivacy ? "Privacy" : null,
                    detectedNeeds.needsTerms ? "Terms" : null,
                    detectedNeeds.needsSupport ? "Support" : null,
                    detectedNeeds.needsDelete ? "Delete Account" : null,
                  ].filter(Boolean).join(", ") || "None obvious"}
                </b>
              </div>
            </div>

            <p style={{ margin: "14px 0 0 0" }}><b>Top risks:</b></p>
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

                    {/* Extra “Fix” button per finding for A-items */}
                    {isPageFixable(f.title) && (
                      <div style={{ marginTop: 10 }}>
                        <button onClick={() => openFix("PAGES_PACK")} style={btnGhost}>
                          Fix this (generate pages pack)
                        </button>
                      </div>
                    )}
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

      {/* Fix Modal */}
      {fixOpen && (
        <div style={modalBackdrop} onClick={closeFix}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 1000 }}>
                Generate Fix Pack (Pages + Checklist)
              </div>
              <button onClick={closeFix} style={btnGhost} disabled={fixBusy}>
                Close
              </button>
            </div>

            <p style={{ color: "#555", marginTop: 10 }}>
              Fill this out once. We’ll generate pages you can publish on your website and link in App Store Connect / Google Play.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <Field label="App Name" value={fixForm.appName} onChange={(v) => setFixForm((p) => ({ ...p, appName: v }))} />
              <Field label="Company Name" value={fixForm.companyName} onChange={(v) => setFixForm((p) => ({ ...p, companyName: v }))} />
              <Field label="Support Email" value={fixForm.supportEmail} onChange={(v) => setFixForm((p) => ({ ...p, supportEmail: v }))} />
              <Field label="Website URL" value={fixForm.websiteUrl} onChange={(v) => setFixForm((p) => ({ ...p, websiteUrl: v }))} />
              <Field label="Jurisdiction" value={fixForm.jurisdiction} onChange={(v) => setFixForm((p) => ({ ...p, jurisdiction: v }))} />
              <Field label="Effective Date (YYYY-MM-DD)" value={fixForm.effectiveDate} onChange={(v) => setFixForm((p) => ({ ...p, effectiveDate: v }))} />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={fixForm.hasAccounts}
                  onChange={(e) => setFixForm((p) => ({ ...p, hasAccounts: e.target.checked }))}
                />
                This app has user accounts (login)
              </label>
              <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>
                If checked, the Delete Account page will include a simple “how to delete” flow.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <button onClick={downloadFixPack} style={btnPrimary} disabled={fixBusy}>
                {fixBusy ? "Building ZIP..." : "Download Fix Pack (ZIP)"}
              </button>
              <button onClick={closeFix} style={btnGhost} disabled={fixBusy}>
                Cancel
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
              Next (B): we’ll add a second button to generate App Store permission text + Google Play Data Safety answers.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 10px",
          borderRadius: 10,
          border: "1px solid #ddd",
        }}
      />
    </div>
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
    <span style={{ padding: "3px 10px", borderRadius: 999, border: `1px solid ${border}`, background: bg, fontWeight: 900 }}>
      {v}
    </span>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "black",
  color: "white",
  border: "none",
  fontWeight: 1000,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 16,
  zIndex: 50,
};

const modalCard: React.CSSProperties = {
  width: "min(900px, 100%)",
  background: "white",
  borderRadius: 14,
  padding: 16,
  border: "1px solid #eee",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(s: string) {
  return (s || "app")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function guessRepoName(repoUrl: string) {
  try {
    const m = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!m) return "";
    const name = m[2].replace(/\.git$/i, "");
    if (!name) return "";
    return name
      .split(/[-_]/g)
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join(" ");
  } catch {
    return "";
  }
}

function isPageFixable(title: string) {
  const t = (title || "").toLowerCase();
  return t.includes("privacy") || t.includes("terms") || t.includes("support") || t.includes("account deletion");
}

/* -------------------- Page Templates (A) -------------------- */

function baseHtml(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; padding: 0; color:#111; }
  .wrap { max-width: 900px; margin: 0 auto; padding: 32px 16px; }
  h1 { font-size: 28px; margin: 0 0 10px; }
  h2 { font-size: 18px; margin-top: 24px; }
  p, li { line-height: 1.6; color:#222; }
  .muted { color:#555; }
  .box { border: 1px solid #ddd; border-radius: 12px; padding: 14px; background: #fafafa; }
  a { color: #111; }
</style>
</head>
<body>
  <div class="wrap">
    ${body}
  </div>
</body>
</html>`;
}

function buildPrivacyHtml(args: {
  appName: string;
  companyName: string;
  supportEmail: string;
  websiteUrl: string;
  jurisdiction: string;
  effectiveDate: string;
}) {
  const { appName, companyName, supportEmail, websiteUrl, jurisdiction, effectiveDate } = args;
  return baseHtml(`${appName} Privacy Policy`, `
<h1>Privacy Policy</h1>
<p class="muted"><b>Effective date:</b> ${escapeHtml(effectiveDate)}</p>

<div class="box">
  <p><b>${escapeHtml(companyName)}</b> ("we", "us") operates <b>${escapeHtml(appName)}</b> (the "App"). This Privacy Policy explains what information we collect, how we use it, and the choices you have.</p>
</div>

<h2>Information We Collect</h2>
<ul>
  <li><b>Information you provide:</b> such as account details, messages, or support requests (if applicable).</li>
  <li><b>App usage data:</b> basic analytics and diagnostics to improve reliability.</li>
  <li><b>Device data:</b> device type, OS version, and crash logs (if enabled).</li>
</ul>

<h2>How We Use Information</h2>
<ul>
  <li>To provide and maintain the App</li>
  <li>To improve performance and fix bugs</li>
  <li>To provide customer support</li>
  <li>To comply with legal obligations</li>
</ul>

<h2>Sharing</h2>
<p>We do not sell your personal information. We may share information with service providers who help us operate the App (for example: hosting, analytics, payments), under confidentiality obligations.</p>

<h2>Data Retention</h2>
<p>We retain information only as long as necessary for the purposes described here, unless a longer retention period is required by law.</p>

<h2>Your Choices</h2>
<ul>
  <li>You may request access, correction, or deletion of your data by contacting us at <b>${escapeHtml(supportEmail)}</b>.</li>
  <li>If the App includes account deletion, see our account deletion instructions page.</li>
</ul>

<h2>Contact</h2>
<p>Email: <b>${escapeHtml(supportEmail)}</b><br/>
Website: <a href="${escapeAttr(websiteUrl)}">${escapeHtml(websiteUrl)}</a></p>

<h2>Jurisdiction</h2>
<p>This policy is intended for users in ${escapeHtml(jurisdiction)}. If you are located elsewhere, your rights may differ.</p>
`);
}

function buildTermsHtml(args: {
  appName: string;
  companyName: string;
  supportEmail: string;
  websiteUrl: string;
  jurisdiction: string;
  effectiveDate: string;
}) {
  const { appName, companyName, supportEmail, websiteUrl, jurisdiction, effectiveDate } = args;
  return baseHtml(`${appName} Terms of Service`, `
<h1>Terms of Service</h1>
<p class="muted"><b>Effective date:</b> ${escapeHtml(effectiveDate)}</p>

<div class="box">
  <p>These Terms govern your use of <b>${escapeHtml(appName)}</b> (the "App") provided by <b>${escapeHtml(companyName)}</b> ("we", "us"). By using the App, you agree to these Terms.</p>
</div>

<h2>Use of the App</h2>
<ul>
  <li>You agree to use the App lawfully and not to abuse or interfere with it.</li>
  <li>You are responsible for your device and account security.</li>
</ul>

<h2>Accounts</h2>
<p>If the App supports accounts, you are responsible for maintaining the confidentiality of your credentials and activities under your account.</p>

<h2>Payments (if applicable)</h2>
<p>If the App offers paid features, prices and billing terms will be shown at purchase time. Subscriptions can be managed via your platform account (Apple/Google).</p>

<h2>Disclaimer</h2>
<p>The App is provided "as is" without warranties of any kind to the fullest extent permitted by law.</p>

<h2>Limitation of Liability</h2>
<p>To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the App.</p>

<h2>Termination</h2>
<p>We may suspend or terminate access if you violate these Terms or if required for security or legal reasons.</p>

<h2>Contact</h2>
<p>Email: <b>${escapeHtml(supportEmail)}</b><br/>
Website: <a href="${escapeAttr(websiteUrl)}">${escapeHtml(websiteUrl)}</a></p>

<h2>Governing Law</h2>
<p>These Terms are governed by the laws of ${escapeHtml(jurisdiction)}.</p>
`);
}

function buildSupportHtml(args: {
  appName: string;
  companyName: string;
  supportEmail: string;
  websiteUrl: string;
}) {
  const { appName, companyName, supportEmail, websiteUrl } = args;
  return baseHtml(`${appName} Support`, `
<h1>Support</h1>
<p class="muted">Need help with <b>${escapeHtml(appName)}</b>? Contact us and we’ll respond as soon as possible.</p>

<div class="box">
  <p><b>Support email:</b> ${escapeHtml(supportEmail)}</p>
  <p><b>Website:</b> <a href="${escapeAttr(websiteUrl)}">${escapeHtml(websiteUrl)}</a></p>
  <p><b>Company:</b> ${escapeHtml(companyName)}</p>
</div>

<h2>What to include</h2>
<ul>
  <li>Your device model and OS version</li>
  <li>What you were doing when the problem occurred</li>
  <li>Screenshots if relevant</li>
</ul>
`);
}

function buildDeleteAccountHtml(args: {
  appName: string;
  companyName: string;
  supportEmail: string;
  websiteUrl: string;
  hasAccounts: boolean;
}) {
  const { appName, companyName, supportEmail, websiteUrl, hasAccounts } = args;

  const content = hasAccounts
    ? `
<h1>Delete Your Account</h1>
<p class="muted">This page explains how to delete your ${escapeHtml(appName)} account and associated data.</p>

<div class="box">
  <p><b>In-app deletion (recommended):</b></p>
  <ol>
    <li>Open the App</li>
    <li>Go to <b>Settings</b> → <b>Account</b> → <b>Delete Account</b></li>
    <li>Confirm deletion</li>
  </ol>
  <p><b>If you can’t access the app:</b> Email <b>${escapeHtml(supportEmail)}</b> with subject “Delete my account” and include the email/username on the account.</p>
</div>

<h2>What gets deleted</h2>
<ul>
  <li>Your account profile</li>
  <li>App-specific content associated with your account (where applicable)</li>
</ul>

<h2>Retention</h2>
<p>We may retain limited information when required by law or for fraud prevention. Otherwise, deletion is permanent.</p>

<h2>Contact</h2>
<p>Email: <b>${escapeHtml(supportEmail)}</b><br/>
Website: <a href="${escapeAttr(websiteUrl)}">${escapeHtml(websiteUrl)}</a><br/>
Company: ${escapeHtml(companyName)}</p>
`
    : `
<h1>Account Deletion</h1>
<p class="muted">${escapeHtml(appName)} does not require user accounts.</p>
<div class="box">
  <p>If you believe we have stored personal information about you, contact <b>${escapeHtml(supportEmail)}</b> and we will help.</p>
</div>
<p>Website: <a href="${escapeAttr(websiteUrl)}">${escapeHtml(websiteUrl)}</a><br/>
Company: ${escapeHtml(companyName)}</p>
`;

  return baseHtml(`${appName} Account Deletion`, content);
}

function buildReadmeChecklist(args: { appName: string; websiteUrl: string; hasAccounts: boolean }) {
  const { appName, websiteUrl, hasAccounts } = args;

  return `AppPreflight Fix Pack for: ${appName}

WHAT THIS ZIP CONTAINS
- privacy.html
- terms.html
- support.html
- delete-account.html
- README.txt (this file)

STEP 1: PUBLISH THESE PAGES
Upload the HTML files to your website so they are reachable at public URLs, for example:
${websiteUrl}/privacy
${websiteUrl}/terms
${websiteUrl}/support
${websiteUrl}/delete-account

STEP 2: APPLE APP STORE CONNECT LINKS
In App Store Connect, set:
- Privacy Policy URL  -> your published /privacy URL
- Support URL         -> your published /support URL
(Optional but recommended)
- Terms URL           -> your published /terms URL

STEP 3: GOOGLE PLAY CONSOLE LINKS
In Google Play Console, set:
- Privacy Policy      -> your published /privacy URL
- Support             -> your /support URL (or support email)

STEP 4: ACCOUNT DELETION
If your app has accounts: ${hasAccounts ? "YES" : "NO"}
If YES, ensure:
- In-app deletion exists (Settings -> Account -> Delete)
- Public deletion page exists (/delete-account)

NEXT UPGRADE (B): Permission Text + Data Safety Generator
We will add “Fix permission text” to generate:
- iOS usage descriptions (camera/mic/photos/location)
- Android permission rationale
- Google Play Data Safety answers
`;
}

/* -------------------- Escape helpers -------------------- */

function escapeHtml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(s: string) {
  // minimal attribute escaping
  return escapeHtml(s).replaceAll("`", "&#096;");
}
