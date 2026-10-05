// /lib/screenshots.ts
// Client-side screenshot compositing for the App Store. No server, no image
// dependency: everything is drawn on a canvas in the browser.

export type DeviceKey = "iphone67" | "iphone65" | "ipad129";

export const DEVICES: Record<
  DeviceKey,
  { label: string; w: number; h: number; note: string; corner: number }
> = {
  iphone67: { label: 'iPhone 6.9"', w: 1290, h: 2796, note: "Primary iPhone set", corner: 0.09 },
  iphone65: { label: 'iPhone 6.5"', w: 1242, h: 2688, note: "Fallback", corner: 0.085 },
  ipad129: { label: 'iPad 13"', w: 2048, h: 2732, note: "Required for iPad apps", corner: 0.035 },
};

export const DEVICE_ORDER: DeviceKey[] = ["iphone67", "iphone65", "ipad129"];

export type ThemeKey = "midnight" | "mint" | "sunset" | "paper" | "ink";

export const THEMES: Record<
  ThemeKey,
  { label: string; from: string; to: string; text: string; sub: string; frame: string }
> = {
  midnight: { label: "Midnight", from: "#0b0b0f", to: "#1b1b2e", text: "#ffffff", sub: "#9d9db5", frame: "#2a2a3a" },
  mint: { label: "Mint", from: "#0d3b30", to: "#1d9e75", text: "#ffffff", sub: "#c8ebdd", frame: "#0a2f26" },
  sunset: { label: "Sunset", from: "#3a1039", to: "#e2624b", text: "#ffffff", sub: "#ffd9cd", frame: "#421a3c" },
  paper: { label: "Paper", from: "#f5f3ee", to: "#dcd7cc", text: "#141414", sub: "#5c574c", frame: "#c3bcae" },
  ink: { label: "Ink", from: "#101418", to: "#2b3947", text: "#ffffff", sub: "#a9bccd", frame: "#1d2731" },
};

export type LayoutKey = "top" | "bottom" | "full";

export const LAYOUTS: Record<LayoutKey, string> = {
  top: "Headline above",
  bottom: "Headline below",
  full: "Full bleed",
};

export type Shot = {
  id: string;
  name: string;
  image: HTMLImageElement;
  headline: string;
  subhead: string;
};

export type RenderOpts = {
  image: HTMLImageElement;
  device: DeviceKey;
  theme: ThemeKey;
  layout: LayoutKey;
  headline: string;
  subhead?: string;
  fit?: "contain" | "cover";
};

/** Load a File into an <img> we can draw from. */
export function loadImage(file: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof file === "string") { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("Could not restore image")); img.src = file; return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
    const url = String(reader.result);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}`));
    };
    img.src = url;
    };
    reader.readAsDataURL(file);
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/** Split text into lines that fit maxWidth at the current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${line} ${words[i]}`;
    if (ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = words[i];
    } else {
      line = next;
    }
  }
  lines.push(line);
  return lines;
}

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

/**
 * Draw the source image into the target box using cover-fit: fill the box
 * completely, cropping the overflow evenly. Anchored slightly high so app
 * headers survive the crop.
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) * 0.35;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Render one finished App Store screenshot at full device resolution. */
export function renderShot(opts: RenderOpts): HTMLCanvasElement {
  const dev = DEVICES[opts.device];
  const th = THEMES[opts.theme];
  const canvas = document.createElement("canvas");
  canvas.width = dev.w;
  canvas.height = dev.h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return canvas;

  const W = dev.w;
  const H = dev.h;

  // Background
  const grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
  grad.addColorStop(0, th.from);
  grad.addColorStop(1, th.to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const sidePad = W * 0.08;
  const maxText = W - sidePad * 2;
  const headSize = Math.round(W * 0.068);
  const subSize = Math.round(W * 0.036);
  const lineGap = headSize * 1.18;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.font = `800 ${headSize}px ${FONT}`;
  const headLines = wrap(ctx, opts.headline || "", maxText);
  ctx.font = `500 ${subSize}px ${FONT}`;
  const subLines = opts.subhead ? wrap(ctx, opts.subhead, maxText) : [];

  const textBlockH =
    headLines.length * lineGap + (subLines.length ? subLines.length * subSize * 1.35 + subSize * 0.6 : 0);

  function paintText(topY: number, onScrim: boolean) {
    let y = topY;
    ctx!.fillStyle = onScrim ? "#ffffff" : th.text;
    ctx!.font = `800 ${headSize}px ${FONT}`;
    for (const line of headLines) {
      ctx!.fillText(line, W / 2, y);
      y += lineGap;
    }
    if (subLines.length) {
      y += subSize * 0.6;
      ctx!.fillStyle = onScrim ? "rgba(255,255,255,0.82)" : th.sub;
      ctx!.font = `500 ${subSize}px ${FONT}`;
      for (const line of subLines) {
        ctx!.fillText(line, W / 2, y);
        y += subSize * 1.35;
      }
    }
  }

  function paintDevice(boxY: number, boxH: number) {
    const frameW = W * 0.78;
    const frameH = boxH;
    const frameX = (W - frameW) / 2;
    const frameY = boxY;
    const corner = frameW * dev.corner;
    const bezel = W * 0.011;

    // Drop shadow
    ctx!.save();
    ctx!.shadowColor = "rgba(0,0,0,0.45)";
    ctx!.shadowBlur = W * 0.05;
    ctx!.shadowOffsetY = W * 0.018;
    ctx!.fillStyle = th.frame;
    roundedRect(ctx!, frameX, frameY, frameW, frameH, corner);
    ctx!.fill();
    ctx!.restore();

    // Screen
    const sx = frameX + bezel;
    const sy = frameY + bezel;
    const sw = frameW - bezel * 2;
    const sh = frameH - bezel * 2;
    ctx!.save();
    roundedRect(ctx!, sx, sy, sw, sh, Math.max(corner - bezel, 2));
    ctx!.clip();
    ctx!.fillStyle = "#000";
    ctx!.fillRect(sx, sy, sw, sh);
    if (opts.fit === "cover") drawCover(ctx!, opts.image, sx, sy, sw, sh);
    else {
      const scale = Math.min(sw / opts.image.width, sh / opts.image.height);
      const dw = opts.image.width * scale, dh = opts.image.height * scale;
      ctx!.drawImage(opts.image, sx + (sw - dw) / 2, sy + (sh - dh) / 2, dw, dh);
    }
    ctx!.restore();

    // Bezel highlight
    ctx!.strokeStyle = "rgba(255,255,255,0.10)";
    ctx!.lineWidth = Math.max(W * 0.002, 1);
    roundedRect(ctx!, frameX, frameY, frameW, frameH, corner);
    ctx!.stroke();
  }

  if (opts.layout === "full") {
    // Screenshot fills the canvas, headline sits on a scrim at the bottom.
    drawCover(ctx, opts.image, 0, 0, W, H);
    const scrimH = Math.max(textBlockH + H * 0.12, H * 0.28);
    const scrim = ctx.createLinearGradient(0, H - scrimH, 0, H);
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(0.45, "rgba(0,0,0,0.72)");
    scrim.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, H - scrimH, W, scrimH);
    paintText(H - textBlockH - H * 0.07, true);
  } else if (opts.layout === "bottom") {
    const topPad = H * 0.05;
    const bottomPad = H * 0.055;
    const deviceH = H - textBlockH - topPad - bottomPad - H * 0.045;
    paintDevice(topPad, deviceH);
    paintText(topPad + deviceH + H * 0.045, false);
  } else {
    const topPad = H * 0.065;
    const bottomPad = H * 0.05;
    paintText(topPad, false);
    const deviceY = topPad + textBlockH + H * 0.045;
    paintDevice(deviceY, H - deviceY - bottomPad);
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), "image/png");
  });
}

/** File name App Store Connect uploads sort cleanly. */
export function shotFileName(slug: string, device: DeviceKey, index: number) {
  return `${slug}/${device}/${String(index + 1).padStart(2, "0")}-${DEVICES[device].w}x${DEVICES[device].h}.png`;
}
