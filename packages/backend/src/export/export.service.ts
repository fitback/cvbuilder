import { Injectable, HttpException, OnApplicationShutdown } from "@nestjs/common";
import { ErrorCode } from "@cvbuilder/shared";
import { marked } from "marked";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { TemplatesService } from "../templates/templates.service";
import type { TemplateInput } from "../templates/template.interface";

const PUPPETEER_EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

let puppeteerModule: any = null;
let browserInstance: any = null;

async function getBrowser() {
  if (browserInstance) {
    try {
      // Verify the browser process is still alive
      const wsEndpoint = browserInstance.wsEndpoint();
      if (wsEndpoint) return browserInstance;
    } catch {
      browserInstance = null;
    }
  }
  if (!puppeteerModule) {
    puppeteerModule = await import("puppeteer-core");
  }
  browserInstance = await puppeteerModule.launch({
    executablePath: PUPPETEER_EXECUTABLE,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  return browserInstance;
}

@Injectable()
export class ExportService implements OnApplicationShutdown {
  constructor(private readonly templates: TemplatesService) {}

  async onApplicationShutdown() {
    if (browserInstance) {
      try { await browserInstance.close(); } catch { /* ignore */ }
      browserInstance = null;
    }
  }

  /**
   * Render a resume to a complete HTML document using the specified template.
   * Exposed publicly so the preview endpoint can return the same HTML that
   * the PDF will be rendered from.
   */
  renderHtml(markdown: string, templateId: string = "modern", structured?: any): string {
    const input: TemplateInput = { markdown, structured };
    return this.templates.render(templateId, input);
  }

  async exportPdf(markdown: string, templateId: string = "modern", structured?: any): Promise<Buffer> {
    if (!markdown || markdown.trim().length < 50) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "内容太短" }, 400);
    }

    try {
      const html = this.renderHtml(markdown, templateId, structured);
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 10000 });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      await page.close();
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
