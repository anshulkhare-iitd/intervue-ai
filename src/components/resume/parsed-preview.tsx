import { resumeParsedDataSchema } from "@/lib/resume/schema";

type Props = {
  parsedData: unknown;
};

export function ParsedResumePreview({ parsedData }: Props) {
  const result = resumeParsedDataSchema.safeParse(parsedData);
  if (!result.success) {
    return (
      <p className="text-destructive text-sm">
        Stored profile data could not be read. Try parsing again.
      </p>
    );
  }

  const { profile, rawTextLength, parsedAt, model } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Parsed {new Date(parsedAt).toLocaleString()}
          {model ? ` · ${model}` : null}
        </span>
        <span>{rawTextLength.toLocaleString()} characters extracted</span>
      </div>

      {(profile.headline || profile.summary) && (
        <section className="space-y-2">
          {profile.headline ? (
            <h3 className="text-base font-semibold tracking-tight">{profile.headline}</h3>
          ) : null}
          {profile.summary ? (
            <p className="text-muted-foreground text-sm leading-relaxed">{profile.summary}</p>
          ) : null}
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-medium">Skills</h4>
          <ul className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <li
                key={s}
                className="bg-muted text-foreground rounded-full px-3 py-1 text-xs font-medium"
              >
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.experience.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-sm font-medium">Experience</h4>
          <ul className="space-y-4">
            {profile.experience.map((ex, i) => (
              <li key={`${ex.company}-${ex.title}-${i}`} className="border-l-2 pl-4">
                <p className="font-medium">
                  {ex.title}
                  {ex.company ? ` · ${ex.company}` : null}
                </p>
                {(ex.start || ex.end) && (
                  <p className="text-muted-foreground text-xs">
                    {ex.start ?? "?"}
                    {ex.start || ex.end ? " — " : null}
                    {ex.end ?? "?"}
                  </p>
                )}
                {ex.bullets.length > 0 && (
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {ex.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.projects.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-sm font-medium">Projects</h4>
          <ul className="space-y-3">
            {profile.projects.map((p, i) => (
              <li key={`${p.name}-${i}`} className="rounded-md border p-3">
                <p className="font-medium">{p.name}</p>
                {p.description ? (
                  <p className="text-muted-foreground mt-1 text-sm">{p.description}</p>
                ) : null}
                {p.tech && p.tech.length > 0 ? (
                  <p className="text-muted-foreground mt-2 text-xs">{p.tech.join(" · ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.education.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-medium">Education</h4>
          <ul className="space-y-2 text-sm">
            {profile.education.map((ed, i) => (
              <li key={`${ed.school}-${i}`}>
                <span className="font-medium">{ed.school}</span>
                {ed.degree ? <span className="text-muted-foreground"> — {ed.degree}</span> : null}
                {ed.year ? <span className="text-muted-foreground"> ({ed.year})</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.keywords.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-medium">Keywords</h4>
          <p className="text-muted-foreground text-sm">{profile.keywords.join(", ")}</p>
        </section>
      )}
    </div>
  );
}
