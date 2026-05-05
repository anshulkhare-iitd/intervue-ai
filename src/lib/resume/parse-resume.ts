import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";

import { parsedResumeSchema, type ParsedResume } from "@/lib/resume/schema";
import { withRetry } from "@/lib/with-retry";

const MAX_INPUT_CHARS = 24_000;
const MODEL_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function truncateForModel(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_INPUT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_INPUT_CHARS), truncated: true };
}

export async function parseResumeFromPlainText(plainText: string): Promise<{
  profile: ParsedResume;
  model: string;
  rawTextLength: number;
  rawTextPreview: string;
}> {
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const { text, truncated } = truncateForModel(plainText);
  const rawTextLength = plainText.length;
  const rawTextPreview = plainText.slice(0, 400);

  const { output } = await withRetry(() =>
    withTimeout(
      generateText({
        model: google(modelName),
        output: Output.object({ schema: parsedResumeSchema }),
        prompt: `You extract structured resume data for software-engineering candidates from plain text only. Do not invent employers, dates, or projects. Use null for unknown scalar fields and empty arrays where there is no list data.

Plain text (possibly truncated: ${truncated ? "yes" : "no"}):
"""
${text}
"""`,
      }),
      MODEL_TIMEOUT_MS,
      "Resume parsing request timed out",
    ),
  );

  return {
    profile: output,
    model: modelName,
    rawTextLength,
    rawTextPreview,
  };
}
