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

const g = globalThis as any;

// Persist across hot reload in dev
if (!g.__APP_PREFLIGHT_REPORTS__) {
  g.__APP_PREFLIGHT_REPORTS__ = new Map<string, Report>();
}

const store: Map<string, Report> = g.__APP_PREFLIGHT_REPORTS__;

// Keep last N reports
const MAX_REPORTS = 200;

export function saveReport(report: Report) {
  store.set(report.id, report);
  // basic pruning
  if (store.size > MAX_REPORTS) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
}

export function getReport(id: string): Report | null {
  return store.get(id) || null;
}
