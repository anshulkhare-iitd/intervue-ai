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
        Upload a resume and run parsing from the resume workspace. Interview sessions will show
        here in a later milestone.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href="/resume">Resume & upload</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
