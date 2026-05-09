# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ResumeMatcher — 面向国内求职者的简历优化与岗位匹配平台。三大核心功能：简历分析（AI 评估匹配度 + 优化建议）、简历生成（AI 重构高匹配度简历）、在线编辑 + PDF 导出。

详见 `TECH-DESIGN.md` 获取完整技术设计。

## Tech Stack

| 层级 | 技术 |
|-----|------|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Backend | NestJS (Node.js) |
| Database | PostgreSQL (with JSONB) |
| AI | DeepSeek (`deepseek-chat`), temp 0.3 (分析) / 0.4 (生成) |
| File Parsing | `mammoth` (.docx) + `pdf-parse` (.pdf) |
| Markdown Editor | `@uiw/react-md-editor` |
| PDF Export | Puppeteer (backend-rendered HTML template with Source Han Sans CN) |
| Auth | JWT + 手机号验证码 (bcrypt password hashing) |
| File Storage | Local disk `/data/resumes/` with UUID filenames, not in public dir |

## Project Structure (planned)

Monorepo:
- `packages/frontend/` — Next.js app, pages listed in TECH-DESIGN.md §7.1
- `packages/backend/` — NestJS API with modules: auth, resumes, jobs, analyze, generate, export
- `packages/shared/` — shared types/DTOs (TBD)

## Key Architecture Decisions

- **Files are never publicly accessible**: stored at `/data/resumes/{uuid}.{ext}`, served only through authenticated API endpoints.
- **Resume parsing is heuristic** (regex + line-based rules), not ML-based. Outputs a structured JSON (`parse_result` JSONB column) following the schema in TECH-DESIGN.md Appendix A.
- **Two-stage AI pipeline**: "分析大师" produces match score + optimization suggestions → "生成大师" consumes that output + original resume JSON to produce a Markdown resume. Both use DeepSeek.
- **Free tier gating**: 3 free analyses per user, enforced on `resumes.free_analysis_count`. Analysis endpoint returns 403 when exhausted.
- **PDF export flow**: Markdown → HTML template (A4, Source Han Sans CN, 2.5cm margins, 1.5× line height) → Puppeteer renders → PDF buffer returned to client.
- **Error codes** follow a custom scheme (not just HTTP status). See TECH-DESIGN.md §4.5.

## Getting Started (once scaffolded)

```bash
# Install all dependencies
npm install

# Start PostgreSQL + Redis
docker compose up -d

# Initialize database
npm run db:push -w packages/backend

# Start backend (NestJS, port 3001)
npm run dev:backend

# Start frontend (Next.js, port 3000) — in a separate terminal
npm run dev:frontend
```

## Environment Variables

See TECH-DESIGN.md Appendix B for the full `.env.example`. Key ones:
- `DATABASE_URL` — PostgreSQL connection string
- `DEEPSEEK_API_KEY` — DeepSeek API key
- `JWT_SECRET` — signing secret for JWT tokens
- `RESUME_STORAGE_PATH` — absolute path for uploaded files (default `/data/resumes`)
- `MAX_FILE_SIZE_MB` — file size limit (default 5)
- `PUPPETEER_EXECUTABLE_PATH` — path to Chromium binary for PDF rendering

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
