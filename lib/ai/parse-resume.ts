// lib/ai/parse-resume.ts
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

export type ParsedResume = {
  text: string;
  pageCount?: number;
};

export async function parseResumeFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ParsedResume> {
  if (
    mimeType === "application/pdf" ||
    mimeType === "application/x-pdf"
  ) {
    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");
      pages.push(pageText);
    }

    return {
      text: pages.join("\n\n"),
      pageCount: doc.numPages,
    };
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
    };
  }

  if (mimeType === "text/plain") {
    return {
      text: buffer.toString("utf-8"),
    };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
