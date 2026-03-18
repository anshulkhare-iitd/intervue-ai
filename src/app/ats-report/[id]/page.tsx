import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AtsReportView } from "@/components/ats/ats-report-view";
import { Button } from "@/components/ui/button";
import { atsReportPayloadSchema } from "@/lib/ats/schema";
import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AtsReportPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await syncCurrentUser();

  const { id } = await params;

  const report = await prisma.atsReport.findFirst({
    where: {
      id,
      resume: { userId },
    },
    include: {
      resume: { select: { id: true, fileName: true } },
    },
  });

  if (!report) {
    notFound();
  }

  const parsed = atsReportPayloadSchema.safeParse(report.suggestions);
  if (!parsed.success) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-destructive text-sm">
          This report could not be loaded. The stored data may be from an older format.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/resume">Back to resumes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            ATS report
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {report.resume.fileName ?? "Resume"}
          </h1>
        </div>
        <UserButton />
      </header>

      <AtsReportView
        targetRole={report.targetRole}
        createdAt={report.createdAt}
        payload={parsed.data}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/resume">Back to resumes</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
