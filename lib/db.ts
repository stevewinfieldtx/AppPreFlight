// /lib/db.ts
import pool from "./postgres";
import { GeneratedApp } from "./schema";

// Auto-create table on first use
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS preflight_apps (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      app_name text NOT NULL,
      data jsonb NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `);
  tableReady = true;
}

export async function getApps(): Promise<GeneratedApp[]> {
  await ensureTable();
  const { rows } = await pool.query(
    "SELECT data FROM preflight_apps ORDER BY created_at DESC"
  );
  return rows.map((r: { data: GeneratedApp }) => r.data);
}

export async function getAppBySlug(slug: string): Promise<GeneratedApp | null> {
  await ensureTable();
  const { rows } = await pool.query(
    "SELECT data FROM preflight_apps WHERE slug = $1 LIMIT 1",
    [slug]
  );
  return rows.length > 0 ? (rows[0].data as GeneratedApp) : null;
}

export async function saveApp(app: GeneratedApp): Promise<void> {
  await ensureTable();
  await pool.query(
    `INSERT INTO preflight_apps (slug, app_name, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug)
     DO UPDATE SET app_name = $2, data = $3, updated_at = now()`,
    [app.slug, app.appName, JSON.stringify(app)]
  );
}
