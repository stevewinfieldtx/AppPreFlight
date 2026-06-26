// /lib/db.ts
//
// Persistence layer with two backends:
//   1. Postgres  — used automatically when DATABASE_URL is set (Railway, etc.)
//   2. JSON file — fallback for local dev / when no database is configured
//
// Every write is wrapped so that a database hiccup never throws all the way up
// and loses a user's work. Callers should still try/catch, but the app keeps
// working off the browser autosave even if the database is unreachable.

import fs from "node:fs/promises";
import path from "node:path";
import type { GeneratedApp } from "./schema";

const DATA_PATH = path.join(process.cwd(), "data", "apps.json");
const SESSION_PATH = path.join(process.cwd(), "data", "sessions.json");
const hasDb = !!process.env.DATABASE_URL;

/* --------------------------------------------------------------------------
 * Postgres (lazy, single pool, schema auto-created on first use)
 * ------------------------------------------------------------------------ */
let _pool: any = null;
let _ready: Promise<void> | null = null;

async function getPool(): Promise<any> {
  if (!hasDb) return null;
  if (!_pool) {
    const pg: any = await import("pg");
    const Pool = pg.Pool ?? pg.default?.Pool;
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Most managed Postgres (incl. Railway public URLs) require SSL.
      // Set DATABASE_SSL=disable when using an internal/no-SSL connection.
      ssl:
        process.env.DATABASE_SSL === "disable"
          ? false
          : { rejectUnauthorized: false },
      max: 5,
    });
  }
  if (!_ready) {
    _ready = initSchema(_pool).catch((err) => {
      // Reset so a later call can retry instead of being stuck on a rejection.
      _ready = null;
      throw err;
    });
  }
  await _ready;
  return _pool;
}

async function initSchema(pool: any): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS apps (
      slug       TEXT PRIMARY KEY,
      data       JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      stage      TEXT,
      data       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

/* --------------------------------------------------------------------------
 * JSON file helpers (fallback backend)
 * ------------------------------------------------------------------------ */
async function readJsonFile<T>(p: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(p: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2), "utf8");
}

/* --------------------------------------------------------------------------
 * Apps
 * ------------------------------------------------------------------------ */
export async function getApps(): Promise<GeneratedApp[]> {
  const pool = await getPool();
  if (pool) {
    const { rows } = await pool.query(
      "SELECT data FROM apps ORDER BY updated_at DESC"
    );
    return rows.map((r: any) => r.data as GeneratedApp);
  }
  return readJsonFile<GeneratedApp[]>(DATA_PATH, []);
}

export async function getAppBySlug(slug: string): Promise<GeneratedApp | null> {
  const pool = await getPool();
  if (pool) {
    const { rows } = await pool.query(
      "SELECT data FROM apps WHERE slug = $1",
      [slug]
    );
    return rows[0] ? (rows[0].data as GeneratedApp) : null;
  }
  const apps = await readJsonFile<GeneratedApp[]>(DATA_PATH, []);
  return apps.find((a) => a.slug === slug) ?? null;
}

export async function saveApp(app: GeneratedApp): Promise<void> {
  const pool = await getPool();
  if (pool) {
    await pool.query(
      `INSERT INTO apps (slug, data, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (slug)
       DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [app.slug, JSON.stringify(app)]
    );
    return;
  }
  const apps = await readJsonFile<GeneratedApp[]>(DATA_PATH, []);
  const idx = apps.findIndex((a) => a.slug === app.slug);
  if (idx >= 0) apps[idx] = app;
  else apps.push(app);
  await writeJsonFile(DATA_PATH, apps);
}

/* --------------------------------------------------------------------------
 * Sessions (in-progress flow state — the autosave backbone)
 * ------------------------------------------------------------------------ */
export type SessionRecord = {
  id: string;
  stage: string | null;
  data: Record<string, unknown>;
  updatedAt?: string;
};

export async function saveSession(
  id: string,
  stage: string | null,
  data: Record<string, unknown>
): Promise<void> {
  const pool = await getPool();
  if (pool) {
    await pool.query(
      `INSERT INTO sessions (id, stage, data, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (id)
       DO UPDATE SET stage = EXCLUDED.stage, data = EXCLUDED.data, updated_at = now()`,
      [id, stage, JSON.stringify(data)]
    );
    return;
  }
  const all = await readJsonFile<Record<string, SessionRecord>>(SESSION_PATH, {});
  all[id] = { id, stage, data, updatedAt: new Date().toISOString() };
  await writeJsonFile(SESSION_PATH, all);
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const pool = await getPool();
  if (pool) {
    const { rows } = await pool.query(
      "SELECT id, stage, data, updated_at FROM sessions WHERE id = $1",
      [id]
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      stage: rows[0].stage,
      data: rows[0].data as Record<string, unknown>,
      updatedAt: rows[0].updated_at,
    };
  }
  const all = await readJsonFile<Record<string, SessionRecord>>(SESSION_PATH, {});
  return all[id] ?? null;
}
