import { Injectable, HttpException } from "@nestjs/common";
import { ErrorCode } from "@cvbuilder/shared";
import { marked } from "marked";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const PUPPETEER_EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function buildHtml(markdown: string): string {
  const body = marked.parse(markdown) as string;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2.5cm; }
  body {
    font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans CN", sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #2D2D2D;
  }
  h1 { font-size: 18pt; font-weight: 700; margin-bottom: 0.3cm; }
  h2 { font-size: 13pt; font-weight: 600; margin-top: 0.6cm; margin-bottom: 0.2cm; border-bottom: 1px solid #D4D4D4; padding-bottom: 0.1cm; }
  h3 { font-size: 11pt; font-weight: 600; margin-top: 0.4cm; margin-bottom: 0.15cm; }
  p { margin: 0.15cm 0; }
  ul { margin: 0.1cm 0; padding-left: 1.2em; }
  li { margin-bottom: 0.08cm; }
  strong { font-weight: 600; color: #B75C3A; }
</style>
</head>
<body>${body}</body>
</html>`;
}

function stripInlineFormatting(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

function parseInlineFormatting(text: string): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const runs: TextRun[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      if (inner) runs.push(new TextRun({ text: inner, bold: true, color: "#B75C3A" }));
    } else {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs;
}

function markdownToDocxElements(markdown: string): Paragraph[] {
  const lines = markdown.split("\n");
  const elements: Paragraph[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        new Paragraph({
          text: stripInlineFormatting(line.slice(4)),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 120 },
        })
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        new Paragraph({
          text: stripInlineFormatting(line.slice(3)),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 160 },
        })
      );
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(
        new Paragraph({
          text: stripInlineFormatting(line.slice(2)),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 200 },
        })
      );
      i++;
      continue;
    }

    if (line.match(/^- /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^- /)) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      listItems.forEach((item) => {
        elements.push(
          new Paragraph({
            children: parseInlineFormatting(item),
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      });
      continue;
    }

    elements.push(
      new Paragraph({
        children: parseInlineFormatting(line),
        spacing: { after: 120 },
      })
    );
    i++;
  }

  return elements;
}

let puppeteer: any = null;
async function getBrowser() {
  if (!puppeteer) {
    puppeteer = await import("puppeteer-core");
  }
  return puppeteer.launch({
    executablePath: PUPPETEER_EXECUTABLE,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
}

@Injectable()
export class ExportService {
  async exportPdf(markdown: string): Promise<Buffer> {
    if (!markdown || markdown.trim().length < 50) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "内容太短" }, 400);
    }

    try {
      const html = buildHtml(markdown);
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 10000 });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();
      return Buffer.from(pdf);
    } catch (err) {
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "PDF生成失败" }, 500);
    }
  }

  async exportDocx(markdown: string): Promise<Buffer> {
    if (!markdown || markdown.trim().length < 50) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "内容太短" }, 400);
    }

    try {
      const children = markdownToDocxElements(markdown);
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
              },
            },
            children,
          },
        ],
      });
      return await Packer.toBuffer(doc);
    } catch (err) {
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "DOCX生成失败" }, 500);
    }
  }
}
