import { marked } from "marked";
import type { ResumeTemplate, TemplateInput } from "./template.interface";

/**
 * Modern template — single column, accent color block under the title,
 * sans-serif throughout. Suitable for tech / internet roles.
 *
 * This template is the default and the direct successor of the original
 * buildHtml() in export.service.ts.
 */
function render(input: TemplateInput): string {
  const body = marked.parse(input.markdown) as string;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 1.8cm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans CN", sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #2D2D2D;
    margin: 0;
  }
  header { border-left: 4px solid #B75C3A; padding-left: 0.6cm; margin-bottom: 0.4cm; }
  h1 { font-size: 18pt; font-weight: 700; margin: 0 0 0.2cm 0; color: #1A1A1A; }
  h2 {
    font-size: 13pt; font-weight: 600; margin-top: 0.6cm; margin-bottom: 0.2cm;
    padding-bottom: 0.1cm; color: #B75C3A;
  }
  h3 { font-size: 11pt; font-weight: 600; margin-top: 0.4cm; margin-bottom: 0.15cm; }
  p { margin: 0.15cm 0; }
  ul { margin: 0.1cm 0; padding-left: 1.2em; }
  li { margin-bottom: 0.08cm; }
  strong { font-weight: 600; color: #B75C3A; }
  /* The first H1 in the markdown is the candidate's name; render it inside
     the accent header block. */
  body > h1:first-child {
    display: none;
  }
  header h1 {
    display: block;
  }
</style>
</head>
<body>
${extractNameHeader(input)}
${body.replace(/^<h1>.*?<\/h1>/, "")}
</body>
</html>`;
}

/**
 * Extract the candidate's name from the first # H1 in markdown OR from
 * structured.name, and render a styled header block.
 */
function extractNameHeader(input: TemplateInput): string {
  const nameMatch = input.markdown.match(/^#\s+(.+)$/m);
  const name = input.structured?.name || (nameMatch ? nameMatch[1].trim() : "简历");
  const contact = [input.structured?.phone, input.structured?.email]
    .filter(Boolean).join(" · ");
  return `<header>
    <h1>${escapeHtml(name)}</h1>
    ${contact ? `<p style="margin:0;color:#666;font-size:10pt;">${escapeHtml(contact)}</p>` : ""}
  </header>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const modernTemplate: ResumeTemplate = {
  id: "modern",
  name: "现代简洁",
  description: "互联网 / 技术岗适用",
  thumbnailDataUri: makeThumbnail(),
  render,
};

function makeThumbnail(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#FFFFFF"/>
  <rect x="20" y="20" width="280" height="40" fill="#B75C3A" opacity="0.15" rx="2"/>
  <rect x="24" y="28" width="80" height="8" fill="#1A1A1A" rx="1"/>
  <rect x="24" y="42" width="120" height="4" fill="#666" rx="1"/>
  <rect x="24" y="76" width="60" height="6" fill="#B75C3A" rx="1"/>
  <rect x="24" y="92" width="272" height="3" fill="#D4D4D4"/>
  <rect x="24" y="104" width="130" height="4" fill="#999" rx="1"/>
  <rect x="24" y="114" width="100" height="3" fill="#BBB" rx="1"/>
  <rect x="24" y="124" width="180" height="3" fill="#BBB" rx="1"/>
  <rect x="24" y="140" width="60" height="6" fill="#B75C3A" rx="1"/>
  <rect x="24" y="156" width="272" height="3" fill="#D4D4D4"/>
  <rect x="24" y="166" width="200" height="3" fill="#BBB" rx="1"/>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}
