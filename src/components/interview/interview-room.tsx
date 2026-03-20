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

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  if ("SpeechRecognition" in window) {
    return window.SpeechRecognition as SpeechRecognitionConstructor;
  }
  if (window.webkitSpeechRecognition) {
    return window.webkitSpeechRecognition;
  }
  return null;
}

export function InterviewRoom({ sessionId, initialSession }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload>(initialSession);
  const [error, setError] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const bootstrapped = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeQuestionIdRef = useRef<string | null>(null);
  const speechTextRef = useRef("");

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

  const draftKey = useMemo(() => {
    return currentQuestion ? `interview-draft:${sessionId}:${currentQuestion.id}` : null;
  }, [currentQuestion, sessionId]);

  const allAnswered = useMemo(() => {
    if (!session || session.questions.length === 0) return false;
    return session.questions.every((q) => q.answers.length > 0);
  }, [session]);

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionConstructor() !== null);
  }, []);

  useEffect(() => {
    if (!currentQuestion || !draftKey) return;
    if (activeQuestionIdRef.current === currentQuestion.id) return;

    activeQuestionIdRef.current = currentQuestion.id;
    let cancelled = false;

    setTimeout(() => {
      if (cancelled) return;
      const saved = localStorage.getItem(draftKey);
      startTransition(() => {
        setAnswerText(saved ?? "");
      });
    }, 0);

    return () => {
      cancelled = true;
    };
  }, [currentQuestion, draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    localStorage.setItem(draftKey, answerText);
  }, [answerText, draftKey]);

  useEffect(() => {
    if (!currentQuestion || !ttsEnabled || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.questionText);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentQuestion, ttsEnabled]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
      recognitionRef.current?.stop();
      if (draftKey) localStorage.removeItem(draftKey);
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

  function startListening() {
    if (!currentQuestion || busy) return;
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    recognitionRef.current?.stop();
    speechTextRef.current = "";
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let full = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const transcript = event.results[i]?.[0]?.transcript ?? "";
        full += `${transcript} `;
      }
      speechTextRef.current = full.trim();
      startTransition(() => {
        setAnswerText(speechTextRef.current);
      });
    };

    rec.onerror = () => {
      startTransition(() => {
        setListening(false);
      });
    };

    rec.onend = () => {
      startTransition(() => {
        setListening(false);
      });
    };

    setError(null);
    setListening(true);
    rec.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
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
          <div className="flex flex-wrap items-center gap-2">
            {speechSupported ? (
              listening ? (
                <Button type="button" variant="secondary" onClick={stopListening} disabled={busy}>
                  Stop mic
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={startListening} disabled={busy}>
                  Start mic
                </Button>
              )
            ) : (
              <span className="text-muted-foreground text-xs">
                Browser mic dictation unavailable
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setTtsEnabled((v) => !v)}
              disabled={busy}
            >
              {ttsEnabled ? "Read-aloud on" : "Read-aloud off"}
            </Button>
            {listening ? (
              <span className="text-muted-foreground text-xs">Listening… speak naturally.</span>
            ) : null}
          </div>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={6}
            placeholder="Type your answer…"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-36 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
          />
          <p className="text-muted-foreground text-xs">
            Draft autosaves for this question. You can refresh and continue.
          </p>
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
