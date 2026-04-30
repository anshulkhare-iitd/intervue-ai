import { google } from "@ai-sdk/google";
import { generateObject } from "ai";

import { atsReportPayloadSchema, type AtsReportPayload } from "@/lib/ats/schema";
import type { ParsedResume } from "@/lib/resume/schema";

export async function analyzeAtsForRole(
  profile: ParsedResume,
  targetRole: string | null,
): Promise<{ payload: AtsReportPayload; model: string }> {
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const roleLine = targetRole?.trim()
    ? `Target role: ${targetRole.trim()}`
    : "Target role: not specified — give a generic software-engineering ATS assessment.";

  const { object } = await generateObject({
    model: google(modelName),
    schema: atsReportPayloadSchema,
    prompt: `You are an ATS (applicant tracking system) and hiring-tooling analyst for software engineering resumes.

${roleLine}

Evaluate the structured resume JSON below. Scores are 0–100 integers. Be specific and actionable; do not invent employers or projects not implied by the data. If information is thin, say so in the summary and keep missing keywords realistic for the role.

Structured resume (JSON):
${JSON.stringify(profile, null, 2)}`,
  });

  return { payload: object, model: modelName };
}
