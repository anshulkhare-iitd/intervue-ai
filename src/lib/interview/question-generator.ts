import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

import {
  generatedQuestionSchema,
  type GeneratedQuestion,
  type InterviewType,
} from "@/lib/interview/schema";
import type { ParsedResume } from "@/lib/resume/schema";

type PriorTurn = {
  questionText: string;
  transcript: string;
  followUpTopics: string[];
};

export async function generateNextQuestion(input: {
  profile: ParsedResume;
  role: string;
  difficulty: string;
  interviewType: InterviewType;
  focus?: string | null;
  priorTurns: PriorTurn[];
  questionIndex: number;
  maxQuestions: number;
}): Promise<{ question: GeneratedQuestion }> {
  const modelName = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const prior = input.priorTurns
    .slice(-3)
    .map(
      (t, i) =>
        `Turn ${i + 1}:\nQ: ${t.questionText}\nA: ${t.transcript}\nGaps/topics: ${t.followUpTopics.join("; ") || "none"}`,
    )
    .join("\n\n");

  const { object } = await generateObject({
    model: openai(modelName),
    schema: generatedQuestionSchema,
    prompt: `You are an expert software engineering interviewer. Produce ONE next interview question only.

Context:
- Role: ${input.role}
- Difficulty: ${input.difficulty}
- Interview type: ${input.interviewType} (technical emphasizes algorithms/systems; behavioral emphasizes collaboration/ownership; mixed balances both)
- Candidate profile (JSON): ${JSON.stringify(input.profile)}
- Question number (1-based): ${input.questionIndex + 1} of max ${input.maxQuestions}
${input.focus ? `- Focus areas: ${input.focus}` : ""}

Prior conversation (last up to 3 turns):
${prior || "None yet — this is the opening question."}

Rules:
- Ask only one clear question.
- Adapt: if prior answers were vague, ask a short follow-up that drills deeper.
- Stay relevant to the resume and role; do not fabricate experience.
- metadata.intent: short label for why you're asking.
- metadata.skillTags: 1–4 tags.
- metadata.isFollowUp: true if following up on a prior weak answer.`,
  });

  return { question: object };
}
