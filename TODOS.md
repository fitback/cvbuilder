# TODOS.md

## TODO: CI/CD pipeline definition

**What:** Define the full CI/CD pipeline: lint, type-check, test, build for both frontend and backend. Dockerfile for NestJS API + BullMQ workers. Deploy target selection (VPS, Railway, Vercel, etc.).

**Why:** The plan budgets 0.5 days for scaffolding but never specifies what "CI/CD" includes. Without this, there's no way to deploy or verify builds.

**Context:** Monorepo with Next.js frontend, NestJS backend, PostgreSQL, Redis (for BullMQ), and two BullMQ worker processes (parsing + PDF). Each needs a build step and deploy target.

**Depends on:** — (unblocked, should be done during scaffolding)

---

## TODO: Deploy target decision

**What:** Choose and document where the app runs: VPS with Docker Compose? Railway (backend) + Vercel (frontend)? Single VPS with PM2?

**Why:** The architecture decisions (BullMQ workers, Puppeteer, file storage at /data/resumes) all assume a specific deploy environment. File storage especially — /data/resumes doesn't exist on Vercel or Railway.

**Context:** Puppeteer needs Chromium. File storage needs a persistent disk. BullMQ needs Redis. These constrain deploy options.

**Depends on:** CI/CD pipeline definition
