# ResumeMatcher Vertical Slice — Design Spec

**Date:** 2026-05-08
**Source:** TECH-DESIGN.md v1.0 MVP (reviewed by eng + design review + design-consultation)
**Goal:** Prove the full architecture by building one complete user journey: upload resume → create JD → analyze → view results.

## Scope

**IN:**
- Monorepo scaffold (npm workspaces: `packages/frontend`, `packages/backend`, `packages/shared`)
- Prisma schema + migrations (PostgreSQL in Docker Compose, Redis for BullMQ)
- Cookie-based anonymous sessions (no auth — session ID per browser)
- Resume upload + BullMQ parse worker (DeepSeek extracts structured JSON from raw text)
- JD CRUD (create, list, delete)
- `POST /analyze` with circuit breaker + retry + idempotency (UNIQUE on resume_id+jd_id)
- Frontend: dashboard, upload page, JD list, analysis results
- Shared types package

**OUT:**
- Markdown editor + PDF export (session 2)
- LLM eval tests (session 2)
- Rate limiting middleware (session 2)
- Magic bytes file validation (extension-only for now)
- Full test coverage (E2E only for the critical path this session)

## Architecture

```
Browser (Next.js :3000)
  │
  ├── /dashboard          Resume list + upload CTA
  ├── /upload             Drag/drop → POST /resumes/upload → polling
  ├── /jobs               JD list + create form
  └── /analyze/:resumeId  JD picker → POST /analyze → results view
        │
        ▼
REST API (NestJS :3001)
  ├── ResumesModule       Upload + list + detail + delete
  ├── JobsModule          CRUD
  ├── AnalyzeModule       POST /analyze (DeepSeek call)
  └── ParseWorker (BullMQ)
        │
        ▼
PostgreSQL (:5432) + Redis (:6379)
```

## Files

| File | Purpose |
|------|---------|
| `package.json` (root) | npm workspaces |
| `packages/shared/package.json` | Shared types package |
| `packages/shared/types/resume.ts` | ParseResult, ResumeDTO, UploadResponse |
| `packages/shared/types/job.ts` | JobDescriptionDTO, CreateJobRequest |
| `packages/shared/types/analysis.ts` | AnalysisResult, ErrorCodes enum |
| `packages/shared/types/api.ts` | Standard response envelope |
| `packages/backend/package.json` | NestJS + Prisma + BullMQ |
| `packages/backend/prisma/schema.prisma` | users, resumes, job_descriptions, analysis_records |
| `packages/backend/src/main.ts` | NestJS bootstrap |
| `packages/backend/src/session/session.service.ts` | Cookie-based session |
| `packages/backend/src/resumes/resumes.module.ts` + controller + service | Upload + list + detail + delete |
| `packages/backend/src/resumes/parse.worker.ts` | BullMQ worker for parse jobs |
| `packages/backend/src/jobs/jobs.module.ts` + controller + service | JD CRUD |
| `packages/backend/src/analyze/analyze.module.ts` + controller + service | DeepSeek integration |
| `packages/backend/src/analyze/circuit-breaker.ts` | Circuit breaker utility |
| `packages/backend/src/common/api-response.interceptor.ts` | Standard envelope |
| `packages/frontend/package.json` | Next.js + Tailwind |
| `packages/frontend/app/layout.tsx` | Root layout |
| `packages/frontend/app/dashboard/page.tsx` | Dashboard |
| `packages/frontend/app/upload/page.tsx` | Upload page |
| `packages/frontend/app/jobs/page.tsx` | JD management |
| `packages/frontend/app/analyze/[resumeId]/page.tsx` | Analysis results |
| `docker-compose.yml` | PostgreSQL + Redis |

## Database (Prisma — 3 tables, 1 view/session)

```
users: id, session_id, created_at
resumes: id, session_id, file_path, file_name_original, file_type, file_size,
         parse_status, parse_result (JSONB), free_analysis_count (default 3)
job_descriptions: id, session_id, title, company?, content
analysis_records: id, session_id, resume_id (FK), jd_id (FK),
                   analysis_result (JSONB), match_score (int)
UNIQUE(resume_id, jd_id)
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /resumes/upload | Upload file → create record → enqueue parse |
| GET | /resumes | List resumes for session |
| GET | /resumes/:id | Resume detail with parseResult |
| DELETE | /resumes/:id | Delete resume + file |
| POST | /jobs | Create JD |
| GET | /jobs | List JDs for session |
| DELETE | /jobs/:id | Delete JD |
| POST | /analyze | { resumeId, jdId } → analysis result |

All responses wrapped in `{ success: boolean, data?: T, error?: { code: string, message: string } }`.

## Error Handling

| Scenario | Status | Error Code |
|----------|--------|------------|
| Bad file type | 409 | FILE_TYPE_UNSUPPORTED |
| File > 5MB | 413 | FILE_TOO_LARGE |
| Parse failed | 422 | PARSE_FAILED |
| Quota exhausted | 403 | QUOTA_EXCEEDED |
| Resource not found | 404 | RESOURCE_NOT_FOUND |
| DeepSeek timeout/error | 503 | AI_SERVICE_UNAVAILABLE |

**DeepSeek resilience:** 3 retries (1s/2s/4s backoff), 30s timeout, circuit breaker opens after 5 consecutive failures, 60s half-open probe.

**Free count atomicity:** `UPDATE resumes SET free_analysis_count = free_analysis_count - 1 WHERE id = $1 AND free_analysis_count > 0 RETURNING free_analysis_count`

## Testing

- **Unit:** analyze.service (circuit breaker, retry logic), parse.worker (DeepSeek extraction), validation pipes
- **Integration (supertest):** POST /resumes/upload, POST /analyze (happy + quota exhausted), GET /resumes
- **E2E (Playwright):** Full flow: visit dashboard → upload resume → wait for parse → create JD → click analyze → verify match score displayed

## Design System Reference

See DESIGN.md. Key tokens:
- Accent: #B75C3A (terracotta)
- Display font: Noto Serif SC (match score)
- Body: PingFang SC / Microsoft YaHei
- Compact density (4px base), minimal decoration
- Desktop: sidebar (200px) + main; Mobile: bottom tab bar
