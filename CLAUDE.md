# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **项目进度与待办**：[PROGRESS.md](./PROGRESS.md) — 包含版本记录、已知 Bug、待完善功能、上次工作位置。

## Project Overview

ResumeMatcher — 面向国内求职者的简历优化与岗位匹配平台。三大核心功能：简历分析（AI 评估匹配度 + 优化建议）、简历生成（AI 重构高匹配度简历）、在线编辑 + PDF 导出。

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS + React 19 |
| Backend | NestJS 11 (Express) |
| Database | PostgreSQL 16 + Prisma ORM |
| Queue | BullMQ + Redis 7 (async resume parsing) |
| AI | DeepSeek (`deepseek-chat`), temp 0.3 (分析) / 0.4 (生成) / 0.1 (解析) |
| File Parsing | `mammoth` (.docx) + `pdfjs-dist` (.pdf) |
| Markdown Editor | `@uiw/react-md-editor` |
| PDF Export | `puppeteer-core` (backend-rendered HTML) |
| Auth | JWT Bearer token + bcrypt |
| File Storage | Local disk with UUID filenames (not publicly accessible) |

## Project Structure

Monorepo (npm workspaces):
- `packages/frontend/` — Next.js App Router (port 3000)
- `packages/backend/` — NestJS with modules: `prisma`, `auth`, `resumes`, `jobs`, `analyze`, `generate`, `export`, `points`, `recharges`, `generated-resumes`, `payment`
- `packages/shared/` — TypeScript types/DTOs (must build before frontend/backend)

## Common Commands

```bash
# Install all dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Sync Prisma schema to DB
npm run db:push -w packages/backend

# Generate Prisma client (after schema changes)
npm run db:generate -w packages/backend

# Build shared types (required before frontend build)
npm run build -w packages/shared

# Start backend (port 3001)
npm run dev:backend

# Start parse worker (processes resume parsing queue, separate terminal)
npx ts-node packages/backend/src/resumes/parse.worker.ts

# Start frontend (port 3000)
npm run dev:frontend

# Build frontend (checks types + produces optimized build)
npm run build -w packages/frontend
```

The shared package must be built (`npm run build -w packages/shared`) before the frontend build can resolve the new types. The frontend dev server reads dist output from the hoisted `node_modules/@cvbuilder/shared` (symlinked to `packages/shared`).

## Key Architecture

- **Global response interceptor** (`ApiResponseInterceptor`): success → `{success: true, data}`, error → `{success: false, error: {code, message}}`. Controllers return raw data; interceptor wraps it.
- **Auth flow**: `/` is the login/register page with split-panel layout (branding left, auth form right). Login/register via `POST /auth/login` or `POST /auth/register` → JWT stored in `localStorage`. After login, redirects to `/dashboard`. Layout checks `isLoggedIn()` and fetches user info (phone, role) reactively via `useEffect` on `loggedIn` state. Route guard in layout redirects unauthenticated users to `/` for all protected pages.
- **Async resume parsing**: upload creates DB record + BullMQ job → `parse.worker.ts` extracts text (mammoth/pdfjs-dist) → DeepSeek extracts structured JSON → updates `parseStatus`. Dashboard polls for status.
- **Two-stage AI pipeline**: "分析大师" (`prompts/analyze-master.md`) → analysis result → "生成大师" (`prompts/generate-master.md`) → Markdown resume.
- **Analysis idempotency**: `@@unique([resumeId, jobDescriptionId])` on `AnalysisRecord`. Re-analyzing same pair returns cached result.
- **Free tier gating**: `freeAnalysisCount` (default 3) on `Resume`. Atomically decremented with `gt: 0` guard. Refunded on AI failure.
- **Circuit breaker**: `analyze/circuit-breaker.ts` — 5 failures / 60s reset for DeepSeek calls.
- **GeneratedResume flow**: Save dialog on analyze page → `POST /generated-resumes` → redirect to edit page → `PUT /generated-resumes/:id` re-saves with dedup check (`@@unique([userId, name])`). Dashboard shows "生成的简历" section.
- **PDF export**: Markdown → HTML template (A4, Source Han Sans CN, 2.5cm margins) → Puppeteer renders → PDF buffer.
- **Points system**: Deduct on analyze/generate. Users can recharge. Transactions logged in `PointTransaction`.

## Error Codes

Defined in `packages/shared/types/api.ts` (`ErrorCode` enum):
`INVALID_PARAMS`, `UNAUTHORIZED`, `QUOTA_EXCEEDED`, `RESOURCE_NOT_FOUND`, `FILE_TYPE_UNSUPPORTED`, `FILE_TOO_LARGE`, `PARSE_FAILED`, `INTERNAL_ERROR`, `AI_SERVICE_UNAVAILABLE`, `DUPLICATE_NAME`

## Design System

Key tokens (see `DESIGN.md` for full spec):
- **Accent**: `#B75C3A` (terracotta)
- **Type**: Noto Serif SC (display), system font (UI), JetBrains Mono (code)
- **Spacing**: 4px base, compact density
- **Layout**: Left sidebar (200px) desktop, bottom tab bar mobile
- **Motion**: Minimal-functional, respect `prefers-reduced-motion`

## Import Patterns

- Frontend pages use relative imports for local components (`../../components/Button`)
- Backend modules use relative imports (`../prisma/prisma.service`, `../auth/auth.guard`)
- Shared types import from `@cvbuilder/shared` (both frontend and backend)
- Backend controllers use `@Controller("resource-name")` with `@UseGuards(AuthGuard)` and `@UseInterceptors(ApiResponseInterceptor)`

## Admin System

- **AdminGuard** (`admin.guard.ts`): reusable guard that checks `user.role === "admin"` via PrismaService. Used on admin-only endpoints alongside `AuthGuard`.
- **Admin page** (`/admin`): Shows pending recharge approvals (approve/reject), approval history table, and payment QR code upload section. Admin nav item only visible when `userRole === "admin"`.
- **Admin sidebar**: Points balance and recharge nav are hidden for admin users. "管理" nav item appears instead.
- **Seed script** (`packages/backend/seed.ts`): creates admin account (phone: `13800000000`, password: `admin123`). Run with `npx ts-node packages/backend/seed.ts`.

## Payment QR Code

- **PaymentModule** (`packages/backend/src/payment/`): `POST /payment/qr-code` (admin only, upload image) + `GET /payment/qr-code` (check if QR exists) + `GET /payment/qr-code-image` (serve image).
- QR code stored at `./data/payment-qr/qr-code.png` (same dir level as resume storage).
- Admin uploads QR code from `/admin` page. User recharge page (`/recharge`) displays the QR code, falling back to a placeholder icon if unset.

## Module Pattern (Backend)

NestJS modules follow a consistent pattern:
- `module.ts` — registers controller + service
- `controller.ts` — `@Controller`, `@UseGuards(AuthGuard)`, `@UseInterceptors(ApiResponseInterceptor)`, injects service
- `service.ts` — `@Injectable()`, injects `PrismaService`, throws `HttpException` with `ErrorCode`
- Register module in `app.module.ts`
- Ownership check: `record.userId !== userId` → 404 (`RESOURCE_NOT_FOUND`)
