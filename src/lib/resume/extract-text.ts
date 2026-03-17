import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ALLOWED_MIMES = new Set<string>([PDF_MIME, DOCX_MIME]);

export function allowedResumeMimeTypes(): string[] {
  return [PDF_MIME, DOCX_MIME];
}

export function isAllowedResumeMimeType(mime: string | null | undefined): boolean {
  return !!mime && ALLOWED_MIMES.has(mime);
}

/** Infer MIME from filename when the browser sends an empty type. */
export function inferMimeFromFileName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return PDF_MIME;
  if (lower.endsWith(".docx")) return DOCX_MIME;
  return null;
}

export async function extractPlainText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === PDF_MIME) {
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      return textResult.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === DOCX_MIME) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  }

  throw new Error(`Unsupported MIME type: ${mimeType}`);
}
