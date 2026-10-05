"use client";
import { useEffect, useId, useRef, useState } from "react";
import { IPHONES, loadSimulatorSDK, parseBuildId, screenshotFile, withTimeout, type IphoneModel, type SimulatorClient, type SimulatorSession } from "@/lib/iphoneSimulator";

export default function IphoneSimulator({ slug, active, captureDisabled, onCapture }: {
  slug: string; active: boolean; captureDisabled: boolean; onCapture: (file: File) => Promise<boolean>;
}) {
  const id = `iphone-${useId().replace(/:/g, "").replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [build, setBuild] = useState("");
  const [model, setModel] = useState<IphoneModel>("iphone15promax");
  const [status, setStatus] = useState("Connect your app to get started");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);
  const client = useRef<SimulatorClient | null>(null);
  const session = useRef<SimulatorSession | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);

  useEffect(() => {
    try { const saved = localStorage.getItem(`apppreflight:iphone:${slug}`); if (saved) setBuild(saved); } catch { /* optional local setting */ }
  }, [slug]);

  useEffect(() => {
    function release() {
      generation.current++; session.current = null;
      const old = client.current; client.current = null;
      void old?.endSession().catch(() => {});
    }
    window.addEventListener("pagehide", release);
    return () => { window.removeEventListener("pagehide", release); release(); };
  }, []);

  useEffect(() => {
    if (!active) {
      generation.current++; session.current = null;
      const old = client.current; client.current = null;
      void old?.endSession().catch(() => {});
      setConnected(false); setRunning(false); setBusy(false); locked.current = false;
      setFrameVersion(v => v + 1); setStatus("Session stopped — reconnect to continue");
    }
  }, [active]);

  async function connect() {
    if (locked.current) return;
    let buildId: string;
    try { buildId = parseBuildId(build); } catch (e) { setError(message(e)); return; }
    locked.current = true; setBusy(true); setError(""); setStatus("Connecting to hosted iPhone…");
    const run = ++generation.current;
    try {
      const sdk = await loadSimulatorSDK();
      if (run !== generation.current) return;
      const next = await withTimeout(sdk.getClient(`#${id}`, { buildId, device: model, platform: "ios", scale: "auto", screenOnly: true, orientation: "portrait", autoPlay: false }), 30000, "Connection timed out. Check your Appetize app access and try again.");
      if (run !== generation.current) { void next.endSession().catch(() => {}); return; }
      client.current = next;
      next.on("error", data => { if (run === generation.current) setError(eventMessage(data)); });
      next.on("queue", () => { if (run === generation.current) setStatus("Waiting for an available iPhone…"); });
      next.on("session", data => { void acceptSession(data as SimulatorSession, run); });
      next.on("sessionEnded", () => { if (run === generation.current) { session.current = null; setRunning(false); setStatus("Session ended — start again to continue"); } });
      next.on("sessionError", data => { if (run === generation.current) { session.current = null; setRunning(false); setError(eventMessage(data)); } });
      setConnected(true); setStatus("Connected — start the iPhone to use your app");
      try { localStorage.setItem(`apppreflight:iphone:${slug}`, buildId); } catch { /* optional */ }
    } catch (e) {
      if (run === generation.current) { setError(message(e)); setStatus("Connection failed — try again or upload captures below"); setFrameVersion(v => v + 1); }
    } finally { if (run === generation.current) { locked.current = false; setBusy(false); } }
  }

  async function acceptSession(next: SimulatorSession, run: number) {
    if (run !== generation.current) return;
    setStatus("Starting iPhone…");
    try {
      await withTimeout(next.waitUntilReady(), 90000, "The iPhone did not become ready. Stop the session and try again.");
      if (run !== generation.current) return;
      session.current = next; setRunning(true); setStatus("iPhone running — navigate to a screen, then capture it");
    } catch (e) { if (run === generation.current) { setError(message(e)); setRunning(false); } }
  }

  async function start() {
    if (!client.current || locked.current) return;
    locked.current = true; setBusy(true); setError(""); setStatus("Starting iPhone…");
    const run = generation.current;
    try { const next = await withTimeout(client.current.startSession(), 90000, "Session startup timed out. Stop and try again."); await acceptSession(next, run); }
    catch (e) { if (run === generation.current) setError(message(e)); }
    finally { if (run === generation.current) { locked.current = false; setBusy(false); } }
  }

  async function stop() {
    generation.current++; session.current = null;
    const old = client.current; client.current = null;
    setConnected(false); setRunning(false); setBusy(true); locked.current = true; setError("");
    try { if (old) await withTimeout(old.endSession(), 15000, "Could not confirm the hosted session ended. Check your Appetize dashboard."); setStatus("Session stopped — captured screens remain in your studio"); }
    catch (e) { setError(message(e)); }
    finally { setFrameVersion(v => v + 1); locked.current = false; setBusy(false); }
  }

  async function capture() {
    if (!session.current || locked.current || captureDisabled) return;
    const run = generation.current;
    locked.current = true; setBusy(true); setError("");
    try {
      const shot = await withTimeout(session.current.screenshot("base64"), 20000, "Screenshot timed out. Wait for the screen to finish loading and try again.");
      if (run !== generation.current) return;
      const added = await onCapture(screenshotFile(shot.data, shot.mimeType));
      setStatus(added ? "Screenshot added below — edit its headline and choose a style" : "Screenshot could not be added. Check the studio message below.");
    } catch (e) { if (run === generation.current) setError(message(e)); }
    finally { if (run === generation.current) { locked.current = false; setBusy(false); } }
  }

  return <section aria-label="iPhone simulator" style={s.panel}>
    <h3 style={{ margin: "0 0 8px" }}>Capture from an iPhone simulator</h3>
    <p style={s.text}>Run your uploaded iOS app in a hosted iPhone, tap through its screens, and capture them directly into this studio.</p>
    <details style={{ marginBottom: 18 }}><summary style={{ cursor: "pointer", fontWeight: 700 }}>Set up your iPhone app</summary>
      <ol style={{ ...s.text, paddingLeft: 22 }}>
        <li>Create an <a href="https://appetize.io" target="_blank" rel="noreferrer" style={s.link}>Appetize account</a> and upload an iOS Simulator build containing your <code>.app</code> bundle. A TestFlight or App Store <code>.ipa</code> will not run here.</li>
        <li>For Xcode apps, build for an iPhone Simulator on a Mac and compress the built <code>.app</code> for upload. For Expo, add a standalone simulator profile to <code>eas.json</code> and build it in EAS cloud from Windows:</li>
      </ol>
      <pre style={s.code}>{'{ "build": { "store-screenshots": { "ios": { "simulator": true } } } }\n\neas build --platform ios --profile store-screenshots'}</pre>
      <p style={s.text}>Merge the profile into your existing build settings. Use a self-contained build with its JavaScript bundled; development builds that need a local Metro server need additional setup.</p>
      <p style={s.text}>Upload the simulator archive to Appetize, then paste its app link or build ID below. Your build is hosted by Appetize; this connection uses its app sharing permissions.</p>
      <p style={s.text}><a href="https://docs.appetize.io/platform/app-management/uploading-apps/ios" target="_blank" rel="noreferrer" style={s.link}>Appetize upload guide</a> · <a href="https://docs.expo.dev/eas/json/" target="_blank" rel="noreferrer" style={s.link}>Expo simulator build settings</a></p>
    </details>
    <label htmlFor={`${id}-build`} style={s.label}>Appetize app link or build ID</label>
    <input id={`${id}-build`} value={build} disabled={connected || busy} onChange={e => setBuild(e.target.value)} placeholder="https://appetize.io/app/your-build-id" style={s.input} autoComplete="off" spellCheck={false} />
    <label htmlFor={`${id}-model`} style={s.label}>iPhone model</label>
    <select id={`${id}-model`} value={model} disabled={connected || busy} onChange={e => setModel(e.target.value as IphoneModel)} style={s.input}>
      {Object.entries(IPHONES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
    <p style={{ ...s.text, fontSize: 12 }}>Hosted sessions use your Appetize allowance and may incur charges under your plan. Start when ready and stop when finished. Returning to another dashboard tab stops the session.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {!connected && <button disabled={busy || !active} onClick={connect} style={s.button}>{busy ? "Connecting…" : "Connect iPhone app"}</button>}
      {connected && !running && <button disabled={busy} onClick={start} style={s.button}>{busy ? "Starting…" : "Start iPhone"}</button>}
      <button disabled={!running || busy || captureDisabled} onClick={capture} style={{ ...s.button, opacity: !running || busy || captureDisabled ? 0.45 : 1, cursor: !running || busy || captureDisabled ? "not-allowed" : "pointer" }}>Capture screen into studio</button>
      {(connected || busy) && <button onClick={stop} style={s.button}>Stop / disconnect</button>}
    </div>
    <p role="status" style={s.text}>{status}</p>
    {error && <p role="alert" style={{ color: "#ff9393", fontSize: 14 }}>{error}</p>}
    <iframe key={frameVersion} id={id} title="Hosted iPhone simulator" allow="clipboard-write" style={{ display: connected ? "block" : "none", width: "100%", maxWidth: 420, height: 760, maxHeight: "80vh", margin: "16px auto 0", border: 0, borderRadius: 18, background: "#050505" }} />
  </section>;
}
function message(e: unknown) { return e instanceof Error ? e.message : "The simulator could not complete that action. Try again or upload screenshots manually."; }
function eventMessage(e: unknown) { return e && typeof e === "object" && "message" in e ? String(e.message) : "The hosted simulator reported an error. Check your app access and account allowance."; }
const s: Record<string, React.CSSProperties> = {
  panel: { padding: 20, borderRadius: 14, border: "1px solid #294438", background: "#0c1913", marginBottom: 20 },
  text: { color: "#b6c8be", fontSize: 14, lineHeight: 1.6 },
  label: { display: "block", fontSize: 13, fontWeight: 700, margin: "14px 0 6px" },
  input: { width: "100%", boxSizing: "border-box", background: "#080d0a", color: "#fff", border: "1px solid #345345", borderRadius: 8, padding: 12, fontSize: 14 },
  button: { padding: "10px 14px", background: "#153d2b", color: "#fff", border: "1px solid #426e58", borderRadius: 8, cursor: "pointer", fontWeight: 700 },
  link: { color: "#76dab5" },
  code: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: 12, background: "#080d0a", borderRadius: 8, fontSize: 12, lineHeight: 1.6 },
};
