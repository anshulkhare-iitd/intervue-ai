import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { syncCurrentUser } from "@/lib/sync-user";

export default async function DashboardPage() {
  await syncCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <UserButton />
      </header>
      <p className="text-muted-foreground text-sm">
        Resumes and interview sessions will appear here in upcoming milestones.
      </p>
      <Button variant="outline" size="sm" className="w-fit" asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
