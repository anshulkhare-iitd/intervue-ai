import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { analyzeAtsForRole } from "@/lib/ats/analyze-ats";
import { rateLimit } from "@/lib/rate-limit";
import { atsReportPayloadSchema } from "@/lib/ats/schema";
import { prisma } from "@/lib/db";
import { resumeParsedDataSchema } from "@/lib/resume/schema";
import { syncCurrentUser } from "@/lib/sync-user";

export const runtime = "nodejs";

type Body = {
  targetRole?: string | null;
};

function getAtsErrorDetails(error: unknown): { status: number; message: string } {
  if (error instanceof ZodError) {
    return {
      status: 422,
      message: "Could not validate ATS report output. Please retry.",
    };
  }

  if (!(error instanceof Error)) {
    return {
      status: 500,
      message: "ATS report generation failed unexpectedly.",
    };
  }

  const message = error.message.toLowerCase();
  if (
    message.includes("high demand") ||
    message.includes("unavailable") ||
    message.includes("503") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("timed out") ||
    message.includes("resource_exhausted") ||
    message.includes("quota exceeded") ||
    message.includes("insufficient_quota")
  ) {
    return {
      status: 503,
      message: "ATS report generation is temporarily unavailable. Please retry in a moment.",
    };
  }

  return {
    status: 500,
    message: "ATS report generation failed. Please try again.",
  };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, retryAfterSec } = rateLimit(`resumes:ats:${userId}`, 15, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  await syncCurrentUser();

  const { id: resumeId } = await context.params;
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const targetRole =
    typeof body.targetRole === "string" && body.targetRole.trim().length > 0
      ? body.targetRole.trim()
      : null;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" }, { status: 503 });
  }

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
  });

  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = resumeParsedDataSchema.safeParse(resume.parsedData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parse the resume first before running ATS analysis." },
      { status: 400 },
    );
  }

  let payload: Awaited<ReturnType<typeof analyzeAtsForRole>>["payload"];
  try {
    const analyzed = await analyzeAtsForRole(parsed.data.profile, targetRole);
    payload = analyzed.payload;
    atsReportPayloadSchema.parse(payload);
  } catch (error) {
    console.error("ATS report generation failed", { resumeId, error });
    const { status, message } = getAtsErrorDetails(error);
    return NextResponse.json({ error: message }, { status });
  }

  const report = await prisma.atsReport.create({
    data: {
      resumeId: resume.id,
      targetRole,
      score: payload.overallScore,
      suggestions: payload as object,
    },
  });

  return NextResponse.json({ report });
}
