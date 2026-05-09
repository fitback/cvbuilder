import { Injectable, HttpException } from "@nestjs/common";
import { ErrorCode } from "@cvbuilder/shared";
import { marked } from "marked";

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
}
