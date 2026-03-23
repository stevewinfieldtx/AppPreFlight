// /lib/db.ts
import fs from "node:fs/promises";
import path from "node:path";
import { GeneratedApp } from "./schema";

const DATA_PATH = path.join(process.cwd(), "data", "apps.json");

async function ensureFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, "[]", "utf8");
  }
}

export async function getApps(): Promise<GeneratedApp[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  return JSON.parse(raw) as GeneratedApp[];
}

export async function getAppBySlug(slug: string): Promise<GeneratedApp | null> {
  const apps = await getApps();
  return apps.find((a) => a.slug === slug) ?? null;
}

export async function saveApp(app: GeneratedApp): Promise<void> {
  const apps = await getApps();
  const idx = apps.findIndex((a) => a.slug === app.slug);
  if (idx >= 0) {
    apps[idx] = app;
  } else {
    apps.push(app);
  }
  await fs.writeFile(DATA_PATH, JSON.stringify(apps, null, 2), "utf8");
}
