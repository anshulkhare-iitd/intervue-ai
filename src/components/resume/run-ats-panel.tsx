"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  resumeId: string;
  recentReportIds: { id: string; createdAt: string }[];
};

export function RunAtsPanel({ resumeId, recentReportIds }: Props) {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRun() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/ats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: targetRole.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        report?: { id: string };
      };
      if (!res.ok) {
        setError(body.error ?? "ATS analysis failed");
        return;
      }
      if (body.report?.id) {
        router.push(`/ats-report/${body.report.id}`);
        return;
      }
      setError("Unexpected response");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">ATS analysis</h3>
        <p className="text-muted-foreground text-xs">
          Optional target role (e.g. Senior frontend engineer) sharpens keyword gaps.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor={`target-role-${resumeId}`}>
          Target role
        </label>
        <input
          id={`target-role-${resumeId}`}
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="Target role (optional)"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-md"
          disabled={pending}
        />
        <Button type="button" onClick={onRun} disabled={pending} className="shrink-0">
          {pending ? "Analyzing…" : "Run ATS report"}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {recentReportIds.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium">Recent reports</p>
          <ul className="flex flex-wrap gap-2">
            {recentReportIds.map((r) => (
              <li key={r.id}>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link href={`/ats-report/${r.id}`}>
                    {new Date(r.createdAt).toLocaleString()}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
