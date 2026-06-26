// /lib/schema.ts
import { z } from "zod";

// ─── Chat ───
export const MessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  content: z.string().min(1)
});

export const InterviewInputSchema = z.object({
  messages: z.array(MessageSchema),
  latestUserMessage: z.string().min(1)
});

// ─── Scan findings ───
export const FindingSchema = z.object({
  priority: z.enum(["P0", "P1", "P2"]),
  platform: z.enum(["iOS", "Android", "Both"]),
  title: z.string(),
  evidence: z.string().optional(),
  fix: z.string().optional()
});

export const ScanReportSchema = z.object({
  id: z.string(),
  repoUrl: z.string(),
  summary: z.object({
    iosReadiness: z.enum(["PASS", "WARN", "FAIL", "UNKNOWN"]),
    androidReadiness: z.enum(["PASS", "WARN", "FAIL", "UNKNOWN"]),
    topRisks: z.array(z.string())
  }),
  findings: z.array(FindingSchema),
  meta: z.object({
    scannedAtIso: z.string(),
    notes: z.array(z.string())
  })
});

// ─── Generated app profile ───
//
// This schema is deliberately LENIENT. A finished interview represents real
// effort from the user — we must never throw it away because the model left a
// field blank or returned an unexpected email format. Every field has a safe
// default and the nested objects `.catch({})` so a malformed branch can't take
// the whole package down. The dashboard's checklist is what nudges the user to
// fill in anything important that's still missing (e.g. a support email).
const FaqItemSchema = z.object({
  question: z.string().catch(""),
  answer: z.string().catch("")
});

export const GeneratedAppSchema = z.object({
  slug: z.string().default("untitled-app"),
  appName: z.string().default("Your App"),
  companyName: z.string().default(""),
  oneLiner: z.string().default(""),
  targetAudience: z.string().default(""),
  corePurpose: z.string().default(""),
  keyFeatures: z.array(z.string()).default([]),
  differentiators: z.array(z.string()).default([]),
  favoritePart: z.string().default(""),
  whatNext: z.string().default(""),
  toneProfile: z.string().default(""),
  founderStory: z.string().default(""),
  support: z
    .object({
      email: z.string().default(""),
      url: z.string().default("").catch(""),
      faq: z.array(FaqItemSchema).default([]).catch([])
    })
    .default({})
    .catch({ email: "", url: "", faq: [] }),
  privacy: z
    .object({
      collectsAccounts: z.boolean().default(false).catch(false),
      collectsAnalytics: z.boolean().default(false).catch(false),
      collectsPayments: z.boolean().default(false).catch(false),
      collectsLocation: z.boolean().default(false).catch(false),
      collectsUserContent: z.boolean().default(false).catch(false),
      dataCollected: z.array(z.string()).default([]).catch([]),
      thirdParties: z.array(z.string()).default([]).catch([]),
      usesTracking: z.boolean().default(false).catch(false),
      childrenUnder13: z.boolean().default(false).catch(false),
      contactEmail: z.string().default("")
    })
    .default({})
    .catch({
      collectsAccounts: false,
      collectsAnalytics: false,
      collectsPayments: false,
      collectsLocation: false,
      collectsUserContent: false,
      dataCollected: [],
      thirdParties: [],
      usesTracking: false,
      childrenUnder13: false,
      contactEmail: ""
    }),
  marketing: z
    .object({
      appStoreTitle: z.string().default(""),
      subtitle: z.string().default(""),
      keywords: z.array(z.string()).default([]).catch([]),
      description: z.string().default(""),
      screenshotHeadlines: z.array(z.string()).default([]).catch([])
    })
    .default({})
    .catch({
      appStoreTitle: "",
      subtitle: "",
      keywords: [],
      description: "",
      screenshotHeadlines: []
    }),
  // Link back to scan if one was done
  scanReportId: z.string().optional()
});

// ─── Autosave: persisted in-progress flow state ───
export const SessionStateSchema = z.object({
  mode: z.string().optional(),
  scanReport: z.unknown().optional(),
  generatedResult: z.unknown().optional(),
  interviewMessages: z.array(MessageSchema).optional(),
  updatedAt: z.number().optional()
});

export type Finding = z.infer<typeof FindingSchema>;
export type ScanReport = z.infer<typeof ScanReportSchema>;
export type GeneratedApp = z.infer<typeof GeneratedAppSchema>;
export type ChatMessage = z.infer<typeof MessageSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
