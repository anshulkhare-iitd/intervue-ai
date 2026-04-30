import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";

import { answerEvaluationSchema, type AnswerEvaluation } from "@/lib/interview/schema";
import type { InterviewType } from "@/lib/interview/schema";

export async function evaluateAnswer(input: {
  questionText: string;
  transcript: string;
  interviewType: InterviewType;
  difficulty: string;
}): Promise<{ evaluation: AnswerEvaluation }> {
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const typeHint =
    input.interviewType === "technical"
      ? "Weight technical depth and correctness highly."
      : input.interviewType === "behavioral"
        ? "Weight communication, ownership, and collaboration evidence highly."
        : "Balance technical and behavioral signals.";

  const { output } = await generateText({
    model: google(modelName),
    output: Output.object({ schema: answerEvaluationSchema }),
    prompt: `You evaluate a mock interview answer for a software engineering candidate.

${typeHint}
Difficulty: ${input.difficulty}

Question:
${input.questionText}

Candidate answer:
${input.transcript}

Return structured scores 0–100 per axis, concrete strengths/weaknesses, an improved concise sample answer, and 0–3 followUpTopics if the answer was vague or missing depth.`,
  });

  return { evaluation: output };
}
