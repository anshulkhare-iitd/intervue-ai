import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { extractPlainText } from "@/lib/resume/extract-text";
import { parseResumeFromPlainText } from "@/lib/resume/parse-resume";
import { resumeParsedDataSchema } from "@/lib/resume/schema";

export const runtime = "nodejs";

function getParseErrorDetails(error: unknown): { status: number; message: string } {
  if (!(error instanceof Error)) {
    return { status: 500, message: "Resume parsing failed unexpectedly" };
  }

  const message = error.message.toLowerCase();
  if (
    message.includes("insufficient_quota") ||
    message.includes("exceeded your current quota") ||
    message.includes("resource_exhausted") ||
    message.includes("quota exceeded")
  ) {
    return {
      status: 503,
      message: "Resume parsing is temporarily unavailable due to API quota limits. Please try again later.",
    };
  }

  if (message.includes("rate limit") || message.includes("429")) {
    return {
      status: 503,
      message: "Resume parsing is temporarily rate limited. Please retry in a moment.",
    };
  }

  if (
    message.includes("timed out") ||
    message.includes("deadline exceeded") ||
    message.includes("overloaded") ||
    message.includes("service unavailable") ||
    message.includes("temporarily unavailable")
  ) {
    return {
      status: 503,
      message: "Resume parsing is temporarily unavailable. Please retry in a moment.",
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 422,
      message: "Could not parse this resume format reliably. Please try another file.",
    };
  }

  return { status: 500, message: "Resume parsing failed. Please try again." };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, retryAfterSec } = rateLimit(`resumes:parse:${userId}`, 15, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  const { id } = await context.params;

  const resume = await prisma.resume.findFirst({
    where: { id, userId },
  });

  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!resume.storageKey) {
    return NextResponse.json({ error: "Resume has no stored file" }, { status: 400 });
  }

  if (!resume.mimeType) {
    return NextResponse.json({ error: "Unknown file type" }, { status: 400 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" }, { status: 503 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured" },
      { status: 503 },
    );
  }

  const fileRes = await fetch(resume.storageKey, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });
  if (!fileRes.ok) {
    return NextResponse.json({ error: "Failed to load file from storage" }, { status: 502 });
  }

  const buf = Buffer.from(await fileRes.arrayBuffer());
  const plain = await extractPlainText(buf, resume.mimeType);

  if (!plain.trim()) {
    return NextResponse.json(
      { error: "No extractable text found in this file" },
      { status: 422 },
    );
  }

  let parsed: Awaited<ReturnType<typeof parseResumeFromPlainText>>;
  try {
    parsed = await parseResumeFromPlainText(plain);
  } catch (error) {
    console.error("Resume parse model step failed", { resumeId: id, error });
    const { status, message } = getParseErrorDetails(error);
    return NextResponse.json({ error: message }, { status });
  }

  let parsedData: ReturnType<typeof resumeParsedDataSchema.parse>;
  try {
    parsedData = resumeParsedDataSchema.parse({
      profile: parsed.profile,
      rawTextLength: parsed.rawTextLength,
      rawTextPreview: parsed.rawTextPreview,
      model: parsed.model,
      parsedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Resume parsed payload validation failed", { resumeId: id, error });
    const { status, message } = getParseErrorDetails(error);
    return NextResponse.json({ error: message }, { status });
  }

  const updated = await prisma.resume.update({
    where: { id },
    data: { parsedData },
  });

  return NextResponse.json({ resume: updated });
}
