import type { ScorecardBreakdown, ScorecardFeedback } from "@/lib/interview/schema";

type Props = {
  overallScore: number | null;
  breakdown: ScorecardBreakdown;
  feedback: ScorecardFeedback;
};

export function ScorecardReport({ overallScore, breakdown, feedback }: Props) {
  const readinessLabel =
    feedback.hireReadiness === "strong"
      ? "Strong signal"
      : feedback.hireReadiness === "mixed"
        ? "Mixed signal"
        : "Needs work";

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Scorecard
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{readinessLabel}</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            {feedback.summary}
          </p>
        </div>
        <div
          className="border-primary text-primary flex size-28 flex-col items-center justify-center self-start rounded-full border-4 sm:self-auto"
          role="img"
          aria-label={`Overall score ${overallScore ?? breakdown.averages.composite} out of 100`}
        >
          <span className="text-3xl font-semibold tabular-nums">
            {overallScore ?? breakdown.averages.composite}
          </span>
          <span className="text-muted-foreground text-xs">/ 100</span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Averages</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Technical</dt>
              <dd className="tabular-nums">{breakdown.averages.technical}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Clarity</dt>
              <dd className="tabular-nums">{breakdown.averages.clarity}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Depth</dt>
              <dd className="tabular-nums">{breakdown.averages.depth}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Behavioral</dt>
              <dd className="tabular-nums">{breakdown.averages.behavioral}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t pt-2 font-medium">
              <dt>Composite</dt>
              <dd className="tabular-nums">{breakdown.averages.composite}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Per answer</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {breakdown.perAnswer.map((p) => (
              <li key={p.answerId} className="flex justify-between gap-2">
                <span className="text-muted-foreground">Q{p.questionOrder + 1}</span>
                <span className="tabular-nums">{p.composite}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-dashed p-4">
          <h3 className="text-sm font-semibold">Top improvements</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {feedback.topImprovements.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </div>
        <div className="rounded-lg border border-dashed p-4">
          <h3 className="text-sm font-semibold">Practice topics</h3>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            {feedback.practiceTopics.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
