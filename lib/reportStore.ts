import pool from "./postgres";

type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

export type Report = {
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

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scan_reports (
      id text PRIMARY KEY,
      repo_url text NOT NULL,
      data jsonb NOT NULL,
      created_at timestamptz DEFAULT now()
    )
  `);
  tableReady = true;
}

export async function saveReport(report: Report) {
  await ensureTable();
  await pool.query(
    `INSERT INTO scan_reports (id, repo_url, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (id)
     DO UPDATE SET repo_url = $2, data = $3`,
    [report.id, report.repoUrl, JSON.stringify(report)]
  );
}

export async function getReport(id: string): Promise<Report | null> {
  await ensureTable();
  const { rows } = await pool.query(
    "SELECT data FROM scan_reports WHERE id = $1 LIMIT 1",
    [id]
  );
  return rows.length > 0 ? (rows[0].data as Report) : null;
}
