// /lib/github.ts

export function normalizeGitHubRepoUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    return `https://github.com/${owner}/${repo}`;
  } catch {
    return null;
  }
}

export function getGitHubZipUrl(repoUrl: string): string {
  const u = new URL(repoUrl);
  const parts = u.pathname.split("/").filter(Boolean);
  const owner = parts[0];
  const repo = parts[1];
  return `https://api.github.com/repos/${owner}/${repo}/zipball`;
}

export async function fetchZipBytesFromRepoUrl(repoUrl: string): Promise<ArrayBuffer> {
  const zipUrl = getGitHubZipUrl(repoUrl);
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "AppPreflight"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(zipUrl, { headers, redirect: "follow" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub ZIP fetch failed (${res.status}). ${txt.slice(0, 250)}`);
  }
  return await res.arrayBuffer();
}
