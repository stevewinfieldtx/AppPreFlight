// Appetize browser SDK: https://docs.appetize.io/javascript-sdk
export const IPHONES = {
  iphone15promax: "iPhone 15 Pro Max",
  iphone16promax: "iPhone 16 Pro Max",
  iphone17promax: "iPhone 17 Pro Max",
} as const;
export type IphoneModel = keyof typeof IPHONES;
export type SimulatorSession = {
  screenshot(format: "base64"): Promise<{ data: string; mimeType: string }>;
  waitUntilReady(): Promise<void>;
};
export type SimulatorClient = {
  startSession(): Promise<SimulatorSession>;
  endSession(): Promise<void>;
  on(event: string, listener: (data: unknown) => void): void;
};
type SDK = { getClient(selector: string, config: Record<string, unknown>): Promise<SimulatorClient> };
declare global { interface Window { appetize?: SDK } }

/** Accept only an Appetize build ID or its normal app/embed link. Never API tokens. */
export function parseBuildId(input: string): string {
  let id = input.trim();
  if (/^https?:/i.test(id)) {
    const url = new URL(id);
    if (url.protocol !== "https:" || url.hostname !== "appetize.io" || url.username || url.password || url.search || url.hash) {
      throw new Error("Use a plain https://appetize.io/app/… link without passwords or query parameters, or paste the build ID.");
    }
    const match = url.pathname.match(/^\/(?:app|embed)\/([a-zA-Z0-9_-]+)\/?$/);
    if (!match) throw new Error("Use the Appetize app link or build ID shown after uploading your iOS build.");
    id = match[1];
  }
  if (!/^[a-zA-Z0-9_-]{6,100}$/.test(id) || /^(sk-|sk_|token|api[_-]?key)/i.test(id)) {
    throw new Error("Enter an Appetize build ID or app link. Do not enter an API key.");
  }
  return id;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

let sdkPromise: Promise<SDK> | undefined;
export function loadSimulatorSDK(): Promise<SDK> {
  if (window.appetize) return Promise.resolve(window.appetize);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<SDK>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.appetize.io/embed.js";
    script.async = true;
    const timer = setTimeout(() => fail(), 20000);
    function fail() { clearTimeout(timer); script.remove(); sdkPromise = undefined; reject(new Error("Could not load the iPhone simulator service. Check your connection or upload screenshots manually.")); }
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (!window.appetize) { fail(); return; }
      resolve(window.appetize);
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function screenshotFile(data: string, mimeType: string): File {
  if (!/^image\/(png|jpeg)$/.test(mimeType)) throw new Error("The simulator returned an unsupported image format.");
  const raw = data.startsWith("data:") ? data.slice(data.indexOf(",") + 1) : data;
  const binary = atob(raw);
  if (!binary.length || binary.length > 20 * 1024 * 1024) throw new Error("The simulator returned an empty or oversized screenshot.");
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new File([bytes], `iphone-capture-${Date.now()}.${mimeType === "image/png" ? "png" : "jpg"}`, { type: mimeType });
}
