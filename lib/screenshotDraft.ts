import type { DeviceKey, LayoutKey, ThemeKey } from "./screenshots";

export type ScreenshotDraft = {
  shots: { id: string; name: string; headline: string; subhead: string; file: string }[];
  theme: ThemeKey; layout: LayoutKey; fit: "contain" | "cover"; devices: DeviceKey[];
};

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("apppreflight-screenshots", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readDraft(key: string): Promise<ScreenshotDraft | undefined> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const req = db.transaction("drafts").objectStore("drafts").get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }); } finally { db.close(); }
}

export async function writeDraft(key: string, draft: ScreenshotDraft): Promise<void> {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").put(draft, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
