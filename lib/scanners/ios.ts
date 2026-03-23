// /lib/scanners/ios.ts

type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

export function scanIOS(textFiles: Record<string, string>): Finding[] {
  const findings: Finding[] = [];
  const plistEntries = Object.entries(textFiles).filter(([p]) => p.endsWith("Info.plist"));

  if (plistEntries.length === 0) {
    findings.push({
      priority: "P1",
      platform: "iOS",
      title: "No Info.plist found in scanned files",
      evidence: "Could be missing from repo ZIP scope or generated at build time.",
      fix: "Ensure Info.plist exists in source or confirm build pipeline generates it.",
    });
    return findings;
  }

  const hints = repoUsageHints(textFiles);

  for (const [path, contents] of plistEntries) {
    if (!contents.includes("<plist")) {
      findings.push({
        priority: "P1",
        platform: "iOS",
        title: "Info.plist is not XML (scanner limitation)",
        evidence: path,
        fix: "Convert Info.plist to XML or extend scanner to parse binary plists.",
      });
      continue;
    }

    const keys = extractPlistKeys(contents);

    const required = [
      { key: "NSCameraUsageDescription", label: "Camera" },
      { key: "NSMicrophoneUsageDescription", label: "Microphone" },
      { key: "NSPhotoLibraryUsageDescription", label: "Photo Library" },
      { key: "NSLocationWhenInUseUsageDescription", label: "Location (When In Use)" },
    ];

    for (const r of required) {
      const used = hints[r.label] === true;
      const hasKey = keys.has(r.key);

      if (used && !hasKey) {
        findings.push({
          priority: "P0",
          platform: "iOS",
          title: `Missing ${r.key} (required if using ${r.label})`,
          evidence: `Info.plist: ${path}`,
          fix: `Add "${r.key}" with a clear user-facing reason string.`,
        });
      }
    }

    if (keys.has("NSAppTransportSecurity") && contents.includes("NSAllowsArbitraryLoads") && contents.toLowerCase().includes("<true")) {
      findings.push({
        priority: "P1",
        platform: "iOS",
        title: "ATS allows arbitrary loads (review risk)",
        evidence: `Info.plist: ${path}`,
        fix: "Avoid NSAllowsArbitraryLoads in production; prefer domain exceptions.",
      });
    }
  }

  return findings;
}

function extractPlistKeys(xmlText: string): Set<string> {
  const keys = new Set<string>();
  const re = /<key>([^<]+)<\/key>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xmlText))) keys.add(m[1].trim());
  return keys;
}

function repoUsageHints(textFiles: Record<string, string>): Record<string, boolean> {
  const blob = Object.values(textFiles).join("\n").toLowerCase();
  return {
    "Camera": blob.includes("avcapture") || blob.includes("imagepickercontroller"),
    "Microphone": blob.includes("avaudiosession") || blob.includes("recordaudio"),
    "Photo Library": blob.includes("phphotolibrary") || blob.includes("uiimagepickercontroller"),
    "Location (When In Use)": blob.includes("cllocationmanager") || blob.includes("requestwheninuseauthorization"),
  };
}
