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
export const GeneratedAppSchema = z.object({
  slug: z.string().min(1),
  appName: z.string().min(1),
  companyName: z.string().min(1),
  oneLiner: z.string().min(1),
  targetAudience: z.string().min(1),
  corePurpose: z.string().min(1),
  keyFeatures: z.array(z.string()).default([]),
  differentiators: z.array(z.string()).default([]),
  favoritePart: z.string().min(1),
  whatNext: z.string().min(1),
  toneProfile: z.string().min(1),
  founderStory: z.string().min(1),
  support: z.object({
    email: z.string().email(),
    url: z.string().url().optional().or(z.literal("")),
    faq: z.array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1)
      })
    ).default([])
  }),
  privacy: z.object({
    collectsAccounts: z.boolean(),
    collectsAnalytics: z.boolean(),
    collectsPayments: z.boolean(),
    collectsLocation: z.boolean(),
    collectsUserContent: z.boolean(),
    dataCollected: z.array(z.string()).default([]),
    thirdParties: z.array(z.string()).default([]),
    usesTracking: z.boolean(),
    childrenUnder13: z.boolean(),
    contactEmail: z.string().email()
  }),
  marketing: z.object({
    appStoreTitle: z.string().min(1),
    subtitle: z.string().min(1),
    keywords: z.array(z.string()).default([]),
    description: z.string().min(1),
    screenshotHeadlines: z.array(z.string()).default([])
  }),
  // Link back to scan if one was done
  scanReportId: z.string().optional()
});

export type Finding = z.infer<typeof FindingSchema>;
export type ScanReport = z.infer<typeof ScanReportSchema>;
export type GeneratedApp = z.infer<typeof GeneratedAppSchema>;
export type ChatMessage = z.infer<typeof MessageSchema>;
