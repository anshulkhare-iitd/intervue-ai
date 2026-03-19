"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { sessionSetupConfigSchema } from "@/lib/interview/schema";

type AnswerRow = {
  id: string;
  transcript: string;
  evaluation: unknown;
};

type QuestionRow = {
  id: string;
  order: number;
  questionText: string;
  metadata: unknown;
  answers: AnswerRow[];
};

export type SessionPayload = {
  id: string;
  status: string;
  role: string;
  difficulty: string;
  interviewType: string;
  config: unknown;
  startedAt: string | null;
  completedAt: string | null;
  questions: QuestionRow[];
};

type Props = {
  sessionId: string;
  initialSession: SessionPayload;
};

export function InterviewRoom({ sessionId, initialSession }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload>(initialSession);
  const [error, setError] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [busy, setBusy] = useState(false);
  const bootstrapped = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const data = (await res.json()) as { error?: string; session?: SessionPayload };
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load session");
    }
    const next = data.session;
    if (!next) {
      throw new Error("Missing session");
    }
    startTransition(() => {
      setSession(next);
    });
    if (next.status === "completed") {
      router.replace(`/interview/report/${sessionId}`);
    }
  }, [sessionId, router]);

  const maxQuestions = useMemo(() => {
    const p = sessionSetupConfigSchema.safeParse(session?.config ?? {});
    return p.success ? p.data.maxQuestions : 6;
  }, [session?.config]);

  const currentQuestion = useMemo(() => {
    if (!session) return null;
    return session.questions.find((q) => q.answers.length === 0) ?? null;
  }, [session]);

  const allAnswered = useMemo(() => {
    if (!session || session.questions.length === 0) return false;
    return session.questions.every((q) => q.answers.length > 0);
  }, [session]);

  useEffect(() => {
    if (!session || session.status === "completed") return;
    if (bootstrapped.current) return;
    if (session.questions.length > 0) {
      bootstrapped.current = true;
      return;
    }
    bootstrapped.current = true;
    void (async () => {
      startTransition(() => {
        setBusy(true);
        setError(null);
      });
      try {
        const res = await fetch(`/api/sessions/${sessionId}/questions/next`, {
          method: "POST",
        });
        const data = (await res.json()) as { error?: string; done?: boolean };
        if (!res.ok) {
          startTransition(() => {
            setError(data.error ?? "Could not load first question");
          });
          return;
        }
        await load();
      } catch (e) {
        startTransition(() => {
          setError(e instanceof Error ? e.message : "Error");
        });
      } finally {
        startTransition(() => {
          setBusy(false);
        });
      }
    })();
  }, [session, sessionId, load]);

  async function submitAnswer() {
    if (!session || !currentQuestion) return;
    const text = answerText.trim();
    if (!text) {
      setError("Write an answer before submitting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQuestion.id, transcript: text }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Submit failed");
        return;
      }
      setAnswerText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function fetchNextQuestion() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/questions/next`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; done?: boolean; message?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not get next question");
        return;
      }
      if (data.done) {
        await load();
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get next question");
    } finally {
      setBusy(false);
    }
  }

  async function completeInterview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/complete`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not complete");
        return;
      }
      router.push(`/interview/report/${sessionId}`);
    } finally {
      setBusy(false);
    }
  }

  const canAskMore = session.questions.length < maxQuestions;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
        <span>{session.role}</span>
        <span>·</span>
        <span>{session.difficulty}</span>
        <span>·</span>
        <span>{session.interviewType}</span>
        <span>·</span>
        <span>
          Question {Math.min(session.questions.length, maxQuestions)} / {maxQuestions}
        </span>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {currentQuestion ? (
        <div className="space-y-4 rounded-lg border p-5">
          <p className="text-sm font-medium leading-relaxed">{currentQuestion.questionText}</p>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={6}
            placeholder="Type your answer…"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-36 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
          />
          <Button type="button" onClick={submitAnswer} disabled={busy}>
            {busy ? "Saving…" : "Submit answer"}
          </Button>
        </div>
      ) : null}

      {!currentQuestion && allAnswered && canAskMore ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-5">
          <p className="text-muted-foreground text-sm">
            Continue to the next question, or finish now and generate your scorecard.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={fetchNextQuestion} disabled={busy}>
              {busy ? "Loading…" : "Next question"}
            </Button>
            <Button type="button" variant="outline" onClick={completeInterview} disabled={busy}>
              Finish & view scorecard
            </Button>
          </div>
        </div>
      ) : null}

      {!currentQuestion && allAnswered && !canAskMore ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-5">
          <p className="text-muted-foreground text-sm">
            You have reached the question limit. Generate your scorecard when you are ready.
          </p>
          <Button type="button" onClick={completeInterview} disabled={busy}>
            {busy ? "Finishing…" : "Finish & view scorecard"}
          </Button>
        </div>
      ) : null}

      {currentQuestion === null && session.questions.length === 0 && busy ? (
        <p className="text-muted-foreground text-sm">Preparing your first question…</p>
      ) : null}

      <Button variant="outline" size="sm" className="w-fit" asChild>
        <Link href="/dashboard">Exit to dashboard</Link>
      </Button>
    </div>
  );
}
