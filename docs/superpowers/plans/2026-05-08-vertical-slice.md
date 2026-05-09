# Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one complete user journey — upload resume, create JD, analyze, view results — proving the full architecture end-to-end.

**Architecture:** npm workspaces monorepo (Next.js frontend + NestJS backend + shared types). PostgreSQL + Redis via Docker Compose. BullMQ for async resume parsing. DeepSeek for resume extraction and analysis with circuit breaker.

**Tech Stack:** Next.js 15 (App Router), NestJS 11, Prisma, BullMQ, Tailwind CSS, Docker Compose (PostgreSQL 16 + Redis 7)

**Spec:** `docs/superpowers/specs/2026-05-08-vertical-slice-design.md`
**Design:** `DESIGN.md` (terracotta accent, Noto Serif SC, PingFang SC, compact density)

---

### Task 1: Docker Compose Infrastructure

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: resume
      POSTGRES_PASSWORD: resume_dev
      POSTGRES_DB: resume_matcher
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 2: Start infrastructure**

Run: `docker compose up -d`
Expected: `[+] Running 2/2: Container cvbuilder-postgres-1 Started, Container cvbuilder-redis-1 Started`

- [ ] **Step 3: Verify services are healthy**

Run: `docker compose ps`
Expected: both services show "healthy" or "Up"

---

### Task 2: Root Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "cvbuilder",
  "private": true,
  "workspaces": [
    "packages/shared",
    "packages/backend",
    "packages/frontend"
  ],
  "scripts": {
    "dev:backend": "npm run start:dev -w packages/backend",
    "dev:frontend": "npm run dev -w packages/frontend",
    "db:migrate": "npm run db:migrate -w packages/backend",
    "db:generate": "npm run db:generate -w packages/backend"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.next/
.env
.superpowers/
/data/
*.db
```

- [ ] **Step 3: Verify workspace structure**

Run: `mkdir -p packages/shared/types packages/backend/src packages/backend/prisma packages/frontend/app`
Expected: directories created

---

### Task 3: Shared Types Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/types/api.ts`
- Create: `packages/shared/types/resume.ts`
- Create: `packages/shared/types/job.ts`
- Create: `packages/shared/types/analysis.ts`
- Create: `packages/shared/index.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@cvbuilder/shared",
  "version": "0.0.1",
  "main": "index.ts",
  "types": "index.ts"
}
```

- [ ] **Step 2: Create API envelope types**

File: `packages/shared/types/api.ts`
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
  };
}

export enum ErrorCode {
  INVALID_PARAMS = "INVALID_PARAMS",
  UNAUTHORIZED = "UNAUTHORIZED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  FILE_TYPE_UNSUPPORTED = "FILE_TYPE_UNSUPPORTED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  PARSE_FAILED = "PARSE_FAILED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  AI_SERVICE_UNAVAILABLE = "AI_SERVICE_UNAVAILABLE",
}
```

- [ ] **Step 3: Create resume types**

File: `packages/shared/types/resume.ts`
```typescript
export type ParseStatus = "pending" | "parsing" | "parsed" | "failed";

export interface ParseResult {
  name: string;
  contact: { phone?: string; email?: string; location?: string };
  summary?: string;
  workExperience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  projectExperience: Array<{
    name: string;
    role: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    major: string;
    degree: string;
    duration: string;
  }>;
  skills: string[];
}

export interface ResumeItem {
  id: string;
  fileNameOriginal: string;
  fileType: "pdf" | "docx";
  parseStatus: ParseStatus;
  fileSize: number;
  freeAnalysisCount: number;
  createdAt: string;
}

export interface ResumeDetail extends ResumeItem {
  parseResult: ParseResult | null;
  rawText: string | null;
}

export interface UploadResponse {
  resumeId: string;
  fileType: "pdf" | "docx";
  parseStatus: "parsing";
  fileNameOriginal: string;
}
```

- [ ] **Step 4: Create job types**

File: `packages/shared/types/job.ts`
```typescript
export interface JobDescriptionItem {
  id: string;
  title: string;
  company?: string;
  createdAt: string;
}

export interface CreateJobRequest {
  title: string;
  company?: string;
  content: string;
}

export interface CreateJobResponse {
  jobDescriptionId: string;
}
```

- [ ] **Step 5: Create analysis types**

File: `packages/shared/types/analysis.ts`
```typescript
export interface JdCoreDecoding {
  core: string;
  hidden: string;
}

export interface OptimizationSuggestion {
  target: string;
  action: "modify" | "add" | "delete";
  detail: string;
  example: string;
}

export interface DetailChecklist {
  type: "delete" | "edit";
  location: string;
  content: string;
}

export interface AnalysisResult {
  matchScore: number;
  matchSummary: string;
  jdCoreDecoding: JdCoreDecoding[];
  optimizationSuggestions: OptimizationSuggestion[];
  detailChecklist: DetailChecklist[];
}

export interface AnalyzeRequest {
  resumeId: string;
  jobDescriptionId: string;
}

export interface AnalyzeResponse {
  analysisRecordId: string;
  matchScore: number;
  jdCoreDecoding: JdCoreDecoding[];
  optimizationSuggestions: OptimizationSuggestion[];
  detailChecklist: DetailChecklist[];
  remainingFreeCount: number;
}
```

- [ ] **Step 6: Create shared index**

File: `packages/shared/index.ts`
```typescript
export * from "./types/api";
export * from "./types/resume";
export * from "./types/job";
export * from "./types/analysis";
```

---

### Task 4: Backend Scaffold + Prisma Schema

**Files:**
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/nest-cli.json`
- Create: `packages/backend/prisma/schema.prisma`
- Create: `packages/backend/src/main.ts`
- Create: `packages/backend/src/app.module.ts`

- [ ] **Step 1: Create backend package.json**

```json
{
  "name": "@cvbuilder/backend",
  "version": "0.0.1",
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev --name init",
    "db:push": "prisma db push"
  },
  "dependencies": {
    "@cvbuilder/shared": "*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@prisma/client": "^6.0.0",
    "@bull-board/express": "^6.0.0",
    "bullmq": "^5.0.0",
    "class-transformer": "^0.5.0",
    "class-validator": "^0.14.0",
    "cookie-parser": "^1.4.0",
    "ioredis": "^5.0.0",
    "multer": "^1.4.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.0.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@types/cookie-parser": "^1.4.0",
    "@types/express": "^5.0.0",
    "@types/multer": "^1.4.0",
    "@types/node": "^22.0.0",
    "@types/uuid": "^10.0.0",
    "prisma": "^6.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 4: Create Prisma schema**

File: `packages/backend/prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Resume {
  id                  String   @id @default(uuid())
  sessionId           String
  filePath            String
  fileNameOriginal    String?
  fileType            String
  fileSize            Int?
  parseStatus         String   @default("pending")
  parseResult         Json?
  rawText             String?
  freeAnalysisCount   Int      @default(3)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  analysisRecords     AnalysisRecord[]

  @@index([sessionId])
  @@index([parseStatus])
}

model JobDescription {
  id               String   @id @default(uuid())
  sessionId        String
  title            String
  company          String?
  content          String
  createdAt        DateTime @default(now())
  analysisRecords  AnalysisRecord[]

  @@index([sessionId])
}

model AnalysisRecord {
  id                String         @id @default(uuid())
  sessionId         String
  resumeId          String
  jobDescriptionId  String
  analysisResult    Json?
  matchScore        Int?
  createdAt         DateTime       @default(now())
  resume            Resume         @relation(fields: [resumeId], references: [id])
  jobDescription    JobDescription @relation(fields: [jobDescriptionId], references: [id])

  @@unique([resumeId, jobDescriptionId])
  @@index([sessionId])
  @@index([resumeId])
  @@index([jobDescriptionId])
}
```

- [ ] **Step 5: Create .env for backend**

File: `packages/backend/.env`
```
DATABASE_URL=postgresql://resume:resume_dev@localhost:5432/resume_matcher
REDIS_URL=redis://localhost:6379
DEEPSEEK_API_KEY=sk-placeholder
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
SESSION_SECRET=cvbuilder-dev-session-secret
MAX_FILE_SIZE_MB=5
RESUME_STORAGE_PATH=./data/resumes
```

- [ ] **Step 6: Create main.ts**

File: `packages/backend/src/main.ts`
```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({ origin: "http://localhost:3000", credentials: true });
  await app.listen(3001);
}
bootstrap();
```

- [ ] **Step 7: Create app.module.ts**

File: `packages/backend/src/app.module.ts`
```typescript
import { Module } from "@nestjs/common";

@Module({
  imports: [],
})
export class AppModule {}
```

- [ ] **Step 8: Install all dependencies**

Run: `npm install` (from project root)
Expected: packages installed without errors

- [ ] **Step 9: Generate Prisma client and push schema**

Run: `npm run db:generate -w packages/backend && npm run db:push -w packages/backend`
Expected: `Your database is now in sync with your schema.`

- [ ] **Step 10: Verify backend starts**

Run: `npm run dev:backend`
Expected: `Nest application successfully started on port 3001`

---

### Task 5: Session Middleware + Prisma Service

**Files:**
- Create: `packages/backend/src/prisma/prisma.service.ts`
- Create: `packages/backend/src/prisma/prisma.module.ts`
- Create: `packages/backend/src/session/session.guard.ts`

- [ ] **Step 1: Create PrismaService**

File: `packages/backend/src/prisma/prisma.service.ts`
```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 2: Create PrismaModule**

File: `packages/backend/src/prisma/prisma.module.ts`
```typescript
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Create session guard that reads/stores sessionId in cookie**

File: `packages/backend/src/session/session.guard.ts`
```typescript
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { Request, Response } from "express";

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    let sessionId = req.cookies?.["session_id"];
    if (!sessionId) {
      sessionId = uuid();
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      });
    }
    (req as any).sessionId = sessionId;
    return true;
  }
}
```

- [ ] **Step 4: Update app.module.ts to import PrismaModule**

File: `packages/backend/src/app.module.ts`
```typescript
import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 5: Restart backend and verify it starts**

Run: `npm run dev:backend`
Expected: `Nest application successfully started on port 3001` (after restart)

---

### Task 6: Resumes Module — Upload Endpoint

**Files:**
- Create: `packages/backend/src/resumes/resumes.module.ts`
- Create: `packages/backend/src/resumes/resumes.controller.ts`
- Create: `packages/backend/src/resumes/resumes.service.ts`
- Create: `packages/backend/src/common/api-response.interceptor.ts`

- [ ] **Step 1: Create API response interceptor**

File: `packages/backend/src/common/api-response.interceptor.ts`
```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from "@nestjs/common";
import { Observable, map, catchError, throwError } from "rxjs";
import { ApiResponse } from "@cvbuilder/shared";

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({ success: true, data })),
      catchError((err) => {
        if (err instanceof HttpException) {
          const response = err.getResponse();
          return throwError(() => err);
        }
        return throwError(() => err);
      }),
    );
  }
}
```

- [ ] **Step 2: Create ResumesModule**

File: `packages/backend/src/resumes/resumes.module.ts`
```typescript
import { Module } from "@nestjs/common";
import { ResumesController } from "./resumes.controller";
import { ResumesService } from "./resumes.service";

@Module({
  controllers: [ResumesController],
  providers: [ResumesService],
  exports: [ResumesService],
})
export class ResumesModule {}
```

- [ ] **Step 3: Create ResumesController with upload endpoint**

File: `packages/backend/src/resumes/resumes.controller.ts`
```typescript
import { Controller, Post, Get, Param, Delete, Req, UseInterceptors, UploadedFile, UseGuards } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ResumesService } from "./resumes.service";
import { SessionGuard } from "../session/session.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { UploadResponse, ResumeItem, ResumeDetail } from "@cvbuilder/shared";

@Controller("resumes")
@UseGuards(SessionGuard)
@UseInterceptors(ApiResponseInterceptor)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any): Promise<UploadResponse> {
    return this.resumesService.upload(file, req.sessionId);
  }
}
```

- [ ] **Step 4: Create ResumesService with file save + DB create**

File: `packages/backend/src/resumes/resumes.service.ts`
```typescript
import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadResponse, ErrorCode } from "@cvbuilder/shared";
import { v4 as uuid } from "uuid";
import * as fs from "fs";
import * as path from "path";

const ALLOWED_TYPES: Record<string, "pdf" | "docx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

@Injectable()
export class ResumesService {
  constructor(private prisma: PrismaService) {}

  async upload(file: Express.Multer.File, sessionId: string): Promise<UploadResponse> {
    if (!file) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "No file provided" }, 400);

    const fileType = ALLOWED_TYPES[file.mimetype];
    if (!fileType) throw new HttpException({ code: ErrorCode.FILE_TYPE_UNSUPPORTED, message: "仅支持 PDF 和 Word 格式" }, 409);

    const storagePath = process.env.RESUME_STORAGE_PATH || "./data/resumes";
    fs.mkdirSync(storagePath, { recursive: true });

    const fileId = uuid();
    const filePath = path.join(storagePath, `${fileId}.${fileType}`);
    fs.writeFileSync(filePath, file.buffer);

    const resume = await this.prisma.resume.create({
      data: {
        id: fileId,
        sessionId,
        filePath,
        fileNameOriginal: Buffer.from(file.originalname, "latin1").toString("utf8"),
        fileType,
        fileSize: file.size,
        parseStatus: "parsing",
      },
    });

    return {
      resumeId: resume.id,
      fileType: resume.fileType as "pdf" | "docx",
      parseStatus: "parsing",
      fileNameOriginal: resume.fileNameOriginal ?? file.originalname,
    };
  }
}
```

- [ ] **Step 5: Update app.module.ts to import ResumesModule**

File: `packages/backend/src/app.module.ts`
```typescript
import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ResumesModule } from "./resumes/resumes.module";

@Module({
  imports: [PrismaModule, ResumesModule],
})
export class AppModule {}
```

- [ ] **Step 6: Verify upload endpoint works**

Run:
```bash
curl -X POST http://localhost:3001/resumes/upload \
  -F "file=@/dev/null;filename=test.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  -b "session_id=test-123"
```
Expected: `{"success":true,"data":{"resumeId":"...","fileType":"docx","parseStatus":"parsing","fileNameOriginal":"test.docx"}}`

---

### Task 7: BullMQ Parse Worker (DeepSeek Extraction)

**Files:**
- Create: `packages/backend/src/resumes/parse.worker.ts`
- Create: `packages/backend/src/resumes/parse-queue.provider.ts`
- Modify: `packages/backend/src/resumes/resumes.module.ts`
- Modify: `packages/backend/src/resumes/resumes.service.ts` (enqueue job after upload)

- [ ] **Step 1: Create parse queue provider**

File: `packages/backend/src/resumes/parse-queue.provider.ts`
```typescript
import { Queue } from "bullmq";

export const PARSE_QUEUE = "PARSE_QUEUE";

export const parseQueueProvider = {
  provide: PARSE_QUEUE,
  useFactory: () => new Queue("resume-parse", {
    connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
  }),
};
```

- [ ] **Step 2: Create parse worker process file**

File: `packages/backend/src/resumes/parse.worker.ts`
```typescript
import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

async function extractText(filePath: string, fileType: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // pdf: use pdf.js with cMapUrl for Chinese support (per eng review)
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(" "));
  }
  return pages.join("\n");
}

async function extractWithDeepSeek(rawText: string): Promise<any> {
  const prompt = `从以下简历文本中提取结构化信息，返回JSON格式。
  
{
  "name": "姓名",
  "contact": { "phone": "手机号", "email": "邮箱", "location": "城市" },
  "summary": "个人摘要",
  "workExperience": [{ "company": "公司", "position": "职位", "duration": "时间", "description": "描述" }],
  "projectExperience": [{ "name": "项目名", "role": "角色", "duration": "时间", "description": "描述" }],
  "education": [{ "school": "学校", "major": "专业", "degree": "学历", "duration": "时间" }],
  "skills": ["技能1", "技能2"]
}

简历文本：
${rawText}`;

  const res = await fetch(`${DEEPSEEK_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, response_format: { type: "json_object" } }),
  });
  if (!res.ok) throw new Error(`DeepSeek returned ${res.status}`);
  const data = await res.json() as any;
  return JSON.parse(data.choices[0].message.content);
}

const worker = new Worker("resume-parse", async (job: Job) => {
  const { resumeId } = job.data;
  const resume = await prisma.resume.findUniqueOrThrow({ where: { id: resumeId } });

  try {
    const rawText = await extractText(resume.filePath, resume.fileType);
    await prisma.resume.update({ where: { id: resumeId }, data: { rawText } });

    if (rawText.trim().length < 200) {
      await prisma.resume.update({ where: { id: resumeId }, data: { parseStatus: "failed" } });
      return;
    }

    const parseResult = await extractWithDeepSeek(rawText);
    await prisma.resume.update({
      where: { id: resumeId },
      data: { parseResult, parseStatus: "parsed" },
    });
  } catch (err) {
    await prisma.resume.update({ where: { id: resumeId }, data: { parseStatus: "failed" } });
    throw err;
  }
}, {
  connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
  concurrency: 2,
});

console.log("Parse worker started");
```

- [ ] **Step 3: Update ResumesModule to provide the queue and worker**

File: `packages/backend/src/resumes/resumes.module.ts`
```typescript
import { Module } from "@nestjs/common";
import { ResumesController } from "./resumes.controller";
import { ResumesService } from "./resumes.service";
import { parseQueueProvider } from "./parse-queue.provider";

@Module({
  controllers: [ResumesController],
  providers: [ResumesService, parseQueueProvider],
  exports: [ResumesService],
})
export class ResumesModule {}
```

- [ ] **Step 4: Update ResumesService to enqueue parse job after upload (add to upload method)**

Add to the upload method in `packages/backend/src/resumes/resumes.service.ts` after the fs.writeFileSync line:
```typescript
import { Inject } from "@nestjs/common";
import { Queue } from "bullmq";
import { PARSE_QUEUE } from "./parse-queue.provider";

// In constructor, add:
constructor(
  private prisma: PrismaService,
  @Inject(PARSE_QUEUE) private parseQueue: Queue,
) {}

// After resume creation, add:
await this.parseQueue.add("parse", { resumeId: fileId }, {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
});
```

- [ ] **Step 5: Add mammoth and pdfjs-dist to backend dependencies**

Run: `npm install mammoth pdfjs-dist -w packages/backend`
Expected: packages installed

- [ ] **Step 6: Verify parse worker starts**

Run: `npx ts-node packages/backend/src/resumes/parse.worker.ts`
Expected: `Parse worker started`

---

### Task 8: Resumes Module — List, Detail, Delete

**Files:**
- Modify: `packages/backend/src/resumes/resumes.controller.ts` (add GET, DELETE endpoints)
- Modify: `packages/backend/src/resumes/resumes.service.ts` (add list, detail, delete methods)

- [ ] **Step 1: Add list, detail, delete to controller**

Add these methods to `ResumesController` in `packages/backend/src/resumes/resumes.controller.ts`:
```typescript
@Get()
async list(@Req() req: any): Promise<ResumeItem[]> {
  return this.resumesService.list(req.sessionId);
}

@Get(":id")
async detail(@Param("id") id: string, @Req() req: any): Promise<ResumeDetail> {
  return this.resumesService.detail(id, req.sessionId);
}

@Delete(":id")
async delete(@Param("id") id: string, @Req() req: any): Promise<{ success: true }> {
  return this.resumesService.delete(id, req.sessionId);
}
```

- [ ] **Step 2: Add list, detail, delete to service**

Add these methods to `ResumesService`:
```typescript
async list(sessionId: string): Promise<ResumeItem[]> {
  const resumes = await this.prisma.resume.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fileNameOriginal: true, fileType: true,
      parseStatus: true, fileSize: true, freeAnalysisCount: true, createdAt: true,
    },
  });
  return resumes.map((r) => ({
    ...r,
    fileType: r.fileType as "pdf" | "docx",
    parseStatus: r.parseStatus as any,
    createdAt: r.createdAt.toISOString(),
  }));
}

async detail(id: string, sessionId: string): Promise<ResumeDetail> {
  const resume = await this.prisma.resume.findUnique({ where: { id } });
  if (!resume || resume.sessionId !== sessionId) {
    throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
  }
  return {
    id: resume.id,
    fileNameOriginal: resume.fileNameOriginal ?? "",
    fileType: resume.fileType as "pdf" | "docx",
    parseStatus: resume.parseStatus as any,
    fileSize: resume.fileSize ?? 0,
    freeAnalysisCount: resume.freeAnalysisCount,
    createdAt: resume.createdAt.toISOString(),
    parseResult: resume.parseResult as any,
    rawText: resume.rawText,
  };
}

async delete(id: string, sessionId: string): Promise<{ success: true }> {
  const resume = await this.prisma.resume.findUnique({ where: { id } });
  if (!resume || resume.sessionId !== sessionId) {
    throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
  }
  try { require("fs").unlinkSync(resume.filePath); } catch (_) {}
  await this.prisma.resume.delete({ where: { id } });
  return { success: true };
}
```

- [ ] **Step 3: Verify list endpoint**

Run: `curl http://localhost:3001/resumes -b "session_id=test-123"`
Expected: `{"success":true,"data":[...]}`

---

### Task 9: Jobs Module — CRUD

**Files:**
- Create: `packages/backend/src/jobs/jobs.module.ts`
- Create: `packages/backend/src/jobs/jobs.controller.ts`
- Create: `packages/backend/src/jobs/jobs.service.ts`
- Modify: `packages/backend/src/app.module.ts` (import JobsModule)

- [ ] **Step 1: Create JobsModule**

File: `packages/backend/src/jobs/jobs.module.ts`
```typescript
import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
```

- [ ] **Step 2: Create JobsController**

File: `packages/backend/src/jobs/jobs.controller.ts`
```typescript
import { Controller, Post, Get, Delete, Param, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { SessionGuard } from "../session/session.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { CreateJobRequest, CreateJobResponse, JobDescriptionItem } from "@cvbuilder/shared";

@Controller("jobs")
@UseGuards(SessionGuard)
@UseInterceptors(ApiResponseInterceptor)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async create(@Body() body: CreateJobRequest, @Req() req: any): Promise<CreateJobResponse> {
    return this.jobsService.create(body, req.sessionId);
  }

  @Get()
  async list(@Req() req: any): Promise<JobDescriptionItem[]> {
    return this.jobsService.list(req.sessionId);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: any): Promise<{ success: true }> {
    return this.jobsService.delete(id, req.sessionId);
  }
}
```

- [ ] **Step 3: Create JobsService**

File: `packages/backend/src/jobs/jobs.service.ts`
```typescript
import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateJobRequest, CreateJobResponse, JobDescriptionItem, ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async create(body: CreateJobRequest, sessionId: string): Promise<CreateJobResponse> {
    if (!body.title?.trim()) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "职位名称不能为空" }, 400);
    if (!body.content?.trim()) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "JD内容不能为空" }, 400);

    const jd = await this.prisma.jobDescription.create({
      data: { sessionId, title: body.title, company: body.company, content: body.content },
    });
    return { jobDescriptionId: jd.id };
  }

  async list(sessionId: string): Promise<JobDescriptionItem[]> {
    const jobs = await this.prisma.jobDescription.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, company: true, createdAt: true },
    });
    return jobs.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() }));
  }

  async delete(id: string, sessionId: string): Promise<{ success: true }> {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } });
    if (!jd || jd.sessionId !== sessionId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "JD不存在" }, 404);
    }
    await this.prisma.jobDescription.delete({ where: { id } });
    return { success: true };
  }
}
```

- [ ] **Step 4: Add JobsModule to app.module.ts**

```typescript
import { JobsModule } from "./jobs/jobs.module";
// Add JobsModule to imports array
```

- [ ] **Step 5: Verify JD create/list**

Run:
```bash
curl -X POST http://localhost:3001/jobs -H "Content-Type: application/json" -b "session_id=test-123" -d '{"title":"高级前端","content":"5年React经验"}'
curl http://localhost:3001/jobs -b "session_id=test-123"
```
Expected: create returns jobDescriptionId, list returns the created JD

---

### Task 10: Analyze Module — DeepSeek Integration

**Files:**
- Create: `packages/backend/src/analyze/analyze.module.ts`
- Create: `packages/backend/src/analyze/analyze.controller.ts`
- Create: `packages/backend/src/analyze/analyze.service.ts`
- Create: `packages/backend/src/analyze/circuit-breaker.ts`
- Modify: `packages/backend/src/app.module.ts` (import AnalyzeModule)

- [ ] **Step 1: Create CircuitBreaker utility**

File: `packages/backend/src/analyze/circuit-breaker.ts`
```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(private threshold = 5, private resetTimeout = 60000) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      if (this.state === "half-open") {
        this.state = "closed";
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = "open";
      }
      throw err;
    }
  }
}
```

- [ ] **Step 2: Create AnalyzeModule**

File: `packages/backend/src/analyze/analyze.module.ts`
```typescript
import { Module } from "@nestjs/common";
import { AnalyzeController } from "./analyze.controller";
import { AnalyzeService } from "./analyze.service";

@Module({
  controllers: [AnalyzeController],
  providers: [AnalyzeService],
})
export class AnalyzeModule {}
```

- [ ] **Step 3: Create AnalyzeController**

File: `packages/backend/src/analyze/analyze.controller.ts`
```typescript
import { Controller, Post, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnalyzeService } from "./analyze.service";
import { SessionGuard } from "../session/session.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { AnalyzeRequest, AnalyzeResponse } from "@cvbuilder/shared";

@Controller("analyze")
@UseGuards(SessionGuard)
@UseInterceptors(ApiResponseInterceptor)
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post()
  async analyze(@Body() body: AnalyzeRequest, @Req() req: any): Promise<AnalyzeResponse> {
    return this.analyzeService.analyze(body, req.sessionId);
  }
}
```

- [ ] **Step 4: Create AnalyzeService with DeepSeek call + retry + circuit breaker + atomic decrement**

File: `packages/backend/src/analyze/analyze.service.ts`
```typescript
import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyzeRequest, AnalyzeResponse, ErrorCode } from "@cvbuilder/shared";
import { CircuitBreaker } from "./circuit-breaker";

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

const breaker = new CircuitBreaker(5, 60000);

async function callDeepSeek(messages: any[], temperature = 0.3): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${DEEPSEEK_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_KEY}` },
        body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, temperature, response_format: { type: "json_object" } }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`DeepSeek returned ${res.status}`);
      const data = await res.json() as any;
      return JSON.parse(data.choices[0].message.content);
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError ?? new Error("DeepSeek call failed");
}

@Injectable()
export class AnalyzeService {
  constructor(private prisma: PrismaService) {}

  async analyze(body: AnalyzeRequest, sessionId: string): Promise<AnalyzeResponse> {
    const resume = await this.prisma.resume.findUnique({ where: { id: body.resumeId } });
    if (!resume || resume.sessionId !== sessionId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }
    if (resume.parseStatus !== "parsed" || !resume.parseResult) {
      throw new HttpException({ code: ErrorCode.PARSE_FAILED, message: "简历尚未解析完成" }, 422);
    }

    const jd = await this.prisma.jobDescription.findUnique({ where: { id: body.jobDescriptionId } });
    if (!jd || jd.sessionId !== sessionId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "JD不存在" }, 404);
    }

    // Idempotency: check for existing analysis
    const existing = await this.prisma.analysisRecord.findUnique({
      where: { resumeId_jobDescriptionId: { resumeId: body.resumeId, jobDescriptionId: body.jobDescriptionId } },
    });
    if (existing?.analysisResult) {
      const result = existing.analysisResult as any;
      return {
        analysisRecordId: existing.id,
        matchScore: existing.matchScore ?? 0,
        jdCoreDecoding: result.jdCoreDecoding ?? [],
        optimizationSuggestions: result.optimizationSuggestions ?? [],
        detailChecklist: result.detailChecklist ?? [],
        remainingFreeCount: resume.freeAnalysisCount,
      };
    }

    // Atomic decrement
    const updated = await this.prisma.resume.updateMany({
      where: { id: body.resumeId, freeAnalysisCount: { gt: 0 } },
      data: { freeAnalysisCount: { decrement: 1 } },
    });
    if (updated.count === 0) {
      throw new HttpException({ code: ErrorCode.QUOTA_EXCEEDED, message: "免费次数已用完" }, 403);
    }

    try {
      const analysisResult = await breaker.call(() =>
        callDeepSeek([
          { role: "system", content: `你是一位资深HR和简历优化专家。分析候选人的简历与目标岗位的匹配程度。
返回JSON格式：
{
  "matchScore": 0-100的整数,
  "matchSummary": "一句话概括匹配程度",
  "jdCoreDecoding": [{ "core": "岗位核心需求", "hidden": "隐性考察点" }],
  "optimizationSuggestions": [{ "target": "目标模块", "action": "modify|add|delete", "detail": "具体修改", "example": "修改示例" }],
  "detailChecklist": [{ "type": "delete|edit", "location": "具体位置", "content": "问题描述" }]
}` },
          { role: "user", content: `简历JSON：${JSON.stringify(resume.parseResult)}\n\nJD内容：${jd.content}` },
        ]),
      );

      const record = await this.prisma.analysisRecord.upsert({
        where: { resumeId_jobDescriptionId: { resumeId: body.resumeId, jobDescriptionId: body.jobDescriptionId } },
        create: {
          sessionId, resumeId: body.resumeId, jobDescriptionId: body.jobDescriptionId,
          analysisResult, matchScore: analysisResult.matchScore,
        },
        update: { analysisResult, matchScore: analysisResult.matchScore },
      });

      const refreshedResume = await this.prisma.resume.findUniqueOrThrow({ where: { id: body.resumeId } });
      return {
        analysisRecordId: record.id,
        matchScore: analysisResult.matchScore,
        jdCoreDecoding: analysisResult.jdCoreDecoding ?? [],
        optimizationSuggestions: analysisResult.optimizationSuggestions ?? [],
        detailChecklist: analysisResult.detailChecklist ?? [],
        remainingFreeCount: refreshedResume.freeAnalysisCount,
      };
    } catch (err) {
      // Refund the decremented count
      await this.prisma.resume.update({ where: { id: body.resumeId }, data: { freeAnalysisCount: { increment: 1 } } });
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "AI服务暂时不可用，请稍后重试" }, 503);
    }
  }
}
```

- [ ] **Step 5: Add AnalyzeModule to app.module.ts**

```typescript
import { AnalyzeModule } from "./analyze/analyze.module";
// Add to imports
```

- [ ] **Step 6: Verify analyze endpoint**

Run:
```bash
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -b "session_id=test-123" \
  -d '{"resumeId":"<valid-id>","jobDescriptionId":"<valid-jd-id>"}'
```
Expected: response with matchScore, jdCoreDecoding, etc. (may return 503 if DeepSeek key isn't set)

---

### Task 11: Frontend Scaffold

**Files:**
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/tsconfig.json`
- Create: `packages/frontend/next.config.js`
- Create: `packages/frontend/tailwind.config.ts`
- Create: `packages/frontend/postcss.config.js`
- Create: `packages/frontend/app/globals.css`
- Create: `packages/frontend/app/layout.tsx`

- [ ] **Step 1: Create frontend package.json**

```json
{
  "name": "@cvbuilder/frontend",
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {
    "@cvbuilder/shared": "*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create next.config.js**

```js
/** @type {import('next').NextConfig} */
module.exports = { transpilePackages: ["@cvbuilder/shared"] };
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create globals.css with DESIGN.md tokens**

File: `packages/frontend/app/globals.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@400;500;600&family=JetBrains+Mono&display=swap');

@theme {
  --color-accent: #B75C3A;
  --color-accent-hover: #9A4E31;
  --color-near-black: #1A1A1A;
  --color-text-primary: #2D2D2D;
  --color-text-secondary: #6B6B6B;
  --color-text-muted: #9E9E9E;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #FAFAF9;
  --color-surface-tertiary: #F5F4F2;
  --color-border: #D4D4D4;
  --color-border-light: #EBEBEB;
  --font-display: 'Noto Serif SC', serif;
  --font-body: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  font-family: var(--font-body);
  background: var(--color-surface-secondary);
  color: var(--color-text-primary);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 5: Create root layout**

File: `packages/frontend/app/layout.tsx`
```tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="hidden md:flex flex-col w-[200px] bg-white border-r border-border-light p-4">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-8">ResumeMatcher</h1>
            <nav className="flex flex-col gap-1">
              <a href="/dashboard" className="px-3 py-2 rounded text-sm text-accent bg-surface-tertiary font-medium">仪表盘</a>
              <a href="/upload" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">上传简历</a>
              <a href="/jobs" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">我的JD</a>
            </nav>
          </aside>
          <main className="flex-1 p-6 max-w-[960px]">{children}</main>
        </div>
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border-light flex justify-around py-2">
          <a href="/dashboard" className="flex flex-col items-center text-xs text-accent">📄 仪表盘</a>
          <a href="/upload" className="flex flex-col items-center text-xs text-text-secondary">📤 上传</a>
          <a href="/jobs" className="flex flex-col items-center text-xs text-text-secondary">📋 JD</a>
        </nav>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Install frontend deps and verify build**

Run: `npm install && npm run dev -w packages/frontend`
Expected: Next.js starts on port 3000, visit http://localhost:3000 shows layout with sidebar

---

### Task 12: Dashboard Page

**Files:**
- Create: `packages/frontend/app/dashboard/page.tsx`
- Create: `packages/frontend/app/page.tsx` (redirect to /dashboard)

- [ ] **Step 1: Create the API client helper**

Add to `packages/frontend/app/dashboard/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { ResumeItem } from "@cvbuilder/shared";

const API = "http://localhost:3001";

async function fetchResumes(): Promise<ResumeItem[]> {
  const res = await fetch(`${API}/resumes`, { credentials: "include" });
  const json = await res.json();
  return json.data ?? [];
}

export default function DashboardPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumes().then(setResumes).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface-tertiary rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">我的简历</h2>
          <p className="text-sm text-text-secondary mt-1">
            {resumes.length} 份简历
            {resumes.length > 0 && ` · 剩余免费分析 ${resumes[0]?.freeAnalysisCount ?? 0} 次`}
          </p>
        </div>
        <a href="/upload" className="inline-block px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
          上传新简历
        </a>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-20">📄</div>
          <h3 className="text-lg font-semibold mb-2">还没有上传简历</h3>
          <p className="text-sm text-text-secondary mb-6">上传你的第一份简历，AI 帮你匹配理想岗位</p>
          <a href="/upload" className="inline-block px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
            上传简历
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {resumes.map((r) => (
            <div key={r.id} className="flex justify-between items-center p-4 bg-white border border-border-light rounded-md">
              <div>
                <div className="text-sm font-medium">{r.fileNameOriginal}</div>
                <div className="text-xs text-text-muted mt-1">
                  上传于 {new Date(r.createdAt).toLocaleDateString("zh-CN")} · {r.parseStatus === "parsed" ? "解析完成" : r.parseStatus === "parsing" ? "解析中..." : "解析失败"}
                </div>
              </div>
              <div className="flex gap-2">
                {r.parseStatus === "parsed" && (
                  <a href={`/analyze/${r.id}`} className="px-3 py-1.5 border border-border rounded text-xs text-text-secondary hover:bg-surface-tertiary">
                    分析
                  </a>
                )}
                <button onClick={async () => {
                  await fetch(`${API}/resumes/${r.id}`, { method: "DELETE", credentials: "include" });
                  setResumes(await fetchResumes());
                }} className="px-3 py-1.5 text-xs text-text-muted hover:text-error">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create root page redirect**

File: `packages/frontend/app/page.tsx`
```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard"); }
```

- [ ] **Step 3: Verify dashboard**

Open http://localhost:3000 — should redirect to /dashboard, show empty state with upload CTA.

---

### Task 13: Upload Page

**Files:**
- Create: `packages/frontend/app/upload/page.tsx`

- [ ] **Step 1: Create upload page**

File: `packages/frontend/app/upload/page.tsx`
```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:3001";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/resumes/upload`, { method: "POST", body: form, credentials: "include" });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "上传失败");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">上传简历</h2>
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragOver ? "border-accent bg-accent/5" : "border-border hover:border-text-muted"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-4xl mb-4">📤</div>
        <p className="text-sm text-text-secondary mb-2">拖拽文件到此处，或点击上传</p>
        <p className="text-xs text-text-muted">支持 PDF 和 Word 格式，最大 5MB</p>
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
      </div>
      {uploading && (
        <div className="mt-6 p-4 bg-surface-tertiary rounded-md">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">正在上传并解析...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-error text-sm rounded">{error}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify upload flow**

Visit http://localhost:3000/upload — drag a .docx file, verify it uploads and redirects to dashboard with the new resume visible.

---

### Task 14: JD Management Page

**Files:**
- Create: `packages/frontend/app/jobs/page.tsx`

- [ ] **Step 1: Create jobs page**

File: `packages/frontend/app/jobs/page.tsx`
```tsx
"use client";

import { useEffect, useState } from "react";
import { JobDescriptionItem } from "@cvbuilder/shared";

const API = "http://localhost:3001";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobDescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchJobs() {
    const res = await fetch(`${API}/jobs`, { credentials: "include" });
    const json = await res.json();
    setJobs(json.data ?? []);
  }

  useEffect(() => { fetchJobs().finally(() => setLoading(false)); }, []);

  async function createJob(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`${API}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, company: company || undefined, content }),
    });
    setSaving(false);
    setShowForm(false);
    setTitle("");
    setCompany("");
    setContent("");
    fetchJobs();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">我的 JD</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
          新建 JD
        </button>
      </div>

      {showForm && (
        <form onSubmit={createJob} className="mb-6 p-6 bg-white border border-border-light rounded-md space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">职位名称 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none" placeholder="如：高级前端工程师" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">公司名称</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none" placeholder="选填" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">JD 正文 *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={8} className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none" placeholder="粘贴岗位描述的完整内容..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-40">
              {saving ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-border rounded text-sm text-text-secondary hover:bg-surface-tertiary">
              取消
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 bg-surface-tertiary rounded-md animate-pulse" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold mb-2">还没有岗位描述</h3>
          <p className="text-sm text-text-secondary">创建你的第一个岗位描述，开始匹配分析</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.id} className="flex justify-between items-center p-4 bg-white border border-border-light rounded-md">
              <div>
                <div className="text-sm font-medium">{j.title}{j.company ? ` · ${j.company}` : ""}</div>
                <div className="text-xs text-text-muted mt-1">创建于 {new Date(j.createdAt).toLocaleDateString("zh-CN")}</div>
              </div>
              <button onClick={async () => {
                await fetch(`${API}/jobs/${j.id}`, { method: "DELETE", credentials: "include" });
                fetchJobs();
              }} className="px-3 py-1.5 text-xs text-text-muted hover:text-error">删除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify JD management**

Visit http://localhost:3000/jobs — create a JD, verify it appears in the list, verify delete works.

---

### Task 15: Analysis Results Page

**Files:**
- Create: `packages/frontend/app/analyze/[resumeId]/page.tsx`

- [ ] **Step 1: Create analyze page with JD picker and results display**

File: `packages/frontend/app/analyze/[resumeId]/page.tsx`
```tsx
"use client";

import { useEffect, useState, use } from "react";
import { JobDescriptionItem, AnalysisResult, ResumeDetail } from "@cvbuilder/shared";

const API = "http://localhost:3001";

export default function AnalyzePage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = use(params);
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [jobs, setJobs] = useState<JobDescriptionItem[]>([]);
  const [selectedJd, setSelectedJd] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [progressStep, setProgressStep] = useState(0);

  useEffect(() => {
    fetch(`${API}/resumes/${resumeId}`, { credentials: "include" }).then((r) => r.json()).then((j) => setResume(j.data));
    fetch(`${API}/jobs`, { credentials: "include" }).then((r) => r.json()).then((j) => setJobs(j.data ?? []));
  }, [resumeId]);

  async function startAnalyze() {
    if (!selectedJd) return;
    setError("");
    setAnalyzing(true);
    setProgressStep(0);

    const steps = ["读取简历", "解析JD核心需求", "计算匹配度"];
    const timer = setInterval(() => setProgressStep((p) => Math.min(p + 1, 2)), 3000);

    try {
      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resumeId, jobDescriptionId: selectedJd }),
      });
      const json = await res.json();
      clearInterval(timer);
      if (!json.success) {
        setError(json.error?.message ?? "分析失败");
        return;
      }
      setResult(json.data);
      setRemaining(json.data.remainingFreeCount);
      setProgressStep(3);
    } catch {
      setError("网络错误，请重试");
    } finally {
      clearInterval(timer);
      setAnalyzing(false);
    }
  }

  if (!resume) return <div className="p-8 text-text-muted text-sm">加载中...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">分析简历</h2>
      <p className="text-sm text-text-secondary mb-6">{resume.fileNameOriginal}</p>

      {!result && (
        <div className="p-6 bg-white border border-border-light rounded-md">
          <label className="block text-sm font-medium mb-2">选择目标岗位</label>
          {jobs.length === 0 ? (
            <div className="text-sm text-text-muted">
              还没有 JD — <a href="/jobs" className="text-accent underline">去创建一个</a>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {jobs.map((j) => (
                <label key={j.id} className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${selectedJd === j.id ? "border-accent bg-accent/5" : "border-border-light hover:border-text-muted"}`}>
                  <input type="radio" name="jd" value={j.id} checked={selectedJd === j.id} onChange={() => setSelectedJd(j.id)} className="accent-accent" />
                  <div>
                    <div className="text-sm font-medium">{j.title}</div>
                    {j.company && <div className="text-xs text-text-muted">{j.company}</div>}
                  </div>
                </label>
              ))}
            </div>
          )}
          <button onClick={startAnalyze} disabled={!selectedJd || analyzing} className="px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors">
            {analyzing ? "分析中..." : "免费分析"}
          </button>
          {resume.freeAnalysisCount !== undefined && (
            <p className="text-xs text-text-muted mt-2">剩余免费分析 {resume.freeAnalysisCount} 次</p>
          )}
        </div>
      )}

      {analyzing && (
        <div className="mt-6 p-6 bg-white border border-border-light rounded-md">
          <div className="flex items-center gap-4 mb-4">
            {[0, 1, 2].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${progressStep > step ? "bg-accent text-white" : progressStep === step ? "bg-accent/20 text-accent animate-pulse" : "bg-surface-tertiary text-text-muted"}`}>
                  {progressStep > step ? "✓" : step + 1}
                </div>
                <span className={`text-xs ${progressStep >= step ? "text-text-primary" : "text-text-muted"}`}>
                  {["读取简历", "解析JD核心需求", "计算匹配度"][step]}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-surface-tertiary rounded animate-pulse w-3/4" />
            <div className="h-4 bg-surface-tertiary rounded animate-pulse w-1/2" />
            <div className="h-4 bg-surface-tertiary rounded animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-error text-sm rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => { setError(""); setResult(null); }} className="text-sm underline">重试</button>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="text-center py-10">
            <div className="font-[family-name:var(--font-display)] text-7xl font-bold text-accent">{result.matchScore}</div>
            <div className="text-sm text-text-secondary mt-2">匹配度分数</div>
            <p className="text-sm text-text-primary mt-4 max-w-md mx-auto">{result.matchSummary || `你的简历覆盖了该岗位 ${result.matchScore}% 的核心需求`}</p>
          </div>

          <div className="mt-6 space-y-4">
            <details open className="bg-white border border-border-light rounded-md">
              <summary className="p-4 text-sm font-medium cursor-pointer">JD 核心解码</summary>
              <div className="px-4 pb-4 space-y-3">
                {result.jdCoreDecoding?.map((item, i) => (
                  <div key={i} className="p-3 bg-surface-tertiary rounded">
                    <div className="text-sm font-medium">{item.core}</div>
                    <div className="text-xs text-text-secondary mt-1">隐性考察：{item.hidden}</div>
                  </div>
                ))}
              </div>
            </details>

            <details open className="bg-white border border-border-light rounded-md">
              <summary className="p-4 text-sm font-medium cursor-pointer">优化建议</summary>
              <div className="px-4 pb-4 space-y-3">
                {result.optimizationSuggestions?.map((item, i) => (
                  <div key={i} className="p-3 bg-surface-tertiary rounded">
                    <div className="text-sm font-medium">{item.target} — <span className="text-accent">{item.action === "add" ? "新增" : item.action === "modify" ? "修改" : "删除"}</span></div>
                    <div className="text-xs text-text-secondary mt-1">{item.detail}</div>
                    <div className="text-xs text-text-muted mt-1 italic">示例：{item.example}</div>
                  </div>
                ))}
              </div>
            </details>

            <details open className="bg-white border border-border-light rounded-md">
              <summary className="p-4 text-sm font-medium cursor-pointer">排雷清单</summary>
              <div className="px-4 pb-4 space-y-2">
                {result.detailChecklist?.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.type === "delete" ? "bg-red-50 text-error" : "bg-amber-50 text-amber-600"}`}>
                      {item.type === "delete" ? "删除" : "修改"}
                    </span>
                    <div>
                      <span className="text-text-muted">{item.location}：</span>
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify full flow**

1. Upload a resume at /upload
2. Create a JD at /jobs
3. Go to /analyze/<resumeId>, select the JD, click "免费分析"
4. Verify: progress indicator appears → match score + 3 expanded sections display

---

### Task 16: Integration Test (Full Flow)

**Files:**
- Create: `packages/backend/test/analyze.e2e-spec.ts`

- [ ] **Step 1: Create E2E test skeleton**

File: `packages/backend/test/analyze.e2e-spec.ts`
```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Analyze E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.analysisRecord.deleteMany();
    await prisma.resume.deleteMany();
    await prisma.jobDescription.deleteMany();
    await app.close();
  });

  it("POST /analyze returns 404 for nonexistent resume", async () => {
    const res = await request(app.getHttpServer())
      .post("/analyze")
      .send({ resumeId: "nonexistent", jobDescriptionId: "nonexistent" })
      .set("Cookie", ["session_id=test-e2e"]);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("POST /analyze returns 422 for resume not parsed", async () => {
    const resume = await prisma.resume.create({
      data: { id: "test-resume-1", sessionId: "test-e2e", filePath: "/tmp/test.pdf", fileType: "pdf", parseStatus: "pending" },
    });
    const jd = await prisma.jobDescription.create({
      data: { id: "test-jd-1", sessionId: "test-e2e", title: "Test JD", content: "Test content" },
    });
    const res = await request(app.getHttpServer())
      .post("/analyze")
      .send({ resumeId: resume.id, jobDescriptionId: jd.id })
      .set("Cookie", ["session_id=test-e2e"]);
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx jest packages/backend/test/analyze.e2e-spec.ts --forceExit`
Expected: both tests pass (404 test + 422 test)
