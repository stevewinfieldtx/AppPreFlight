// /lib/persist.ts
"use client";
//
// Client-side autosave helpers. Two layers:
//   • localStorage  — instant, synchronous, survives reloads/crashes offline
//   • /api/session  — durable server copy (Postgres), survives device switches
//
// The server write is debounced so rapid stage changes collapse into one call.

import { nanoid } from "nanoid";

const SESSION_KEY = "apppreflight:sessionId";
const STATE_KEY = "apppreflight:flowState";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = nanoid();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function newSessionId(): string {
  if (typeof window === "undefined") return "";
  const id = nanoid();
  window.localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function loadLocal<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveLocal(state: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore, server copy still applies */
  }
}

export function clearLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveServer(stage: string, state: unknown): void {
  if (typeof window === "undefined") return;
  const id = getSessionId();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage, state }),
      keepalive: true
    }).catch(() => {
      /* offline / transient — localStorage already has it */
    });
  }, 700);
}

export async function loadServer(): Promise<{
  stage: string | null;
  data: Record<string, unknown>;
  updatedAt?: string;
} | null> {
  if (typeof window === "undefined") return null;
  const id = getSessionId();
  try {
    const res = await fetch(`/api/session?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.ok && json.session ? json.session : null;
  } catch {
    return null;
  }
}
