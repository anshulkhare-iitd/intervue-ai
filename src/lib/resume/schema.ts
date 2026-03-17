import { z } from "zod";

/** Structured resume profile produced by the parser LLM step (V1). */
export const parsedResumeSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      start: z.string().optional(),
      end: z.string().optional(),
      bullets: z.array(z.string()),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      tech: z.array(z.string()).optional(),
    }),
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string().optional(),
      year: z.string().optional(),
    }),
  ),
  keywords: z.array(z.string()),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

/** Stored in `Resume.parsedData` — structured fields plus extraction metadata. */
export const resumeParsedDataSchema = z.object({
  profile: parsedResumeSchema,
  rawTextLength: z.number(),
  rawTextPreview: z.string().optional(),
  model: z.string().optional(),
  parsedAt: z.string(),
});

export type ResumeParsedData = z.infer<typeof resumeParsedDataSchema>;
