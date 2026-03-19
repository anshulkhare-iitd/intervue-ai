import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { generateNextQuestion } from "@/lib/interview/question-generator";
import {
  INTERVIEW_TYPES,
  answerEvaluationSchema,
  sessionSetupConfigSchema,
  type InterviewType,
} from "@/lib/interview/schema";
import { prisma } from "@/lib/db";
import { resumeParsedDataSchema } from "@/lib/resume/schema";
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
      resume: true,
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
    return NextResponse.json({ error: "Session is already completed" }, { status: 400 });
  }

  const config = sessionSetupConfigSchema.safeParse(session.config ?? {});
  if (!config.success) {
    return NextResponse.json({ error: "Invalid session config" }, { status: 500 });
  }

  const maxQuestions = config.data.maxQuestions;
  const ordered = session.questions;

  const pending = ordered.find((q) => q.answers.length === 0);
  if (pending) {
    return NextResponse.json({
      done: false,
      question: pending,
    });
  }

  if (ordered.length >= maxQuestions) {
    return NextResponse.json({
      done: true,
      message: "Question cap reached. Submit your last answer if needed, then finish the interview.",
    });
  }

  if (!session.resume) {
    return NextResponse.json({ error: "Session has no resume" }, { status: 400 });
  }

  const profileParsed = resumeParsedDataSchema.safeParse(session.resume.parsedData);
  if (!profileParsed.success) {
    return NextResponse.json(
      { error: "Resume must be parsed before generating questions." },
      { status: 400 },
    );
  }

  if (!isInterviewType(session.interviewType)) {
    return NextResponse.json({ error: "Invalid interview type on session" }, { status: 500 });
  }

  const priorTurns: {
    questionText: string;
    transcript: string;
    followUpTopics: string[];
  }[] = [];

  for (const q of ordered) {
    const ans = q.answers[0];
    if (!ans) break;
    const ev = answerEvaluationSchema.safeParse(ans.evaluation);
    priorTurns.push({
      questionText: q.questionText,
      transcript: ans.transcript,
      followUpTopics: ev.success ? ev.data.followUpTopics : [],
    });
  }

  const { question } = await generateNextQuestion({
    profile: profileParsed.data.profile,
    role: session.role,
    difficulty: session.difficulty,
    interviewType: session.interviewType,
    focus: config.data.focus ?? null,
    priorTurns,
    questionIndex: ordered.length,
    maxQuestions,
  });

  const created = await prisma.$transaction(async (tx) => {
    const q = await tx.interviewQuestion.create({
      data: {
        sessionId: session.id,
        order: ordered.length,
        questionText: question.questionText,
        metadata: question.metadata as object,
      },
    });

    await tx.interviewSession.update({
      where: { id: session.id },
      data: {
        status: "in_progress",
        startedAt: session.startedAt ?? new Date(),
      },
    });

    return q;
  });

  return NextResponse.json({ done: false, question: created });
}
