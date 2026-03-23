// /lib/scanners/android.ts

type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

const DANGEROUS_PERMS = [
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.RECORD_AUDIO",
  "android.permission.CAMERA",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_EXTERNAL_STORAGE",
];

export function scanAndroid(textFiles: Record<string, string>): Finding[] {
  const findings: Finding[] = [];
  const manifests = Object.entries(textFiles).filter(([p]) => p.endsWith("AndroidManifest.xml"));

  if (manifests.length === 0) {
    findings.push({
      priority: "P1",
      platform: "Android",
      title: "No AndroidManifest.xml found in scanned files",
      evidence: "Could be missing from repo ZIP scope or generated at build time.",
      fix: "Ensure AndroidManifest.xml is present in source or confirm build pipeline produces it.",
    });
    return findings;
  }

  for (const [path, contents] of manifests) {
    const presentPerms = new Set<string>();
    for (const perm of DANGEROUS_PERMS) {
      if (contents.includes(perm)) presentPerms.add(perm);
    }

    if (presentPerms.size > 0) {
      findings.push({
        priority: "P1",
        platform: "Android",
        title: "Dangerous permissions detected (must justify and disclose)",
        evidence: `${path}: ${Array.from(presentPerms).join(", ")}`,
        fix: "Remove unused permissions. For used permissions, ensure runtime flows and Play Data Safety disclosures.",
      });
    }

    if (contents.includes('android:exported="true"')) {
      findings.push({
        priority: "P1",
        platform: "Android",
        title: "Exported components detected (review/security risk)",
        evidence: `AndroidManifest.xml: ${path}`,
        fix: "Ensure exported=true is required and properly protected.",
      });
    }
  }

  return findings;
}
