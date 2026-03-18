import type { AtsReportPayload } from "@/lib/ats/schema";

type Props = {
  targetRole: string | null;
  createdAt: Date;
  payload: AtsReportPayload;
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{score}</span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

export function AtsReportView({ targetRole, createdAt, payload }: Props) {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        {targetRole ? (
          <p className="text-muted-foreground text-sm">
            Target role: <span className="text-foreground font-medium">{targetRole}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">General software-engineering assessment</p>
        )}
        <p className="text-muted-foreground text-xs">
          Generated {createdAt.toLocaleString()}
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{payload.headline}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
              {payload.summary}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div
              className="border-primary text-primary flex size-28 flex-col items-center justify-center rounded-full border-4"
              role="img"
              aria-label={`Overall ATS score ${payload.overallScore} out of 100`}
            >
              <span className="text-3xl font-semibold tabular-nums">{payload.overallScore}</span>
              <span className="text-muted-foreground text-xs">/ 100</span>
            </div>
            <span className="text-muted-foreground text-xs">Overall</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border p-5">
          <h3 className="text-sm font-semibold tracking-tight">Keywords</h3>
          <ScoreBar label="Coverage" score={payload.keywords.score} />
          {payload.keywords.found.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                Matched
              </p>
              <ul className="flex flex-wrap gap-2">
                {payload.keywords.found.map((k) => (
                  <li
                    key={k}
                    className="bg-muted text-foreground rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {payload.keywords.missing.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                Gaps
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {payload.keywords.missing.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-5">
          <h3 className="text-sm font-semibold tracking-tight">Experience bullets</h3>
          <ScoreBar label="Quality" score={payload.bulletQuality.score} />
          {payload.bulletQuality.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bullet issues flagged.</p>
          ) : (
            <ul className="space-y-4">
              {payload.bulletQuality.items.map((item, i) => (
                <li key={i} className="space-y-1 border-l-2 pl-3 text-sm">
                  <p className="text-muted-foreground italic">&ldquo;{item.excerpt}&rdquo;</p>
                  <p>
                    <span className="font-medium">Issue:</span> {item.problem}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span> {item.rewriteHint}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold tracking-tight">Structure & format</h3>
        <div className="mt-4 space-y-4">
          <ScoreBar label="Score" score={payload.structureAndFormat.score} />
          {payload.structureAndFormat.positives.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                Working well
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {payload.structureAndFormat.positives.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {payload.structureAndFormat.improvements.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                Improvements
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {payload.structureAndFormat.improvements.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {payload.nextSteps.length > 0 && (
        <section className="rounded-lg border border-dashed p-5">
          <h3 className="text-sm font-semibold tracking-tight">Priority actions</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {payload.nextSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
