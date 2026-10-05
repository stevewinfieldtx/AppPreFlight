// /components/ScreenshotStudio.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import CaptureGuide from "./CaptureGuide";
import IphoneSimulator from "./IphoneSimulator";
import { readDraft, writeDraft } from "@/lib/screenshotDraft";
import {
  DEVICES,
  DEVICE_ORDER,
  THEMES,
  LAYOUTS,
  loadImage,
  renderShot,
  canvasToBlob,
  shotFileName,
  type DeviceKey,
  type ThemeKey,
  type LayoutKey,
  type Shot,
} from "@/lib/screenshots";

const MAX_SHOTS = 10;

export default function ScreenshotStudio({
  slug,
  headlines,
  onHeadlinesChange,
  onCountChange,
  onExportChange,
  active = true,
}: {
  slug: string;
  headlines: string[];
  onHeadlinesChange: (next: string[]) => void;
  onCountChange: (count: number) => void;
  onExportChange?: (ready: boolean) => void;
  active?: boolean;
}) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [theme, setTheme] = useState<ThemeKey>("midnight");
  const [layout, setLayout] = useState<LayoutKey>("top");
  const [preview, setPreview] = useState<DeviceKey>("iphone67");
  const [exportDevices, setExportDevices] = useState<DeviceKey[]>(["iphone67"]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fit, setFit] = useState<"contain" | "cover">("contain");
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading local draft…");
  const importing = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onCountChange(shots.length);
  }, [shots.length, onCountChange]);

  useEffect(() => {
    let cancelled = false;
    readDraft(slug).then(async draft => {
      if (!draft) return;
      const restored = await Promise.all(draft.shots.map(async sh => ({ ...sh, image: await loadImage(sh.file) })));
      if (cancelled) return;
      setShots(restored); setTheme(draft.theme); setLayout(draft.layout); setFit(draft.fit);
      setExportDevices(draft.devices); setPreview(draft.devices[0] ?? "iphone67");
    }).catch(() => { if (!cancelled) setError("Could not restore the local screenshot draft. You can upload images again."); })
      .finally(() => { if (!cancelled) { setReady(true); setSaveStatus("Draft stays in this browser"); } });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    onExportChange?.(false);
    if (!ready) return;
    const timer = setTimeout(() => {
      writeDraft(slug, { shots: shots.map(({image, ...sh}) => ({...sh, file: image.src})), theme, layout, fit, devices: exportDevices })
        .then(() => setSaveStatus("Saved on this device"))
        .catch(() => setSaveStatus("Local saving unavailable — download your ZIP before leaving"));
    }, 350);
    return () => clearTimeout(timer);
  }, [slug, shots, theme, layout, fit, exportDevices, ready, onExportChange]);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      if (importing.current || !ready) return false;
      const list = Array.from(files);
      if (!list.length) {
        setError("Those files aren't PNG, JPEG, or WebP images.");
        return false;
      }
      if (shots.length + list.length > MAX_SHOTS) { setError("Apple accepts up to 10 screenshots per display size. Remove a shot before adding more."); return false; }
      if (list.some(f => !/^image\/(png|jpeg|jpg|webp)$/.test(f.type) || f.size > 20 * 1024 * 1024)) { setError("Use PNG, JPEG, or WebP files, each under 20 MB."); return false; }
      setError(null);
      setBusy("Reading images");
      importing.current = true;
      try {
        const loaded: Shot[] = [];
        for (const file of list) {
          const image = await loadImage(file);
          loaded.push({
            id: crypto.randomUUID(),
            name: file.name,
            image,
            headline: "",
            subhead: "",
          });
        }
        setShots((prev) => {
          const next = [...prev, ...loaded];
          // Give each new shot the matching generated headline, by position.
          return next.map((sh, i) => (sh.headline ? sh : { ...sh, headline: headlines[i] ?? "" }));
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read those images.");
        return false;
      } finally {
        importing.current = false;
        setBusy(null);
      }
    },
    [headlines, shots.length, ready]
  );

  function updateShot(id: string, patch: Partial<Shot>) {
    const next = shots.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh));
    setShots(next);
    if (patch.headline !== undefined) onHeadlinesChange(next.map((sh) => sh.headline));
  }

  function move(id: string, dir: -1 | 1) {
      const i = shots.findIndex((sh) => sh.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= shots.length) return;
      const next = [...shots];
      [next[i], next[j]] = [next[j], next[i]];
      onHeadlinesChange(next.map((sh) => sh.headline));
      setShots(next);
  }

  function remove(id: string) {
      const next = shots.filter((sh) => sh.id !== id);
      onHeadlinesChange(next.map((sh) => sh.headline));
      setShots(next);
  }

  function toggleExportDevice(key: DeviceKey) {
    setExportDevices((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function downloadOne(shot: Shot) {
    try {
    const canvas = renderShot({ image: shot.image, device: preview, theme, layout, fit, headline: shot.headline, subhead: shot.subhead });
    const blob = await canvasToBlob(canvas);
    triggerDownload(blob, `${slug}-${preview}-${shot.name.replace(/\.[^.]+$/, "")}.png`);
    } catch (e) { setError(e instanceof Error ? e.message : "Export failed."); }
  }

  async function downloadZip() {
    if (!shots.length || !exportDevices.length) return;
    setError(null);
    const total = shots.length * exportDevices.length;
    let done = 0;
    setBusy(`Rendering 0/${total}`);
    try {
      const zip = new JSZip();
      for (const device of exportDevices) {
        for (let i = 0; i < shots.length; i++) {
          const shot = shots[i];
          const canvas = renderShot({ image: shot.image, device, theme, layout, fit, headline: shot.headline, subhead: shot.subhead });
          const blob = await canvasToBlob(canvas);
          zip.file(shotFileName(slug, device, i), blob);
          done++;
          setBusy(`Rendering ${done}/${total}`);
          // Yield so the progress label actually paints.
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      zip.file(
        `${slug}/README.txt`,
        [
          `App Store screenshots for ${slug}`,
          `Review every image before uploading. Use real captures from each supported device family.`,
          `iPad apps require iPad screenshots. Resizing an iPhone image is not an iPad capture.`,
          `Specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/`,
          ...shots.map((sh, i) => `${i + 1}. ${sh.name}: ${sh.headline} — ${sh.subhead}`),
          ``,
          `One folder per device size. Upload the matching folder to the matching`,
          `display size in App Store Connect: Media Manager, then drag the files in`,
          `in numbered order.`,
          ``,
          ...exportDevices.map((d) => `  ${d}  ->  ${DEVICES[d].label}  ${DEVICES[d].w} x ${DEVICES[d].h} px`),
        ].join("\n")
      );
      const out = await zip.generateAsync({ type: "blob" });
      triggerDownload(out, `${slug}-screenshots.zip`);
      onExportChange?.(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div style={s.sectionTitle}>Screenshot studio</div>
      <p style={s.sectionSub}>
        Upload real screenshots, add benefit-led labels, choose a visual style, and export full-resolution App Store PNGs. Your app content is preserved by default.
      </p>

      <IphoneSimulator slug={slug} active={active} captureDisabled={!!busy || !ready || shots.length >= MAX_SHOTS} onCapture={file => addFiles([file])} />
      <CaptureGuide headlines={headlines} />
      <p style={{ color: "#8fb9a8", fontSize: 13 }} role="status">{saveStatus}</p>
      <button
        type="button" disabled={!!busy || !ready}
        style={{ ...s.uploadZone, width: "100%", borderColor: dragging ? "#1d9e75" : "#2a2a2a", background: dragging ? "rgba(29,158,117,0.06)" : "transparent" }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      >
        <div style={{ fontSize: 28, color: "#333", marginBottom: 8 }}>+</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Drop screenshots here or click to upload</div>
        <div style={{ color: "#888", fontSize: 13 }}>PNG, JPEG, or WebP · up to 10 images · 20 MB each</div>
      </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
        />

      {error && <div role="alert" style={s.error}>{error}</div>}

      {shots.length > 0 && (
        <>
          <div style={s.controlBar}>
            <Control label="Style">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <button key={k} onClick={() => setTheme(k)} style={theme === k ? s.chipOn : s.chip}>
                  <span style={{ ...s.swatch, background: `linear-gradient(135deg, ${THEMES[k].from}, ${THEMES[k].to})` }} />
                  {THEMES[k].label}
                </button>
              ))}
            </Control>
            <Control label="Layout">
              {(Object.keys(LAYOUTS) as LayoutKey[]).map((k) => (
                <button key={k} onClick={() => setLayout(k)} style={layout === k ? s.chipOn : s.chip}>{LAYOUTS[k]}</button>
              ))}
            </Control>
            <Control label="Image fitting">
              <button onClick={() => setFit("contain")} style={fit === "contain" ? s.chipOn : s.chip}>Keep entire screen</button>
              <button onClick={() => setFit("cover")} style={fit === "cover" ? s.chipOn : s.chip}>Crop to fill</button>
              {layout === "full" && <span style={{ color: "#aaa", fontSize: 12 }}>Full bleed crops to fill and overlays the caption. Check your preview.</span>}
            </Control>
            <Control label="Previewing">
              {DEVICE_ORDER.map((k) => (
                <button key={k} onClick={() => setPreview(k)} style={preview === k ? s.chipOn : s.chip}>{DEVICES[k].label}</button>
              ))}
            </Control>
          </div>

          <div style={s.grid}>
            {shots.map((shot, i) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                index={i}
                total={shots.length}
                device={preview}
                theme={theme}
                layout={layout}
                fit={fit}
                onChange={(patch) => updateShot(shot.id, patch)}
                onMove={(d) => move(shot.id, d)}
                onRemove={() => remove(shot.id)}
                onDownload={() => downloadOne(shot)}
              />
            ))}
          </div>

          <div style={s.exportRow}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Export sizes</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DEVICE_ORDER.map((k) => (
                  <button key={k} onClick={() => toggleExportDevice(k)} style={exportDevices.includes(k) ? s.chipOn : s.chip}>
                    {exportDevices.includes(k) ? "✓ " : ""}{DEVICES[k].label}
                    <span style={{ color: "#666", marginLeft: 6, fontSize: 11 }}>{DEVICES[k].w}×{DEVICES[k].h}</span>
                  </button>
                ))}
              </div>
              <div style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
                {shots.length * exportDevices.length} PNG{shots.length * exportDevices.length === 1 ? "" : "s"} in the zip.
              </div>
            </div>
            <button onClick={downloadZip} disabled={!!busy || !exportDevices.length} style={{ ...s.exportBtn, opacity: busy || !exportDevices.length ? 0.5 : 1 }}>
              {busy ?? "Download screenshots (.zip)"}
            </button>
          </div>
        </>
      )}

      {shots.length === 0 && headlines.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Headlines waiting for a screenshot</div>
          {headlines.map((h, i) => (
            <div key={i} style={{ color: "#888", fontSize: 14, marginBottom: 4 }}>{i + 1}. {h}</div>
          ))}
          <div style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
            These get applied in order as you upload, and you can edit any of them per shot.
          </div>
        </div>
      )}
    </div>
  );
}

function ShotCard({
  shot, index, total, device, theme, layout, fit, onChange, onMove, onRemove, onDownload,
}: {
  fit: "contain" | "cover"; shot: Shot; index: number; total: number; device: DeviceKey; theme: ThemeKey; layout: LayoutKey;
  onChange: (patch: Partial<Shot>) => void; onMove: (d: -1 | 1) => void; onRemove: () => void; onDownload: () => void;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const canvas = renderShot({ image: shot.image, device, theme, layout, fit, headline: shot.headline, subhead: shot.subhead });
      const url = canvas.toDataURL("image/png");
      if (!cancelled) setSrc(url);
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [shot.image, shot.headline, shot.subhead, device, theme, layout, fit]);

  const dev = DEVICES[device];

  return (
    <div style={s.card}>
      <div style={{ ...s.previewWrap, aspectRatio: `${dev.w} / ${dev.h}` }}>
        {src ? <img src={src} alt={`Screenshot ${index + 1} preview`} style={s.previewImg} /> : <div style={s.previewIdle}>Rendering…</div>}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Shot {index + 1} of {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => onMove(-1)} disabled={index === 0} style={{ ...s.iconBtn, opacity: index === 0 ? 0.3 : 1 }} title="Move earlier">↑</button>
            <button onClick={() => onMove(1)} disabled={index === total - 1} style={{ ...s.iconBtn, opacity: index === total - 1 ? 0.3 : 1 }} title="Move later">↓</button>
            <button onClick={onDownload} style={s.iconBtn} title="Download this one">↓P</button>
            <button onClick={onRemove} style={{ ...s.iconBtn, color: "#E24B4A" }} title="Remove">×</button>
          </div>
        </div>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 8, overflowWrap: "anywhere" }}>{shot.name} · {shot.image.width}×{shot.image.height}{shot.image.width < dev.w ? " · Upscaled: check sharpness" : ""}</div>
        <input
          value={shot.headline}
          onChange={(e) => onChange({ headline: e.target.value })}
          aria-label={`Screenshot ${index + 1} headline`}
          maxLength={80}
          placeholder="Headline"
          style={{ ...s.input, fontWeight: 700, marginBottom: 6 }}
        />
        <input
          value={shot.subhead}
          onChange={(e) => onChange({ subhead: e.target.value })}
          aria-label={`Screenshot ${index + 1} supporting line`}
          maxLength={120}
          placeholder="Supporting line (optional)"
          style={{ ...s.input, fontSize: 13, color: "#aaa" }}
        />
      </div>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const s: Record<string, React.CSSProperties> = {
  sectionTitle: { fontSize: 18, fontWeight: 800, marginBottom: 4 },
  sectionSub: { color: "#888", fontSize: 14, lineHeight: 1.5, margin: "0 0 20px" },
  uploadZone: { padding: 40, borderRadius: 14, border: "2px dashed #2a2a2a", textAlign: "center", cursor: "pointer", color: "#aaa", transition: "border-color .15s, background .15s" },
  error: { marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(226,75,74,0.4)", background: "rgba(226,75,74,0.08)", color: "#E24B4A", fontSize: 13 },
  controlBar: { display: "flex", gap: 24, flexWrap: "wrap", margin: "22px 0 18px", padding: 16, borderRadius: 14, border: "1px solid #1e1e1e", background: "#0a0a0a" },
  chip: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, border: "1px solid #2a2a2a", background: "#0c0c0c", color: "#aaa", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  chipOn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, border: "1px solid #1d9e75", background: "rgba(29,158,117,0.12)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  swatch: { width: 12, height: 12, borderRadius: 4, display: "inline-block", border: "1px solid rgba(255,255,255,0.15)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  card: { borderRadius: 14, border: "1px solid #1e1e1e", background: "#0c0c0c", overflow: "hidden" },
  previewWrap: { width: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" },
  previewImg: { width: "100%", height: "100%", objectFit: "contain", display: "block" },
  previewIdle: { color: "#444", fontSize: 12 },
  input: { width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#0c0c0c", color: "#fff", fontSize: 14 },
  iconBtn: { minWidth: 26, height: 26, padding: "0 6px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#141414", color: "#888", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  exportRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginTop: 22, padding: 18, borderRadius: 14, border: "1px solid #1e1e1e", background: "#0a0a0a" },
  exportBtn: { padding: "12px 22px", borderRadius: 10, border: "1px solid #333", background: "#fff", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 14 },
};
