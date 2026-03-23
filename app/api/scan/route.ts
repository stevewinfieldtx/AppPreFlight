// /app/api/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { normalizeGitHubRepoUrl, fetchZipBytesFromRepoUrl } from "@/lib/github";
import { detectAppType, scanRepoWide, detectPolicyPages } from "@/lib/scanners/repoWide";
import type { ScanReport, Finding } from "@/lib/schema";

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function grade(findings: Finding[]): "PASS" | "WARN" | "FAIL" | "UNKNOWN" {
  if (!findings.length) return "PASS";
  if (findings.some((f) => f.priority === "P0")) return "FAIL";
  if (findings.some((f) => f.priority === "P1")) return "WARN";
  return "WARN";
}

function toPathsFromZip(zip: JSZip): string[] {
  const paths: string[] = [];
  for (const name of Object.keys(zip.files)) {
    const f = zip.files[name];
    if (!f.dir) {
      const normalized = name.replace(/\\/g, "/");
      const stripped = normalized.split("/").slice(1).join("/");
      if (stripped) paths.push(stripped);
    }
  }
  return paths;
}

export async function POST(req: NextRequest) {
  const scannedAtIso = new Date().toISOString();

  try {
    const body = await req.json().catch(() => ({}));
    const repoUrlRaw = String(body?.repoUrl || "").trim();

    const normalized = normalizeGitHubRepoUrl(repoUrlRaw);
    if (!normalized) {
      return NextResponse.json({ error: "Please paste a valid GitHub repo URL." }, { status: 400 });
    }

    const zipBytes = await fetchZipBytesFromRepoUrl(normalized);
    const zip = await JSZip.loadAsync(zipBytes);
    const allPaths = toPathsFromZip(zip);

    const appType = detectAppType(allPaths);
    const findings: Finding[] = [...scanRepoWide(allPaths)];

    // Policy pages detection
    const { hasPrivacy, hasTerms, hasSupport, hasDelete } = detectPolicyPages(allPaths);

    if (!hasPrivacy) {
      findings.push({
        priority: "P1",
        platform: "Both",
        title: "Privacy Policy not detected",
        evidence: "No privacy policy file/page found by common naming patterns.",
        fix: "Generate a public privacy policy page. AppPreflight can create this for you.",
      });
    }
    if (!hasTerms) {
      findings.push({
        priority: "P1",
        platform: "Both",
        title: "Terms of Service not detected",
        evidence: "No terms/TOS file/page found by common naming patterns.",
        fix: "Generate a public Terms page before accepting payments/subscriptions.",
      });
    }
    if (!hasSupport) {
      findings.push({
        priority: "P2",
        platform: "Both",
        title: "Support/Contact page not detected",
        evidence: "No support/contact/help page found by common naming patterns.",
        fix: "Add a support page and link it in store listings.",
      });
    }
    if (!hasDelete) {
      findings.push({
        priority: "P2",
        platform: "Both",
        title: "Account deletion page not detected",
        evidence: "No account deletion instructions page detected.",
        fix: "If accounts exist, provide in-app deletion + a public deletion instructions page.",
      });
    }

    // Native project checks
    if (appType !== "web") {
      const hasInfoPlist = allPaths.some((p) => p.toLowerCase().endsWith("info.plist"));
      const hasAndroidManifest = allPaths.some((p) => p.toLowerCase().endsWith("androidmanifest.xml"));

      if (!hasInfoPlist) {
        findings.push({
          priority: "P1", platform: "iOS",
          title: "No Info.plist found in scanned files",
          evidence: "Could be missing from repo ZIP scope or generated at build time.",
          fix: "Ensure Info.plist exists in source or your build pipeline generates it.",
        });
      }
      if (!hasAndroidManifest) {
        findings.push({
          priority: "P1", platform: "Android",
          title: "No AndroidManifest.xml found in scanned files",
          evidence: "Could be missing from repo ZIP scope or generated at build time.",
          fix: "Ensure AndroidManifest.xml exists in source or your build pipeline produces it.",
        });
      }
    }

    const iosRelevant = findings.filter((f) => f.platform === "iOS" || f.platform === "Both");
    const androidRelevant = findings.filter((f) => f.platform === "Android" || f.platform === "Both");

    const report: ScanReport = {
      id: id(),
      repoUrl: normalized,
      summary: {
        iosReadiness: appType === "web" ? "UNKNOWN" : grade(iosRelevant),
        androidReadiness: appType === "web" ? "UNKNOWN" : grade(androidRelevant),
        topRisks: findings
          .filter((f) => f.priority === "P0" || f.priority === "P1")
          .slice(0, 4)
          .map((f) => `${f.platform}: ${f.title}`),
      },
      findings,
      meta: {
        scannedAtIso,
        notes: [
          `Detected app type: ${appType.toUpperCase()}`,
          `Files found: ${allPaths.length}`,
          "Public GitHub repo (ZIP download). Private repos require auth.",
        ],
      },
    };

    return NextResponse.json({ ok: true, report });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
