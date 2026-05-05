"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

export function ResumeUploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError("Choose a PDF or DOCX file first.");
      return;
    }

    setPending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resumes", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Upload failed");
        return;
      }
      setSuccess(true);
      form.reset();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Upload resume</h2>
        <p className="text-muted-foreground text-sm">
          PDF or DOCX, up to 5&nbsp;MB. Files are stored securely for parsing and later ATS
          analysis.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="resume-file" className="text-sm font-medium">
            File
          </label>
          <input
            id="resume-file"
            name="file"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="text-muted-foreground text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {success ? (
        <p className="text-sm text-green-600 dark:text-green-400">Resume uploaded successfully.</p>
      ) : null}
    </form>
  );
}
