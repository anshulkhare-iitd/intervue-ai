import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-24">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            IntervueAI
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Mock interviews & resume tooling
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Sign in to upload a resume, run ATS analysis, and practice adaptive interviews.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="rounded-full" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button variant="outline" className="rounded-full" asChild>
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </main>
    </div>
  );
}
