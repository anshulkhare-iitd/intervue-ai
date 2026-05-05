import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { withRetry } from "@/lib/with-retry";

import { atsReportPayloadSchema, type AtsReportPayload } from "@/lib/ats/schema";
import type { ParsedResume } from "@/lib/resume/schema";

const ATS_MODEL_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getAtsModelCandidates(): string[] {
  const primary = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").trim();
  const fallbackFromEnv = process.env.GEMINI_ATS_FALLBACK_MODEL?.trim();
  const defaults = ["gemini-2.0-flash", "gemini-1.5-flash"];
  const candidates = [primary, fallbackFromEnv, ...defaults].filter(
    (name): name is string => !!name && name.length > 0,
  );

  return [...new Set(candidates)];
}

export async function analyzeAtsForRole(
  profile: ParsedResume,
  targetRole: string | null,
): Promise<{ payload: AtsReportPayload; model: string }> {
  const roleLine = targetRole?.trim()
    ? `Target role: ${targetRole.trim()}`
    : "Target role: not specified — give a generic software-engineering ATS assessment.";

  const prompt = `You are an ATS (applicant tracking system) and hiring-tooling analyst for software engineering resumes.

${roleLine}

Evaluate the structured resume JSON below. Scores are 0–100 integers. Be specific and actionable; do not invent employers or projects not implied by the data. If information is thin, say so in the summary and keep missing keywords realistic for the role.

Structured resume (JSON):
${JSON.stringify(profile, null, 2)}`;

  const modelCandidates = getAtsModelCandidates();
  let lastError: unknown;

  for (const modelName of modelCandidates) {
    try {
      const { output } = await withRetry(() =>
        withTimeout(
          generateText({
            model: google(modelName),
            output: Output.object({ schema: atsReportPayloadSchema }),
            prompt,
          }),
          ATS_MODEL_TIMEOUT_MS,
          "ATS generation request timed out",
        ),
      );

      return { payload: output, model: modelName };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("ATS generation failed unexpectedly");

}
