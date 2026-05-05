import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

export default async function DashboardPage() {
  await syncCurrentUser();

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { scorecard: { select: { id: true } } },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <UserButton />
      </header>
      <p className="text-muted-foreground text-sm">
        Upload and parse a resume, then start a mock interview from setup.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href="/resume">Resume & upload</Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href="/interview/setup">Mock interview</Link>
        </Button>

      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">Recent sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No interviews yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{s.role}</p>
                  <p className="text-muted-foreground text-xs">
                    {s.interviewType} · {s.status}
                    {s.completedAt
                      ? ` · ${s.completedAt.toLocaleString()}`
                      : ` · ${s.createdAt.toLocaleString()}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.status !== "completed" ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/interview/session/${s.id}`}>Continue</Link>
                    </Button>
                  ) : null}
                  {s.scorecard ? (
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/interview/report/${s.id}`}>Scorecard</Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
