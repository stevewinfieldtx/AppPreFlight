// /lib/scanners/repoWide.ts

export type AppType = "web" | "expo" | "react-native" | "capacitor" | "flutter";

export type Finding = {
  priority: "P0" | "P1" | "P2";
  platform: "iOS" | "Android" | "Both";
  title: string;
  evidence?: string;
  fix?: string;
};

export function detectAppType(allPaths: string[]): AppType {
  const p = allPaths.map((x) => x.toLowerCase());

  const hasExpo =
    p.includes("app.json") ||
    p.includes("app.config.js") ||
    p.includes("app.config.ts");

  const hasIOSDir = p.some((x) => x.startsWith("ios/"));
  const hasAndroidDir = p.some((x) => x.startsWith("android/"));

  const hasReactNative =
    hasIOSDir ||
    hasAndroidDir ||
    p.includes("react-native.config.js") ||
    p.includes("metro.config.js");

  const hasCapacitor =
    p.includes("capacitor.config.ts") ||
    p.includes("capacitor.config.json") ||
    p.includes("capacitor.config.js");

  const hasFlutter =
    p.includes("pubspec.yaml") && (hasIOSDir || hasAndroidDir);

  if (hasExpo) return "expo";
  if (hasFlutter) return "flutter";
  if (hasCapacitor) return "capacitor";
  if (hasReactNative) return "react-native";
  return "web";
}

export function scanRepoWide(allPaths: string[]): Finding[] {
  const appType = detectAppType(allPaths);
  const findings: Finding[] = [];

  if (appType === "web") {
    findings.push({
      priority: "P2",
      platform: "Both",
      title: "Repo appears to be WEB-ONLY (no native iOS/Android project detected)",
      evidence:
        "No ios/ or android/ directories, and no Expo or Capacitor config detected.",
      fix:
        "If you plan to publish to the App Store / Google Play, create a React Native (Expo) or Capacitor wrapper project.",
    });
  }

  return findings;
}

export function detectPolicyPages(allPaths: string[]) {
  const p = allPaths.map((x) => x.toLowerCase());

  const privacyPatterns = [/(^|\/)privacy(\.|\/|$)/, /(^|\/)privacy-policy(\.|\/|$)/];
  const termsPatterns = [/(^|\/)terms(\.|\/|$)/, /(^|\/)terms-of-service(\.|\/|$)/, /(^|\/)tos(\.|\/|$)/];
  const supportPatterns = [/(^|\/)support(\.|\/|$)/, /(^|\/)contact(\.|\/|$)/, /(^|\/)help(\.|\/|$)/];
  const deletePatterns = [/(^|\/)delete-account(\.|\/|$)/, /(^|\/)account-deletion(\.|\/|$)/, /(^|\/)account\/delete(\.|\/|$)/];

  const matchesAny = (path: string, patterns: RegExp[]) => patterns.some((r) => r.test(path));

  return {
    hasPrivacy: p.some((x) => matchesAny(x, privacyPatterns)),
    hasTerms: p.some((x) => matchesAny(x, termsPatterns)),
    hasSupport: p.some((x) => matchesAny(x, supportPatterns)),
    hasDelete: p.some((x) => matchesAny(x, deletePatterns))
  };
}
