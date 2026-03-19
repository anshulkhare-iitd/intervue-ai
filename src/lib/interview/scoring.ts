import type { AnswerEvaluation } from "@/lib/interview/schema";
import type { InterviewType } from "@/lib/interview/schema";

export function compositeScore(
  evaluation: AnswerEvaluation,
  interviewType: InterviewType,
): number {
  const { technical, clarity, depth, behavioral } = evaluation.scores;

  if (interviewType === "technical") {
    return Math.round(technical * 0.5 + clarity * 0.25 + depth * 0.25);
  }

  if (interviewType === "behavioral") {
    return Math.round(
      technical * 0.15 + clarity * 0.3 + depth * 0.25 + behavioral * 0.3,
    );
  }

  return Math.round(
    technical * 0.35 + clarity * 0.2 + depth * 0.2 + behavioral * 0.25,
  );
}
