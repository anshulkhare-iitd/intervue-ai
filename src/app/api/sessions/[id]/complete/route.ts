import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  answerEvaluationSchema,
  INTERVIEW_TYPES,
  type AnswerEvaluation,
  type InterviewType,
} from "@/lib/interview/schema";
import { buildBreakdown, synthesizeFeedback } from "@/lib/interview/scorecard";
import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

export const runtime = "nodejs";

function isInterviewType(v: string): v is InterviewType {
  return (INTERVIEW_TYPES as readonly string[]).includes(v);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncCurrentUser();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const { id: sessionId } = await context.params;

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { answers: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 });
  }

  if (!isInterviewType(session.interviewType)) {
    return NextResponse.json({ error: "Invalid interview type on session" }, { status: 500 });
  }

  const questions = session.questions;
  if (questions.length === 0) {
    return NextResponse.json({ error: "No questions in this session yet" }, { status: 400 });
  }

  const pending = questions.find((q) => q.answers.length === 0);
  if (pending) {
    return NextResponse.json(
      { error: "Answer the current question before finishing the interview." },
      { status: 400 },
    );
  }

  const rows: {
    questionOrder: number;
    questionId: string;
    answerId: string;
    questionText: string;
    transcript: string;
    evaluation: AnswerEvaluation;
  }[] = [];

  for (const q of questions) {
    const ans = q.answers[0];
    if (!ans) {
      return NextResponse.json({ error: "Incomplete answers" }, { status: 400 });
    }
    const ev = answerEvaluationSchema.safeParse(ans.evaluation);
    if (!ev.success) {
      return NextResponse.json({ error: "Invalid evaluation data" }, { status: 500 });
    }
    rows.push({
      questionOrder: q.order,
      questionId: q.id,
      answerId: ans.id,
      questionText: q.questionText,
      transcript: ans.transcript,
      evaluation: ev.data,
    });
  }

  const { breakdown, overallScore } = buildBreakdown(rows, session.interviewType);

  const feedback = await synthesizeFeedback({
    interviewType: session.interviewType,
    rows,
    breakdown,
  });

  const result = await prisma.$transaction(async (tx) => {
    const scorecard = await tx.scorecard.create({
      data: {
        sessionId: session.id,
        overallScore,
        breakdown: breakdown as object,
        feedback: feedback as object,
      },
    });

    await tx.interviewSession.update({
      where: { id: session.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    return scorecard;
  });

  return NextResponse.json({ scorecard: result });
}
