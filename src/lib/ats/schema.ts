import { z } from "zod";

/**
 * Fixed ATS output shape for UI + persistence (`AtsReport.suggestions`).
 * Kept stable so the report page can render predictably.
 */
export const atsReportPayloadSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  headline: z.string(),
  summary: z.string(),
  keywords: z.object({
    score: z.number().int().min(0).max(100),
    found: z.array(z.string()),
    missing: z.array(z.string()),
  }),
  bulletQuality: z.object({
    score: z.number().int().min(0).max(100),
    items: z.array(
      z.object({
        excerpt: z.string(),
        problem: z.string(),
        rewriteHint: z.string(),
      }),
    ),
  }),
  structureAndFormat: z.object({
    score: z.number().int().min(0).max(100),
    positives: z.array(z.string()),
    improvements: z.array(z.string()),
  }),
  nextSteps: z.array(z.string()).max(5),
});

export type AtsReportPayload = z.infer<typeof atsReportPayloadSchema>;
