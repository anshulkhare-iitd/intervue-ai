import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";

import { parsedResumeSchema, type ParsedResume } from "@/lib/resume/schema";

const MAX_INPUT_CHARS = 48_000;

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

  const { output } = await generateText({
    model: google(modelName),
    output: Output.object({ schema: parsedResumeSchema }),
    prompt: `You extract structured resume data for software-engineering candidates from plain text only. Do not invent employers, dates, or projects. Use null for unknown scalar fields and empty arrays where there is no list data.

Plain text (possibly truncated: ${truncated ? "yes" : "no"}):
"""
${text}
"""`,
  });

  return {
    profile: output,
    model: modelName,
    rawTextLength,
    rawTextPreview,
  };
}
