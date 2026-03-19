import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InterviewSetupForm } from "@/components/interview/interview-setup-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

export default async function InterviewSetupPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await syncCurrentUser();

  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, parsedData: true },
  });

  const parsedResumes = resumes.filter((r) => r.parsedData !== null);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interview setup</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose a parsed resume and configure the mock interview. You will move to the live
            room next.
          </p>
        </div>
        <UserButton />
      </header>

      <InterviewSetupForm
        resumes={parsedResumes.map((r) => ({ id: r.id, fileName: r.fileName }))}
      />

      <Button variant="outline" size="sm" className="w-fit" asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
