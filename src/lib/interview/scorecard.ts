import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { withRetry } from "@/lib/with-retry";

import { compositeScore } from "@/lib/interview/scoring";
import {
  scorecardBreakdownSchema,
  scorecardFeedbackSchema,
  type AnswerEvaluation,
  type ScorecardBreakdown,
  type ScorecardFeedback,
} from "@/lib/interview/schema";
import type { InterviewType } from "@/lib/interview/schema";

type Row = {
  questionOrder: number;
  questionId: string;
  answerId: string;
  questionText: string;
  transcript: string;
  evaluation: AnswerEvaluation;
};

const FEEDBACK_MODEL_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getFeedbackModelCandidates(): string[] {
  const primary = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").trim();
  const fallbackFromEnv = process.env.GEMINI_FEEDBACK_FALLBACK_MODEL?.trim();
  const defaults = ["gemini-2.0-flash"];
  const candidates = [primary, fallbackFromEnv, ...defaults].filter(
    (name): name is string => !!name && name.length > 0,
  );

  return [...new Set(candidates)];
}

export function buildBreakdown(
  rows: Row[],
  interviewType: InterviewType,
): { breakdown: ScorecardBreakdown; overallScore: number } {
  if (rows.length === 0) {
    throw new Error("No answered questions to score.");
  }

  const perAnswer = rows.map((r) => {
    const composite = compositeScore(r.evaluation, interviewType);
    return {
      questionOrder: r.questionOrder,
      questionId: r.questionId,
      answerId: r.answerId,
      composite,
    };
  });

  const n = rows.length;
  const sums = rows.reduce(
    (acc, r) => {
      const s = r.evaluation.scores;
      acc.technical += s.technical;
      acc.clarity += s.clarity;
      acc.depth += s.depth;
      acc.behavioral += s.behavioral;
      return acc;
    },
    { technical: 0, clarity: 0, depth: 0, behavioral: 0 },
  );

  const averages = {
    technical: Math.round(sums.technical / n),
    clarity: Math.round(sums.clarity / n),
    depth: Math.round(sums.depth / n),
    behavioral: Math.round(sums.behavioral / n),
    composite: Math.round(
      perAnswer.reduce((a, p) => a + p.composite, 0) / perAnswer.length,
    ),
  };

  const breakdown = scorecardBreakdownSchema.parse({
    averages,
    perAnswer,
  });

  return { breakdown, overallScore: averages.composite };
}

export async function synthesizeFeedback(input: {
  interviewType: InterviewType;
  rows: Row[];
  breakdown: ScorecardBreakdown;
}): Promise<ScorecardFeedback> {
  const summaryRows = input.rows.map((r) => ({
    q: r.questionText,
    a: r.transcript,
    strengths: r.evaluation.strengths,
    weaknesses: r.evaluation.weaknesses,
  }));

  const prompt = `Summarize this mock interview for a software engineering candidate.

Interview type: ${input.interviewType}
Aggregate composite score (0-100): ${input.breakdown.averages.composite}

Per-question data (JSON):
${JSON.stringify(summaryRows, null, 2)}

Write an honest, encouraging summary. topImprovements and practiceTopics must be concrete and non-repetitive.`;

  const modelCandidates = getFeedbackModelCandidates();
  let lastError: unknown;

  for (const modelName of modelCandidates) {
    try {
      const { output } = await withRetry(() =>
        withTimeout(
          generateText({
            model: google(modelName),
            output: Output.object({ schema: scorecardFeedbackSchema }),
            prompt,
          }),
          FEEDBACK_MODEL_TIMEOUT_MS,
          "Interview feedback generation timed out",
        ),
      );

      return output;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Interview feedback generation failed");
}

export function buildFallbackFeedback(input: {
  interviewType: InterviewType;
  rows: Row[];
  breakdown: ScorecardBreakdown;
}): ScorecardFeedback {
  const { averages } = input.breakdown;
  const weakAreas = [
    { key: "technical", value: averages.technical, label: "Technical depth and correctness" },
    { key: "clarity", value: averages.clarity, label: "Communication clarity and structure" },
    { key: "depth", value: averages.depth, label: "Depth of explanation and trade-offs" },
    { key: "behavioral", value: averages.behavioral, label: "Behavioral examples and ownership" },
  ]
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map((x) => x.label);

  const uniqueWeaknesses = Array.from(
    new Set(input.rows.flatMap((r) => r.evaluation.weaknesses).map((w) => w.trim()).filter(Boolean)),
  );
  const uniqueFollowUps = Array.from(
    new Set(input.rows.flatMap((r) => r.evaluation.followUpTopics).map((t) => t.trim()).filter(Boolean)),
  );

  const topImprovements = [
    ...weakAreas,
    ...uniqueWeaknesses,
    "Use a concise STAR-style structure for each answer",
  ].slice(0, 5);

  const practiceTopics = [
    ...uniqueFollowUps,
    input.interviewType === "behavioral"
      ? "Leadership, conflict resolution, and impact storytelling"
      : "Data structures, complexity analysis, and system design trade-offs",
    "Mock interview drills with timed responses",
  ].slice(0, 5);

  const readiness =
    averages.composite >= 75 ? "strong" : averages.composite >= 55 ? "mixed" : "needs_work";

  return scorecardFeedbackSchema.parse({
    summary: `Generated a fallback summary because AI feedback is temporarily unavailable. Your composite score is ${averages.composite}/100. Focus on the weakest scoring dimensions first, then rehearse concise, structured answers for stronger consistency.`,
    hireReadiness: readiness,
    topImprovements,
    practiceTopics,
  });
}
