import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ErrorBoundary } from "@/components/error-boundary";
import { InterviewRoom, type SessionPayload } from "@/components/interview/interview-room";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InterviewSessionPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await syncCurrentUser();

  const { id } = await params;

  const dbSession = await prisma.interviewSession.findFirst({
    where: { id, userId },
    include: {
      scorecard: true,
      questions: {
        orderBy: { order: "asc" },
        include: { answers: true },
      },
    },
  });

  if (!dbSession) {
    notFound();
  }

  if (dbSession.status === "completed" && dbSession.scorecard) {
    redirect(`/interview/report/${id}`);
  }

  const initialSession = JSON.parse(
    JSON.stringify({
      id: dbSession.id,
      status: dbSession.status,
      role: dbSession.role,
      difficulty: dbSession.difficulty,
      interviewType: dbSession.interviewType,
      config: dbSession.config,
      startedAt: dbSession.startedAt,
      completedAt: dbSession.completedAt,
      questions: dbSession.questions,
    }),
  ) as SessionPayload;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Mock interview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Session</h1>
        </div>
        <UserButton />
      </header>

      <ErrorBoundary>
        <InterviewRoom sessionId={id} initialSession={initialSession} />
      </ErrorBoundary>

      <Button variant="outline" size="sm" className="w-fit" asChild>
        <Link href="/interview/setup">Setup</Link>
      </Button>
    </div>
  );
}
