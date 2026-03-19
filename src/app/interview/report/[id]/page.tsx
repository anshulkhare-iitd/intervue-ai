import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ScorecardReport } from "@/components/interview/scorecard-report";
import { Button } from "@/components/ui/button";
import { scorecardBreakdownSchema, scorecardFeedbackSchema } from "@/lib/interview/schema";
import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InterviewReportPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await syncCurrentUser();

  const { id } = await params;

  const session = await prisma.interviewSession.findFirst({
    where: { id, userId },
    include: { scorecard: true },
  });

  if (!session) {
    notFound();
  }

  if (!session.scorecard) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-muted-foreground text-sm">
          No scorecard yet. Complete the interview from the session page first.
        </p>
        <Button className="mt-4" asChild>
          <Link href={`/interview/session/${id}`}>Go to session</Link>
        </Button>
      </div>
    );
  }

  const breakdown = scorecardBreakdownSchema.safeParse(session.scorecard.breakdown);
  const feedback = scorecardFeedbackSchema.safeParse(session.scorecard.feedback);

  if (!breakdown.success || !feedback.success) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-destructive text-sm">Scorecard data could not be read.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Interview report
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{session.role}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {session.interviewType} · {session.difficulty}
          </p>
        </div>
        <UserButton />
      </header>

      <ScorecardReport
        overallScore={session.scorecard.overallScore}
        breakdown={breakdown.data}
        feedback={feedback.data}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/interview/setup">New interview</Link>
        </Button>
      </div>
    </div>
  );
}
