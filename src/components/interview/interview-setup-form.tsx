"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DIFFICULTIES, INTERVIEW_TYPES } from "@/lib/interview/schema";

type ResumeOption = { id: string; fileName: string | null };

type Props = {
  resumes: ResumeOption[];
};

export function InterviewSetupForm({ resumes }: Props) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? "");
  const [role, setRole] = useState("Senior software engineer");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("medium");
  const [interviewType, setInterviewType] = useState<(typeof INTERVIEW_TYPES)[number]>("mixed");
  const [focus, setFocus] = useState("");
  const [maxQuestions, setMaxQuestions] = useState(6);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!resumeId) {
      setError("Select a resume.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          role,
          difficulty,
          interviewType,
          focus: focus.trim() || undefined,
          maxQuestions,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; session?: { id: string } };
      if (!res.ok) {
        setError(body.error ?? "Could not start session");
        return;
      }
      if (body.session?.id) {
        router.push(`/interview/session/${body.session.id}`);
      }
    } finally {
      setPending(false);
    }
  }

  if (resumes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Upload and parse a resume first, then return here to configure a mock interview.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="space-y-2">
        <label htmlFor="resume" className="text-sm font-medium">
          Resume
        </label>
        <select
          id="resume"
          value={resumeId}
          onChange={(e) => setResumeId(e.target.value)}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          disabled={pending}
        >
          {resumes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fileName ?? r.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium">
          Role
        </label>
        <input
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          disabled={pending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="difficulty" className="text-sm font-medium">
            Difficulty
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            disabled={pending}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="type" className="text-sm font-medium">
            Interview type
          </label>
          <select
            id="type"
            value={interviewType}
            onChange={(e) =>
              setInterviewType(e.target.value as (typeof INTERVIEW_TYPES)[number])
            }
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            disabled={pending}
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="focus" className="text-sm font-medium">
          Focus (optional)
        </label>
        <input
          id="focus"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g. React performance, system design"
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="maxq" className="text-sm font-medium">
          Max questions
        </label>
        <input
          id="maxq"
          type="number"
          min={3}
          max={8}
          value={maxQuestions}
          onChange={(e) => setMaxQuestions(Number(e.target.value))}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          disabled={pending}
        />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Starting…" : "Start interview"}
      </Button>
    </form>
  );
}
