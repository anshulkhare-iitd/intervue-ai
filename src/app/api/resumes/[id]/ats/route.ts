import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

  const { payload } = await analyzeAtsForRole(parsed.data.profile, targetRole);
  atsReportPayloadSchema.parse(payload);

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
