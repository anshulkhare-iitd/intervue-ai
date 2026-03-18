import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ParsedResumePreview } from "@/components/resume/parsed-preview";
import { ParseResumeButton } from "@/components/resume/parse-resume-button";
import { RunAtsPanel } from "@/components/resume/run-ats-panel";
import { ResumeUploadForm } from "@/components/resume/resume-upload-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

export default async function ResumePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await syncCurrentUser();

  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      atsReports: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true },
      },
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload a resume, then run AI parsing to unlock ATS and interview features.
          </p>
        </div>
        <UserButton />
      </header>

      <ResumeUploadForm />

      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Your resumes</h2>
        {resumes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No uploads yet.</p>
        ) : (
          <ul className="space-y-6">
            {resumes.map((r) => (
              <li
                key={r.id}
                className="bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{r.fileName ?? "Resume"}</p>
                    <p className="text-muted-foreground text-xs">
                      Added {r.createdAt.toLocaleString()}
                      {r.mimeType ? ` · ${r.mimeType}` : null}
                    </p>
                  </div>
                  <ParseResumeButton resumeId={r.id} />
                </div>

                {r.parsedData ? (
                  <>
                    <ParsedResumePreview parsedData={r.parsedData} />
                    <RunAtsPanel
                      resumeId={r.id}
                      recentReportIds={r.atsReports.map((a) => ({
                        id: a.id,
                        createdAt: a.createdAt.toISOString(),
                      }))}
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Parsed profile will appear here after you run the parser.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button variant="outline" size="sm" className="w-fit" asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
