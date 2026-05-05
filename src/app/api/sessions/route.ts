import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DIFFICULTIES, INTERVIEW_TYPES, sessionSetupConfigSchema } from "@/lib/interview/schema";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { resumeParsedDataSchema } from "@/lib/resume/schema";
import { syncCurrentUser } from "@/lib/sync-user";

export const runtime = "nodejs";

const createBodySchema = z.object({
  resumeId: z.string().min(1),
  role: z.string().min(1),
  difficulty: z.enum(DIFFICULTIES),
  interviewType: z.enum(INTERVIEW_TYPES),
  focus: z.string().optional(),
  maxQuestions: z.number().int().min(3).max(8).optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, retryAfterSec } = rateLimit(`sessions:create:${userId}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  await syncCurrentUser();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedBody = createBodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsedBody.error.flatten() }, { status: 400 });
  }

  const body = parsedBody.data;

  const resume = await prisma.resume.findFirst({
    where: { id: body.resumeId, userId },
  });

  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const parsed = resumeParsedDataSchema.safeParse(resume.parsedData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parse the resume before starting an interview." },
      { status: 400 },
    );
  }

  const config = sessionSetupConfigSchema.parse({
    maxQuestions: body.maxQuestions ?? 6,
    focus: body.focus,
  });

  const session = await prisma.interviewSession.create({
    data: {
      userId,
      resumeId: resume.id,
      role: body.role,
      difficulty: body.difficulty,
      interviewType: body.interviewType,
      status: "draft",
      config: config as object,
    },
  });

  return NextResponse.json({ session });
}
