import { marked } from "marked";
import type {
  ResumeTemplate,
  TemplateInput,
  StructuredResume,
  StructuredExperienceEntry,
  StructuredEducationEntry,
  StructuredProjectEntry,
} from "./template.interface";

/**
 * Compact template — two-column layout (35% left sidebar + 65% main content).
 * Suitable for senior candidates with extensive experience.
 *
 * Left column: contact info, skills (tag cloud), education.
 * Right column: work experience, project experience.
 *
 * Falls back to single-column if `structured` is missing (uses markdown body).
 */
function render(input: TemplateInput): string {
  const s = input.structured;
  if (!s) {
    return renderFallback(input);
  }
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 1.5cm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #2D2D2D;
    margin: 0;
  }
  .layout {
    display: flex;
    gap: 0.6cm;
    min-height: 100%;
  }
  .sidebar {
    flex: 0 0 35%;
    background: #F5F0EC;
    padding: 0.6cm 0.5cm;
    border-radius: 4px;
  }
  .main { flex: 1; }
  .sidebar h2 {
    font-size: 10.5pt; font-weight: 700; color: #B75C3A;
    margin: 0.4cm 0 0.2cm 0; padding-bottom: 0.1cm;
    border-bottom: 1px solid #D4A484; letter-spacing: 0.1em;
  }
  .main h2 {
    font-size: 12pt; font-weight: 700; color: #B75C3A;
    margin: 0.4cm 0 0.2cm 0; padding-bottom: 0.1cm;
    border-bottom: 2px solid #B75C3A;
  }
  .item { margin-bottom: 0.3cm; page-break-inside: avoid; }
  .item-title { font-weight: 700; font-size: 10.5pt; color: #1A1A1A; }
  .item-meta { color: #666; font-size: 9pt; margin: 0.05cm 0; }
  .item-desc { margin-top: 0.1cm; font-size: 9.5pt; line-height: 1.5; }
  .skill-tag {
    display: inline-block; background: #B75C3A; color: white;
    padding: 0.1cm 0.25cm; border-radius: 10px; font-size: 8.5pt;
    margin: 0.1cm 0.1cm 0 0; line-height: 1.4;
  }
  .contact-line { font-size: 9pt; color: #2D2D2D; margin: 0.05cm 0; word-break: break-all; }
  .name-block {
    margin-bottom: 0.4cm; padding-bottom: 0.3cm;
    border-bottom: 1px solid #D4A484;
  }
  .name { font-size: 16pt; font-weight: 700; color: #1A1A1A; margin: 0; }
  strong { font-weight: 700; color: #B75C3A; }
  ul { padding-left: 1.1em; margin: 0.1cm 0; }
  li { margin-bottom: 0.06cm; }
  p { margin: 0.1cm 0; }
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="name-block">
      <div class="name">${escapeHtml(s.name || "简历")}</div>
      ${s.phone ? `<div class="contact-line">📱 ${escapeHtml(s.phone)}</div>` : ""}
      ${s.email ? `<div class="contact-line">✉️ ${escapeHtml(s.email)}</div>` : ""}
    </div>
    ${s.skills && s.skills.length > 0 ? `
    <h2>技能</h2>
    <div>
      ${s.skills.map((k) => `<span class="skill-tag">${escapeHtml(k)}</span>`).join("")}
    </div>` : ""}
    ${s.education && s.education.length > 0 ? `
    <h2>教育</h2>
    ${s.education.map((e) => renderEducation(e)).join("")}` : ""}
  </aside>
  <main class="main">
    ${s.summary ? `
    <h2>个人简介</h2>
    <p>${escapeHtml(s.summary)}</p>` : ""}
    ${s.workExperience && s.workExperience.length > 0 ? `
    <h2>工作经历</h2>
    ${s.workExperience.map((e) => renderWork(e)).join("")}` : ""}
    ${s.projectExperience && s.projectExperience.length > 0 ? `
    <h2>项目经历</h2>
    ${s.projectExperience.map((e) => renderProject(e)).join("")}` : ""}
  </main>
</div>
</body>
</html>`;
}

function renderWork(e: StructuredExperienceEntry): string {
  const title = [e.company, e.position].filter(Boolean).join(" · ");
  return `<div class="item">
    <div class="item-title">${escapeHtml(title || "")}</div>
    ${e.duration ? `<div class="item-meta">${escapeHtml(e.duration)}</div>` : ""}
    ${e.description ? `<div class="item-desc">${markdownInline(e.description)}</div>` : ""}
  </div>`;
}

function renderProject(e: StructuredProjectEntry): string {
  const title = [e.name, e.role].filter(Boolean).join(" · ");
  return `<div class="item">
    <div class="item-title">${escapeHtml(title || "")}</div>
    ${e.duration ? `<div class="item-meta">${escapeHtml(e.duration)}</div>` : ""}
    ${e.description ? `<div class="item-desc">${markdownInline(e.description)}</div>` : ""}
  </div>`;
}

function renderEducation(e: StructuredEducationEntry): string {
  const title = [e.school, e.degree].filter(Boolean).join(" · ");
  return `<div class="item">
    <div class="item-title">${escapeHtml(title || "")}</div>
    ${e.major ? `<div class="item-meta">${escapeHtml(e.major)}</div>` : ""}
    ${e.duration ? `<div class="item-meta">${escapeHtml(e.duration)}</div>` : ""}
  </div>`;
}

/** Render a short inline string with **bold** support. */
function markdownInline(text: string): string {
  const html = marked.parseInline(text) as string;
  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderFallback(input: TemplateInput): string {
  const body = marked.parse(input.markdown) as string;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 1.5cm; }
  body { font-family: "Noto Sans CJK SC", "PingFang SC", sans-serif; font-size: 10pt; color: #2D2D2D; }
  h1 { font-size: 16pt; color: #B75C3A; border-bottom: 2px solid #B75C3A; padding-bottom: 0.1cm; }
  h2 { font-size: 12pt; color: #B75C3A; border-bottom: 1px solid #D4A484; padding-bottom: 0.05cm; }
  h3 { font-size: 11pt; }
  strong { color: #B75C3A; }
  ul { padding-left: 1.1em; }
</style>
</head>
<body>${body}</body>
</html>`;
}

export const compactTemplate: ResumeTemplate = {
  id: "compact",
  name: "紧凑双栏",
  description: "经历丰富的高级人才适用",
  thumbnailDataUri: makeThumbnail(),
  render,
};

function makeThumbnail(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#FFFFFF"/>
  <rect x="20" y="20" width="98" height="140" fill="#F5F0EC" rx="3"/>
  <rect x="128" y="20" width="172" height="140" fill="#FFFFFF"/>
  <rect x="28" y="28" width="60" height="8" fill="#1A1A1A" rx="1"/>
  <rect x="28" y="42" width="50" height="3" fill="#666" rx="1"/>
  <rect x="28" y="48" width="50" height="3" fill="#666" rx="1"/>
  <rect x="28" y="62" width="30" height="4" fill="#B75C3A" rx="1"/>
  <rect x="28" y="72" width="20" height="6" fill="#B75C3A" rx="2"/>
  <rect x="52" y="72" width="20" height="6" fill="#B75C3A" rx="2"/>
  <rect x="76" y="72" width="20" height="6" fill="#B75C3A" rx="2"/>
  <rect x="28" y="88" width="30" height="4" fill="#B75C3A" rx="1"/>
  <rect x="28" y="98" width="80" height="3" fill="#999" rx="1"/>
  <rect x="28" y="105" width="60" height="3" fill="#999" rx="1"/>
  <rect x="28" y="115" width="30" height="4" fill="#B75C3A" rx="1"/>
  <rect x="28" y="125" width="80" height="3" fill="#999" rx="1"/>
  <rect x="136" y="28" width="40" height="5" fill="#B75C3A" rx="1"/>
  <line x1="136" y1="36" x2="292" y2="36" stroke="#B75C3A" stroke-width="1"/>
  <rect x="136" y="44" width="80" height="4" fill="#1A1A1A" rx="1"/>
  <rect x="136" y="50" width="60" height="3" fill="#666" rx="1"/>
  <rect x="136" y="60" width="156" height="3" fill="#BBB" rx="1"/>
  <rect x="136" y="65" width="120" height="3" fill="#BBB" rx="1"/>
  <rect x="136" y="76" width="80" height="4" fill="#1A1A1A" rx="1"/>
  <rect x="136" y="82" width="60" height="3" fill="#666" rx="1"/>
  <rect x="136" y="92" width="156" height="3" fill="#BBB" rx="1"/>
  <rect x="136" y="97" width="140" height="3" fill="#BBB" rx="1"/>
  <rect x="136" y="108" width="40" height="5" fill="#B75C3A" rx="1"/>
  <line x1="136" y1="116" x2="292" y2="116" stroke="#B75C3A" stroke-width="1"/>
  <rect x="136" y="124" width="80" height="4" fill="#1A1A1A" rx="1"/>
  <rect x="136" y="135" width="156" height="3" fill="#BBB" rx="1"/>
  <rect x="136" y="140" width="120" height="3" fill="#BBB" rx="1"/>
</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}
