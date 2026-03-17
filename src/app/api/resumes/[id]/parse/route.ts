import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { extractPlainText } from "@/lib/resume/extract-text";
import { parseResumeFromPlainText } from "@/lib/resume/parse-resume";
import { resumeParsedDataSchema } from "@/lib/resume/schema";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const resume = await prisma.resume.findFirst({
    where: { id, userId },
  });

  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!resume.storageKey) {
    return NextResponse.json({ error: "Resume has no stored file" }, { status: 400 });
  }

  if (!resume.mimeType) {
    return NextResponse.json({ error: "Unknown file type" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const fileRes = await fetch(resume.storageKey);
  if (!fileRes.ok) {
    return NextResponse.json({ error: "Failed to load file from storage" }, { status: 502 });
  }

  const buf = Buffer.from(await fileRes.arrayBuffer());
  const plain = await extractPlainText(buf, resume.mimeType);

  if (!plain.trim()) {
    return NextResponse.json(
      { error: "No extractable text found in this file" },
      { status: 422 },
    );
  }

  const parsed = await parseResumeFromPlainText(plain);

  const parsedData = resumeParsedDataSchema.parse({
    profile: parsed.profile,
    rawTextLength: parsed.rawTextLength,
    rawTextPreview: parsed.rawTextPreview,
    model: parsed.model,
    parsedAt: new Date().toISOString(),
  });

  const updated = await prisma.resume.update({
    where: { id },
    data: { parsedData },
  });

  return NextResponse.json({ resume: updated });
}
