# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ResumeMatcher — 面向国内求职者的简历优化与岗位匹配平台。三大核心功能：简历分析（AI 评估匹配度 + 优化建议）、简历生成（AI 重构高匹配度简历）、在线编辑 + PDF 导出。

详见 `TECH-DESIGN.md` 获取完整技术设计。

## Tech Stack

| 层级 | 技术 |
|-----|------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS 4 + React 19 |
| Backend | NestJS 11 (Express) |
| Database | PostgreSQL 16 (JSONB) + Prisma ORM |
| Queue | BullMQ + Redis 7 (async resume parsing) |
| AI | DeepSeek (`deepseek-chat`), temp 0.3 (分析) / 0.4 (生成) / 0.1 (解析) |
| File Parsing | `mammoth` (.docx) + `pdfjs-dist` (.pdf) |
| Markdown Editor | `@uiw/react-md-editor` |
| PDF Export | `puppeteer-core` (backend-rendered HTML, Source Han Sans CN) |
| Auth | `@nestjs/jwt` + `@nestjs/passport` (JWT Bearer token, bcrypt password hashing) |
| File Storage | Local disk `/data/resumes/` with UUID filenames, not in public dir |

## Project Structure

Monorepo (npm workspaces):
- `packages/frontend/` — Next.js App Router with pages: `/`, `/upload`, `/dashboard`, `/jobs`, `/analyze/[resumeId]`
- `packages/backend/` — NestJS with modules: `prisma`, `auth`, `resumes`, `jobs`, `analyze`, `generate`, `export`
- `packages/shared/` — TypeScript types and DTOs shared between frontend and backend

## Getting Started

```bash
npm install
docker compose up -d                  # PostgreSQL + Redis
npm run db:push -w packages/backend   # sync Prisma schema to DB

# Terminal 1: Backend (port 3001)
npm run dev:backend

# Terminal 2: Parse worker (processes resume parsing queue)
npx ts-node packages/backend/src/resumes/parse.worker.ts

# Terminal 3: Frontend (port 3000)
npm run dev:frontend
```

## Key Architecture

- **Global response interceptor** (`ApiResponseInterceptor`): all successful responses are wrapped `{success: true, data}`, errors wrapped `{success: false, error: {code, message}}`. Controllers return raw data; the interceptor does the wrapping.
- **Auth flow**: JWT stored in `localStorage`, sent as `Authorization: Bearer <token>`. `AuthGuard` validates the token and sets `req.userId` from `payload.sub`. Frontend `apiFetch()` in `lib/auth.ts` auto-attaches the token.
- **Async resume parsing**: upload creates a DB record + enqueues a BullMQ job → `parse.worker.ts` extracts text (mammoth/pdfjs-dist) → calls DeepSeek to extract structured JSON → updates `parseStatus` to `parsed`/`failed`. Dashboard must poll for status changes.
- **Two-stage AI pipeline**: "分析大师" (`prompts/analyze-master.md`) produces match score + optimization suggestions → "生成大师" (`prompts/generate-master.md`) consumes analysis output + resume JSON to produce a Markdown resume.
- **Analysis idempotency**: `AnalysisRecord` has a `@@unique([resumeId, jobDescriptionId])` constraint. Re-analyzing the same pair returns cached results without consuming a free count.
- **Free tier gating**: each resume has `freeAnalysisCount` (default 3). Analysis endpoint atomically decrements with a `gt: 0` guard. On AI failure, the count is refunded.
- **Circuit breaker**: `analyze/circuit-breaker.ts` wraps DeepSeek calls with a 5-failure / 60s-reset breaker to prevent cascading failures.
- **PDF export flow**: Markdown → HTML template (A4, Source Han Sans CN, 2.5cm margins) → Puppeteer renders → PDF buffer returned.
- **Files are never publicly accessible**: stored at `RESUME_STORAGE_PATH` (default `./data/resumes`), served only through authenticated API endpoints.

## Error Codes

Defined in `packages/shared/types/api.ts` (`ErrorCode` enum), returned as `error.code` in API responses:
`INVALID_PARAMS`, `UNAUTHORIZED`, `QUOTA_EXCEEDED`, `RESOURCE_NOT_FOUND`, `FILE_TYPE_UNSUPPORTED`, `FILE_TOO_LARGE`, `PARSE_FAILED`, `INTERNAL_ERROR`, `AI_SERVICE_UNAVAILABLE`

## Environment Variables

See `.env.example`:
- `DATABASE_URL` — PostgreSQL connection string (default: `postgresql://resume:resume_dev@localhost:5432/resume_matcher`)
- `REDIS_URL` — Redis connection string (default: `redis://localhost:6379`)
- `DEEPSEEK_API_KEY` — DeepSeek API key
- `DEEPSEEK_MODEL` — model name (default: `deepseek-chat`)
- `DEEPSEEK_BASE_URL` — API base URL (default: `https://api.deepseek.com`)
- `JWT_SECRET` — signing secret for JWT tokens
- `RESUME_STORAGE_PATH` — path for uploaded files (default: `./data/resumes`)
- `MAX_FILE_SIZE_MB` — file size limit (default: 5)
- `PUPPETEER_EXECUTABLE_PATH` — path to Chromium binary for PDF rendering

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.

Key design tokens:
- **Accent**: `#B75C3A` (terracotta), hover: `#9A4E31`
- **Type**: Noto Serif SC (display/score), PingFang SC (body/UI), JetBrains Mono (code)
- **Spacing**: 4px base unit, compact density (information-dense)
- **Layout**: persistent left sidebar (200px) + main content on desktop; bottom tab bar on mobile
- **Motion**: minimal-functional only — no scroll-driven animations, no bouncy springs

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
