import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";

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
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const summaryRows = input.rows.map((r) => ({
    q: r.questionText,
    a: r.transcript,
    strengths: r.evaluation.strengths,
    weaknesses: r.evaluation.weaknesses,
  }));

  const { output } = await generateText({
    model: google(modelName),
    output: Output.object({ schema: scorecardFeedbackSchema }),
    prompt: `Summarize this mock interview for a software engineering candidate.

Interview type: ${input.interviewType}
Aggregate composite score (0-100): ${input.breakdown.averages.composite}

Per-question data (JSON):
${JSON.stringify(summaryRows, null, 2)}

Write an honest, encouraging summary. topImprovements and practiceTopics must be concrete and non-repetitive.`,
  });

  return output;
}
