import { z } from "zod";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const INTERVIEW_TYPES = ["technical", "behavioral", "mixed"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const SESSION_STATUSES = ["draft", "in_progress", "completed"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** Stored in `InterviewSession.config`. */
export const sessionSetupConfigSchema = z.object({
  focus: z.string().optional(),
  maxQuestions: z.number().int().min(3).max(8),
});

export type SessionSetupConfig = z.infer<typeof sessionSetupConfigSchema>;

export const questionMetadataSchema = z.object({
  intent: z.string(),
  skillTags: z.array(z.string()),
  isFollowUp: z.boolean(),
});

export type QuestionMetadata = z.infer<typeof questionMetadataSchema>;

export const generatedQuestionSchema = z.object({
  questionText: z.string(),
  metadata: questionMetadataSchema,
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const answerEvaluationSchema = z.object({
  scores: z.object({
    technical: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
    depth: z.number().min(0).max(100),
    behavioral: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  improvedAnswer: z.string(),
  followUpTopics: z.array(z.string()),
});

export type AnswerEvaluation = z.infer<typeof answerEvaluationSchema>;

export const scorecardFeedbackSchema = z.object({
  summary: z.string(),
  hireReadiness: z.enum(["strong", "mixed", "needs_work"]),
  topImprovements: z.array(z.string()).max(5),
  practiceTopics: z.array(z.string()).max(5),
});

export type ScorecardFeedback = z.infer<typeof scorecardFeedbackSchema>;

export const scorecardBreakdownSchema = z.object({
  averages: z.object({
    technical: z.number(),
    clarity: z.number(),
    depth: z.number(),
    behavioral: z.number(),
    composite: z.number(),
  }),
  perAnswer: z.array(
    z.object({
      questionOrder: z.number(),
      questionId: z.string(),
      answerId: z.string(),
      composite: z.number(),
    }),
  ),
});

export type ScorecardBreakdown = z.infer<typeof scorecardBreakdownSchema>;
