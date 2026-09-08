import { marked } from "marked";
import type { ResumeTemplate, TemplateInput } from "./template.interface";

/**
 * Creative template — top accent banner with avatar circle, sidebar style.
 * Suitable for design / creative roles.
 *
 * Banner (accent color) sits at top with the candidate's name + initial avatar
 * circle on the left. Body is single-column with sidebar-style accent labels.
 *
 * The banner only appears on the first page (not repeated via thead) so
 * multi-page PDFs don't have banner duplication.
 */
function render(input: TemplateInput): string {
  const s = input.structured;
  const nameMatch = input.markdown.match(/^#\s+(.+)$/m);
  const name = s?.name || (nameMatch ? nameMatch[1].trim() : "简历");
  const initial = name.charAt(0) || "简";
  const contact = [s?.phone, s?.email].filter(Boolean).join(" · ");

  // Strip the first H1 (we render it in the banner)
  const body = (marked.parse(input.markdown) as string).replace(/^<h1>.*?<\/h1>/, "");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #2D2D2D;
    margin: 0;
  }
  .banner {
    background: linear-gradient(135deg, #B75C3A 0%, #8B3F1F 100%);
    color: white;
    padding: 1.2cm 1.8cm 1cm 1.8cm;
    display: flex;
    align-items: center;
    gap: 0.8cm;
    /* Banner only on first page: avoid thead repetition */
  }
  .avatar {
    width: 2.2cm; height: 2.2cm; border-radius: 50%;
    background: white; color: #B75C3A;
    display: flex; align-items: center; justify-content: center;
    font-size: 24pt; font-weight: 700;
    flex-shrink: 0;
    border: 3px solid rgba(255,255,255,0.3);
  }
  .banner-info { flex: 1; }
  .banner h1 {
    margin: 0 0 0.1cm 0; font-size: 20pt; font-weight: 700;
    letter-spacing: 0.05em;
  }
  .banner .contact {
    font-size: 9.5pt; opacity: 0.9; margin: 0;
  }
  .content { padding: 0.6cm 1.8cm 1.2cm 1.8cm; }
  h2 {
    font-size: 13pt; font-weight: 700; color: #B75C3A;
    margin: 0.6cm 0 0.2cm 0; padding-bottom: 0.1cm;
    border-bottom: 2px solid #B75C3A;
    display: flex; align-items: center; gap: 0.3cm;
  }
  h2::before {
    content: ""; display: inline-block; width: 0.3cm; height: 0.3cm;
    background: #B75C3A; border-radius: 2px;
  }
  h3 {
    font-size: 11pt; font-weight: 700; margin-top: 0.4cm; margin-bottom: 0.1cm;
    color: #1A1A1A;
  }
  p { margin: 0.15cm 0; }
  ul { margin: 0.1cm 0; padding-left: 1.2em; }
  li { margin-bottom: 0.08cm; }
  strong { font-weight: 700; color: #B75C3A; }
  /* Prevent section headings from splitting across pages */
  h2, h3 { page-break-after: avoid; }
  /* Item groups stay together when possible */
  ul, p { page-break-inside: avoid; }
</style>
</head>
<body>
<div class="banner">
  <div class="avatar">${escapeHtml(initial)}</div>
  <div class="banner-info">
    <h1>${escapeHtml(name)}</h1>
    ${contact ? `<p class="contact">${escapeHtml(contact)}</p>` : ""}
  </div>
</div>
<div class="content">
${body}
</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const creativeTemplate: ResumeTemplate = {
  id: "creative",
  name: "创意设计",
  description: "设计 / 创意岗适用",
  thumbnailDataUri: makeThumbnail(),
  render,
};

function makeThumbnail(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B75C3A"/>
      <stop offset="100%" stop-color="#8B3F1F"/>
    </linearGradient>
  </defs>
  <rect width="320" height="180" fill="#FFFFFF"/>
  <rect x="0" y="0" width="320" height="50" fill="url(#g1)"/>
  <circle cx="30" cy="25" r="14" fill="white"/>
  <text x="30" y="32" font-family="sans-serif" font-size="14" font-weight="700" fill="#B75C3A" text-anchor="middle">陈</text>
  <rect x="56" y="18" width="80" height="8" fill="white" rx="1"/>
  <rect x="56" y="32" width="120" height="3" fill="white" opacity="0.85" rx="1"/>
  <rect x="20" y="64" width="40" height="5" fill="#B75C3A" rx="1"/>
  <rect x="20" y="74" width="280" height="2" fill="#B75C3A"/>
  <rect x="20" y="86" width="100" height="4" fill="#1A1A1A" rx="1"/>
  <rect x="20" y="94" width="60" height="3" fill="#666" rx="1"/>
  <rect x="20" y="104" width="200" height="3" fill="#BBB" rx="1"/>
  <rect x="20" y="110" width="160" height="3" fill="#BBB" rx="1"/>
  <rect x="20" y="124" width="40" height="5" fill="#B75C3A" rx="1"/>
  <rect x="20" y="134" width="280" height="2" fill="#B75C3A"/>
  <rect x="20" y="146" width="100" height="4" fill="#1A1A1A" rx="1"/>
  <rect x="20" y="154" width="60" height="3" fill="#666" rx="1"/>
  <rect x="20" y="164" width="200" height="3" fill="#BBB" rx="1"/>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}
