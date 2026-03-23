// /components/LaunchDashboard.tsx
"use client";

import { useState, useCallback } from "react";

type GeneratedApp = {
  slug: string;
  appName: string;
  companyName: string;
  oneLiner: string;
  targetAudience: string;
  corePurpose: string;
  keyFeatures: string[];
  differentiators: string[];
  favoritePart: string;
  whatNext: string;
  toneProfile: string;
  founderStory: string;
  support: {
    email: string;
    url?: string;
    faq: Array<{ question: string; answer: string }>;
  };
  privacy: {
    collectsAccounts: boolean;
    collectsAnalytics: boolean;
    collectsPayments: boolean;
    collectsLocation: boolean;
    collectsUserContent: boolean;
    dataCollected: string[];
    thirdParties: string[];
    usesTracking: boolean;
    childrenUnder13: boolean;
    contactEmail: string;
  };
  marketing: {
    appStoreTitle: string;
    subtitle: string;
    keywords: string[];
    description: string;
    screenshotHeadlines: string[];
  };
  scanReportId?: string;
};

type Tab = "store" | "pages" | "screenshots" | "checklist" | "export";

const TABS: { key: Tab; label: string }[] = [
  { key: "store", label: "App store" },
  { key: "pages", label: "Pages" },
  { key: "screenshots", label: "Screenshots" },
  { key: "checklist", label: "Checklist" },
  { key: "export", label: "Export" },
];

export default function LaunchDashboard({
  app: initialApp,
  pages,
}: {
  app: GeneratedApp;
  pages: { about: string; privacy: string; support: string };
}) {
  const [tab, setTab] = useState<Tab>("store");
  const [app, setApp] = useState<GeneratedApp>(initialApp);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function updateMarketing(field: string, value: string) {
    setApp((prev) => ({ ...prev, marketing: { ...prev.marketing, [field]: value } }));
    setSaved(false);
  }

  async function aiRewrite(fieldPath: string, currentValue: string, context: string) {
    setAiLoading(fieldPath);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Rewrite this ${context} for an app called "${app.appName}". Keep the same meaning but try a fresh angle. Be concise and punchy. Tone: ${app.toneProfile}. Current text: "${currentValue}" Return ONLY the rewritten text, nothing else.` }],
          latestUserMessage: "rewrite",
        }),
      });
      const data = await res.json();
      if (data.ok && data.message) return data.message.replace(/^["']|["']$/g, "").trim();
    } catch { /* silent */ } finally { setAiLoading(null); }
    return null;
  }

  const copyText = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 1500);
  }, []);

  const checklist = [
    { label: "App Store title (max 30 chars)", done: app.marketing.appStoreTitle.length > 0 && app.marketing.appStoreTitle.length <= 30 },
    { label: "Subtitle (max 30 chars)", done: app.marketing.subtitle.length > 0 && app.marketing.subtitle.length <= 30 },
    { label: "Description written", done: app.marketing.description.length > 50 },
    { label: "Keywords added (3+)", done: app.marketing.keywords.length >= 3 },
    { label: "Privacy policy URL ready", done: true },
    { label: "Support URL ready", done: true },
    { label: "Support email set", done: !!app.support.email },
    { label: "FAQ items (3+)", done: app.support.faq.length >= 3 },
    { label: "Screenshot headlines (3+)", done: app.marketing.screenshotHeadlines.length >= 3 },
    { label: "Screenshots uploaded", done: false },
  ];
  const completedCount = checklist.filter((c) => c.done).length;

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div>
          <div style={s.kicker}>Launch dashboard</div>
          <h2 style={s.title}>{app.appName}</h2>
          <p style={s.oneliner}>{app.oneLiner}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#888", fontWeight: 700 }}>{completedCount}/{checklist.length} ready</span>
        </div>
      </div>

      <div style={s.tabRow}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={tab === t.key ? s.tabActive : s.tab}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.body}>

        {tab === "store" && (
          <div>
            <div style={s.sectionTitle}>App Store listing</div>
            <p style={s.sectionSub}>All fields pre-filled from your interview. Edit anything. Click AI for a fresh rewrite.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="App Store title" value={app.marketing.appStoreTitle} onChange={(v) => updateMarketing("appStoreTitle", v)} max={30} aiLoading={aiLoading === "title"} onAi={async () => { const r = await aiRewrite("title", app.marketing.appStoreTitle, "app store title (max 30 chars)"); if (r) updateMarketing("appStoreTitle", r); }} onCopy={() => copyText(app.marketing.appStoreTitle, "title")} />
              <Field label="Subtitle" value={app.marketing.subtitle} onChange={(v) => updateMarketing("subtitle", v)} max={30} aiLoading={aiLoading === "subtitle"} onAi={async () => { const r = await aiRewrite("subtitle", app.marketing.subtitle, "app store subtitle (max 30 chars)"); if (r) updateMarketing("subtitle", r); }} onCopy={() => copyText(app.marketing.subtitle, "subtitle")} />
            </div>

            <Field label="Description" value={app.marketing.description} onChange={(v) => updateMarketing("description", v)} max={4000} multi aiLoading={aiLoading === "desc"} onAi={async () => { const r = await aiRewrite("desc", app.marketing.description, "app store description (max 4000 chars, benefit-driven)"); if (r) updateMarketing("description", r); }} onCopy={() => copyText(app.marketing.description, "description")} />

            <Field label="Keywords" value={app.marketing.keywords.join(", ")} onChange={(v) => setApp((p) => ({ ...p, marketing: { ...p.marketing, keywords: v.split(",").map((k) => k.trim()).filter(Boolean) } }))} hint="Comma-separated. Apple allows 100 chars total." onCopy={() => copyText(app.marketing.keywords.join(", "), "keywords")} />

            <div style={{ marginTop: 24 }}>
              <div style={s.sectionTitle}>Screenshot headlines</div>
              <p style={s.sectionSub}>These overlay your App Store screenshot mockups.</p>
              {app.marketing.screenshotHeadlines.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={s.num}>{i + 1}</span>
                  <input value={h} onChange={(e) => { const u = [...app.marketing.screenshotHeadlines]; u[i] = e.target.value; setApp((p) => ({ ...p, marketing: { ...p.marketing, screenshotHeadlines: u } })); }} style={s.input} />
                  <button onClick={() => copyText(h, `headline ${i + 1}`)} style={s.iconBtn} title="Copy">C</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "pages" && (
          <div>
            <div style={s.sectionTitle}>Hosted pages</div>
            <p style={s.sectionSub}>Live and ready to paste into App Store Connect and Google Play Console.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { title: "Privacy policy", path: pages.privacy, desc: "Required by Apple and Google. Your data practices and contact info." },
                { title: "Support page", path: pages.support, desc: "Required support URL. Includes email, FAQ, and contact guidance." },
                { title: "About page", path: pages.about, desc: "Your app story, features, and founder voice." },
              ].map((pg) => (
                <div key={pg.title} style={s.pageCard}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{pg.title}</div>
                  <p style={{ color: "#888", fontSize: 13, lineHeight: 1.5, margin: "0 0 10px" }}>{pg.desc}</p>
                  <div style={s.urlBox}>{baseUrl}{pg.path}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => copyText(`${baseUrl}${pg.path}`, pg.title)} style={s.smallBtn}>Copy URL</button>
                    <button onClick={() => window.open(pg.path, "_blank")} style={s.smallGhost}>Open preview</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={s.infoBox}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Where to paste these URLs</div>
              <div style={{ fontSize: 14, color: "#ccc", marginBottom: 4 }}><strong>Apple App Store Connect:</strong> <span style={{ color: "#888" }}>App Information → Privacy Policy URL and Support URL</span></div>
              <div style={{ fontSize: 14, color: "#ccc" }}><strong>Google Play Console:</strong> <span style={{ color: "#888" }}>Store Listing → Contact details → Privacy policy URL</span></div>
            </div>
          </div>
        )}

        {tab === "screenshots" && (
          <div>
            <div style={s.sectionTitle}>Screenshot studio</div>
            <p style={s.sectionSub}>Upload your app screenshots. We crop to required sizes and overlay your marketing headlines.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { name: 'iPhone 6.7"', size: "1290 x 2796 px", note: "Required" },
                { name: 'iPhone 6.5"', size: "1242 x 2688 px", note: "Fallback" },
                { name: 'iPad 12.9"', size: "2048 x 2732 px", note: "Recommended" },
              ].map((sz) => (
                <div key={sz.name} style={s.sizeCard}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sz.name}</div>
                  <div style={{ color: "#888", fontSize: 13 }}>{sz.size}</div>
                  <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>{sz.note}</div>
                </div>
              ))}
            </div>
            <div style={s.uploadZone}>
              <div style={{ fontSize: 28, color: "#333", marginBottom: 8 }}>+</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Drop screenshots here or click to upload</div>
              <div style={{ color: "#888", fontSize: 13 }}>PNG or JPEG. We resize and add headline overlays.</div>
              <div style={{ color: "#555", fontSize: 12, marginTop: 8 }}>Coming soon — screenshot processing with AI marketing overlays</div>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Your headline overlays</div>
              {app.marketing.screenshotHeadlines.map((h, i) => (
                <div key={i} style={{ color: "#ccc", fontSize: 14, marginBottom: 4 }}>Screenshot {i + 1}: "{h}"</div>
              ))}
            </div>
          </div>
        )}

        {tab === "checklist" && (
          <div>
            <div style={s.sectionTitle}>Submission checklist</div>
            <p style={s.sectionSub}>{completedCount} of {checklist.length} items ready.</p>
            <div style={{ display: "grid", gap: 8 }}>
              {checklist.map((item, i) => (
                <div key={i} style={s.checkRow}>
                  <div style={{ ...s.checkBox, background: item.done ? "rgba(29,158,117,0.15)" : "rgba(136,135,128,0.08)", borderColor: item.done ? "rgba(29,158,117,0.4)" : "rgba(136,135,128,0.2)" }}>
                    {item.done ? "✓" : ""}
                  </div>
                  <span style={{ color: item.done ? "#aaa" : "#ddd", textDecoration: item.done ? "line-through" : "none", fontSize: 14 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "export" && (
          <div>
            <div style={s.sectionTitle}>Export and next steps</div>
            <p style={s.sectionSub}>Everything's generated. Here's how to move forward.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={s.exportCard}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Download everything</div>
                <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>Get your complete launch package as JSON — App Store copy, pages data, and submission checklist.</p>
                <button onClick={() => { const b = new Blob([JSON.stringify(app, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `${app.slug}-launch-package.json`; a.click(); URL.revokeObjectURL(u); }} style={s.exportBtn}>Download launch package</button>
              </div>
              <div style={s.exportCard}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>We submit for you</div>
                <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>Our team handles the full submission — certificates, upload, metadata, review notes, and resubmission if rejected.</p>
                <button style={s.premiumBtn}>Get submission help — $97</button>
              </div>
            </div>
            <div style={s.infoBox}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>DIY submission steps</div>
              {["Log into App Store Connect with your Apple Developer account", "Create a new app and paste your title, subtitle, and description", "Set Privacy Policy URL and Support URL to your hosted pages", "Upload screenshots (use the sizes from the Screenshots tab)", "Upload your build via Xcode or Transporter, then submit for review"].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, fontSize: 14, color: "#ccc" }}>
                  <span style={s.num}>{i + 1}</span><span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {copyFeedback && <div style={s.toast}>Copied {copyFeedback}</div>}
    </div>
  );
}

function Field({ label, value, onChange, max, multi, hint, aiLoading, onAi, onCopy }: {
  label: string; value: string; onChange: (v: string) => void; max?: number; multi?: boolean; hint?: string; aiLoading?: boolean; onAi?: () => void; onCopy?: () => void;
}) {
  const over = max && value.length > max;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#aaa" }}>{label}</label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {max && <span style={{ fontSize: 12, color: over ? "#E24B4A" : "#666", fontWeight: over ? 700 : 400 }}>{value.length}/{max}</span>}
          {onCopy && <button onClick={onCopy} style={s.iconBtn} title="Copy">C</button>}
          {onAi && <button onClick={onAi} disabled={aiLoading} style={{ ...s.aiBtn, opacity: aiLoading ? 0.5 : 1 }} title="AI rewrite">{aiLoading ? "..." : "AI"}</button>}
        </div>
      </div>
      {hint && <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>{hint}</div>}
      {multi ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={6} style={{ ...s.input, resize: "vertical" as const, lineHeight: 1.6 }} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} style={s.input} />}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { marginTop: 28, borderRadius: 20, border: "1px solid #1a1a1a", background: "#080808", overflow: "hidden" },
  header: { padding: "24px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, borderBottom: "1px solid #151515" },
  kicker: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#1d9e75", marginBottom: 4 },
  title: { fontSize: 24, margin: 0, fontWeight: 900 },
  oneliner: { color: "#888", fontSize: 15, margin: "4px 0 0" },
  tabRow: { display: "flex", gap: 0, borderBottom: "1px solid #151515", overflowX: "auto" },
  tab: { padding: "12px 20px", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#666", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  tabActive: { padding: "12px 20px", background: "none", border: "none", borderBottom: "2px solid #fff", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  body: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 800, marginBottom: 4 },
  sectionSub: { color: "#888", fontSize: 14, lineHeight: 1.5, margin: "0 0 20px" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#0c0c0c", color: "#fff", fontSize: 15 },
  iconBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid #2a2a2a", background: "#141414", color: "#888", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  aiBtn: { padding: "4px 10px", borderRadius: 8, border: "1px solid #2d2240", background: "rgba(127,119,221,0.08)", color: "#AFA9EC", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  num: { width: 24, height: 24, borderRadius: "50%", border: "1px solid #2a2a2a", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#666", flexShrink: 0 },
  pageCard: { padding: 18, borderRadius: 14, border: "1px solid #1e1e1e", background: "#0c0c0c" },
  urlBox: { padding: "8px 12px", borderRadius: 8, background: "#0a0a0a", border: "1px solid #1e1e1e", fontSize: 13, color: "#aaa", wordBreak: "break-all" },
  smallBtn: { padding: "6px 14px", borderRadius: 8, border: "1px solid #333", background: "#fff", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  smallGhost: { padding: "6px 14px", borderRadius: 8, border: "1px solid #2a2a2a", background: "transparent", color: "#aaa", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  infoBox: { padding: 18, borderRadius: 14, border: "1px solid #1e1e1e", background: "#0a0a0a" },
  sizeCard: { padding: 14, borderRadius: 12, border: "1px solid #1e1e1e", background: "#0c0c0c" },
  uploadZone: { padding: 40, borderRadius: 14, border: "2px dashed #2a2a2a", textAlign: "center", cursor: "pointer", color: "#aaa" },
  checkRow: { display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, border: "1px solid #1e1e1e", background: "#0a0a0a" },
  checkBox: { width: 22, height: 22, borderRadius: 6, border: "1px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#1d9e75", flexShrink: 0 },
  exportCard: { padding: 20, borderRadius: 14, border: "1px solid #1e1e1e", background: "#0c0c0c" },
  exportBtn: { padding: "10px 20px", borderRadius: 10, border: "1px solid #333", background: "#fff", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 14 },
  premiumBtn: { padding: "10px 20px", borderRadius: 10, border: "1px solid #2d2240", background: "rgba(127,119,221,0.1)", color: "#AFA9EC", fontWeight: 800, cursor: "pointer", fontSize: 14 },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 10, background: "#1d9e75", color: "#fff", fontWeight: 700, fontSize: 13, zIndex: 999 },
};
