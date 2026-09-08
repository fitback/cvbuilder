import { marked } from "marked";
import type { ResumeTemplate, TemplateInput } from "./template.interface";

/**
 * Classic template — centered header, serif typography, double border lines.
 * Suitable for finance / law / state-owned enterprise roles.
 */
function render(input: TemplateInput): string {
  const body = marked.parse(input.markdown) as string;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2.5cm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Serif CJK SC", "Source Han Serif CN", "STSong", "SimSun", serif;
    font-size: 10.5pt;
    line-height: 1.6;
    color: #1A1A1A;
    margin: 0;
    text-align: justify;
  }
  header {
    text-align: center;
    margin-bottom: 0.6cm;
    border-top: 2px solid #8B4513;
    border-bottom: 2px solid #8B4513;
    padding: 0.4cm 0;
  }
  h1 {
    font-size: 18pt; font-weight: 700; margin: 0 0 0.2cm 0;
    letter-spacing: 0.15em; color: #1A1A1A;
  }
  h2 {
    font-size: 13pt; font-weight: 600; margin-top: 0.6cm; margin-bottom: 0.2cm;
    padding-bottom: 0.1cm;
    border-top: 1px solid #8B4513;
    border-bottom: 1px solid #8B4513;
    text-align: left;
    letter-spacing: 0.08em;
    color: #8B4513;
  }
  h3 { font-size: 11pt; font-weight: 600; margin-top: 0.4cm; margin-bottom: 0.15cm; }
  p { margin: 0.15cm 0; text-indent: 0; }
  ul { margin: 0.1cm 0; padding-left: 1.4em; list-style: square; }
  li { margin-bottom: 0.08cm; }
  strong { font-weight: 700; color: #8B4513; }
  body > h1:first-child { display: none; }
</style>
</head>
<body>
${extractNameHeader(input)}
${body.replace(/^<h1>.*?<\/h1>/, "")}
</body>
</html>`;
}

function extractNameHeader(input: TemplateInput): string {
  const nameMatch = input.markdown.match(/^#\s+(.+)$/m);
  const name = input.structured?.name || (nameMatch ? nameMatch[1].trim() : "简历");
  const contact = [input.structured?.phone, input.structured?.email]
    .filter(Boolean).join(" · ");
  return `<header>
    <h1>${escapeHtml(name)}</h1>
    ${contact ? `<p style="margin:0.2cm 0 0 0;color:#666;font-size:10pt;letter-spacing:0.05em;">${escapeHtml(contact)}</p>` : ""}
  </header>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const classicTemplate: ResumeTemplate = {
  id: "classic",
  name: "经典商务",
  description: "金融 / 法律 / 国企适用",
  thumbnailDataUri: makeThumbnail(),
  render,
};

function makeThumbnail(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#FFFFFF"/>
  <rect x="20" y="20" width="280" height="40" fill="#8B4513" opacity="0.08"/>
  <line x1="20" y1="20" x2="300" y2="20" stroke="#8B4513" stroke-width="1.5"/>
  <line x1="20" y1="60" x2="300" y2="60" stroke="#8B4513" stroke-width="1.5"/>
  <rect x="100" y="28" width="120" height="8" fill="#1A1A1A" rx="1"/>
  <rect x="120" y="44" width="80" height="3" fill="#666" rx="1"/>
  <rect x="20" y="76" width="60" height="6" fill="#8B4513" rx="1"/>
  <line x1="20" y1="86" x2="300" y2="86" stroke="#8B4513" stroke-width="0.5"/>
  <line x1="20" y1="92" x2="300" y2="92" stroke="#8B4513" stroke-width="0.5"/>
  <rect x="20" y="104" width="130" height="4" fill="#999" rx="1"/>
  <rect x="20" y="114" width="100" height="3" fill="#BBB" rx="1"/>
  <rect x="20" y="124" width="180" height="3" fill="#BBB" rx="1"/>
  <rect x="20" y="140" width="60" height="6" fill="#8B4513" rx="1"/>
  <line x1="20" y1="150" x2="300" y2="150" stroke="#8B4513" stroke-width="0.5"/>
  <line x1="20" y1="156" x2="300" y2="156" stroke="#8B4513" stroke-width="0.5"/>
  <rect x="20" y="166" width="200" height="3" fill="#BBB" rx="1"/>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}
