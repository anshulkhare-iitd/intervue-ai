import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { evaluateAnswer } from "@/lib/interview/evaluate-answer";
import { answerEvaluationSchema, INTERVIEW_TYPES, type InterviewType } from "@/lib/interview/schema";
import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

export const runtime = "nodejs";

const bodySchema = z.object({
  questionId: z.string().min(1),
  transcript: z.string().min(1),
});

function isInterviewType(v: string): v is InterviewType {
  return (INTERVIEW_TYPES as readonly string[]).includes(v);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncCurrentUser();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const { id: sessionId } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.json({ error: "Session is already completed" }, { status: 400 });
  }

  if (!isInterviewType(session.interviewType)) {
    return NextResponse.json({ error: "Invalid interview type on session" }, { status: 500 });
  }

  const question = await prisma.interviewQuestion.findFirst({
    where: { id: parsed.data.questionId, sessionId: session.id },
    include: { answers: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (question.answers.length > 0) {
    return NextResponse.json({ error: "This question was already answered" }, { status: 409 });
  }

  const { evaluation } = await evaluateAnswer({
    questionText: question.questionText,
    transcript: parsed.data.transcript,
    interviewType: session.interviewType,
    difficulty: session.difficulty,
  });

  answerEvaluationSchema.parse(evaluation);

  const answer = await prisma.interviewAnswer.create({
    data: {
      questionId: question.id,
      transcript: parsed.data.transcript,
      evaluation: evaluation as object,
    },
  });

  return NextResponse.json({ answer });
}
