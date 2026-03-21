import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  inferMimeFromFileName,
  isAllowedResumeMimeType,
} from "@/lib/resume/extract-text";
import { syncCurrentUser } from "@/lib/sync-user";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncCurrentUser();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Server misconfigured: BLOB_READ_WRITE_TOKEN is not set" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Expected multipart field "file"' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const mimeType = file.type || inferMimeFromFileName(file.name);
  if (!mimeType || !isAllowedResumeMimeType(mimeType)) {
    return NextResponse.json({ error: "Only PDF and DOCX files are allowed" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(0, 120);
  const pathname = `resumes/${userId}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, buffer, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: mimeType,
  });

  const resume = await prisma.resume.create({
    data: {
      userId,
      storageKey: blob.url,
      fileName: file.name,
      mimeType,
    },
  });

  return NextResponse.json({ resume });
}
