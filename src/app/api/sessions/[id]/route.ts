import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { syncCurrentUser } from "@/lib/sync-user";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncCurrentUser();

  const { id } = await context.params;

  const session = await prisma.interviewSession.findFirst({
    where: { id, userId },
    include: {
      resume: { select: { id: true, fileName: true } },
      scorecard: true,
      questions: {
        orderBy: { order: "asc" },
        include: {
          answers: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}
