# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish three-layer defense (nginx → NestJS global → route-level) with caching, rate limiting, DTO validation, and Turnstile captcha.

**Architecture:** nginx handles connection/rate limits and GET response micro-caching. NestJS adds Helmet security headers, global ValidationPipe, user-aware throttling, Redis-backed hot-data caching, and Turnstile verification on auth endpoints. BullMQ gets queue-level rate limiting.

**Tech Stack:** nginx, NestJS 11, @nestjs/throttler v6, helmet, ioredis (existing), class-validator (existing), react-turnstile, Cloudflare Turnstile API

## Global Constraints

- No external paid services — all protections use existing infrastructure or free services
- Reuse existing Redis instance (shared with BullMQ) — no new infrastructure
- NestJS module pattern: each module has module.ts / controller.ts / service.ts, registered in app.module.ts
- Shared types package must be built (`npm run build -w packages/shared`) before backend can resolve new imports
- All DTOs use class-validator decorators; global ValidationPipe strips unknown fields

---

### Task 1: nginx layer — rate limiting, connection control, proxy cache

**Files:**
- Modify: `nginx/nginx.conf`

**Interfaces:**
- Produces: nginx reverse proxy with `limit_req_zone`, `limit_conn_zone`, `proxy_cache_path`, per-location limits

- [ ] **Step 1: Replace nginx.conf with hardened configuration**

Replace the entire content of `nginx/nginx.conf`:

```nginx
# Rate limiting zones
limit_req_zone  $binary_remote_addr zone=api_global:10m rate=30r/s;
limit_req_zone  $binary_remote_addr zone=api_auth:10m   rate=3r/m;
limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

# Cache path for GET responses
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:100m
                 max_size=1g inactive=60m;

server {
    listen 80;
    server_name _;

    # Global limits
    client_max_body_size 6m;
    client_body_timeout 10s;
    client_header_timeout 10s;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets with long cache (Next.js content-hashed files)
    location /_next/static/ {
        proxy_pass http://frontend:3000;
        proxy_cache api_cache;
        proxy_cache_valid 200 30d;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Auth routes — strictest limits
    location /api/auth/ {
        rewrite ^/api/auth/(.*) /auth/$1 break;
        proxy_pass http://backend:3001;
        limit_req zone=api_auth burst=2 nodelay;
        limit_conn conn_per_ip 5;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API — general limits + GET micro-cache
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://backend:3001;
        limit_req zone=api_global burst=15 nodelay;
        limit_conn conn_per_ip 20;

        # GET response micro-cache (5s)
        proxy_cache api_cache;
        proxy_cache_valid 200 5s;
        proxy_cache_key "$request_method|$request_uri|$http_authorization";
        proxy_cache_bypass $http_cache_control;
        proxy_cache_methods GET HEAD;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- [ ] **Step 2: Validate nginx syntax** (run on server after deploy)

```bash
nginx -t
```

Expected: `syntax is ok` / `test is successful`

- [ ] **Step 3: Reload nginx** (run on server after deploy)

```bash
nginx -s reload
```

- [ ] **Step 4: Verify — test rate limiting**

```bash
# Should succeed for first requests, then start returning 503
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" https://cvbuilder.ltd/api/auth/login -X POST -H "Content-Type: application/json" -d '{"phone":"13800000000","password":"test"}'
done
```

Expected: First 2-3 return 401 (auth failure), subsequent within same minute return 503 (rate limited)

- [ ] **Step 5: Verify — test GET caching**

```bash
curl -s -D - https://cvbuilder.ltd/api/health | grep X-Cache-Status
# First request: MISS
# Second request within 5s: HIT
```

- [ ] **Step 6: Commit**

```bash
git add nginx/nginx.conf
git commit -m "feat(nginx): add rate limiting, connection control, and GET response micro-cache"
```

---

### Task 2: Helmet security headers

**Files:**
- Modify: `packages/backend/src/main.ts`
- Modify: `packages/backend/package.json`

**Interfaces:**
- Produces: All HTTP responses include security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)

- [ ] **Step 1: Install helmet**

```bash
npm install helmet -w packages/backend
```

- [ ] **Step 2: Add helmet to main.ts**

Insert after `app.use(cookieParser())` in `packages/backend/src/main.ts`:

```typescript
// Add this import at the top of the file, after the existing imports:
import helmet from "helmet";

// Add this line after app.use(cookieParser()); (around line 11):
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
```

The full relevant section of `main.ts` after the change:

```typescript
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.enableCors({
    // ... existing CORS config unchanged
  });
  await app.listen(3001);
}
bootstrap();
```

- [ ] **Step 3: Verify — check security headers in response**

Start backend (`npm run dev:backend`), then:

```bash
curl -s -D - http://localhost:3001/health | head -20
```

Expected: Response headers include `x-content-type-options: nosniff`, `x-frame-options: DENY`, `strict-transport-security: max-age=31536000; includeSubDomains`

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/main.ts packages/backend/package.json
git commit -m "feat(security): add helmet security headers"
```

---

### Task 3: Global ValidationPipe

**Files:**
- Modify: `packages/backend/src/main.ts`

**Interfaces:**
- Produces: All `@Body()` decorated parameters validated against their DTO classes; unknown fields rejected with 400

- [ ] **Step 1: Add ValidationPipe to main.ts**

Add the import and `app.useGlobalPipes` call in `packages/backend/src/main.ts`. Add the import after the `helmet` import:

```typescript
import { ValidationPipe } from "@nestjs/common";
```

Add after `app.use(helmet(...))` and before `app.enableCors(...)`:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

The full bootstrap function after both changes:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.enableCors({
    // ... existing unchanged
  });
  await app.listen(3001);
}
```

- [ ] **Step 2: Verify — test with invalid body**

Start backend, then:

```bash
# Send unknown field — should get 400
curl -s http://localhost:3001/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000000","password":"123456","hack":"evil"}'
```

Expected: 400 with validation error message mentioning `hack` is not allowed

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/main.ts
git commit -m "feat(security): add global ValidationPipe with whitelist and forbidNonWhitelisted"
```

---

### Task 4: Strengthen auth DTOs

**Files:**
- Modify: `packages/backend/src/auth/auth.dto.ts`

**Interfaces:**
- Produces: `LoginDto` with phone regex + turnstileToken; `RegisterDto` with turnstileToken added

- [ ] **Step 1: Add turnstileToken field and fix LoginDto validation**

Replace the entire content of `packages/backend/src/auth/auth.dto.ts`:

```typescript
import { IsString, Length, Matches } from "class-validator";

export class RegisterDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone!: string;

  @IsString()
  @Length(6, 64, { message: "密码最少6位" })
  password!: string;

  @IsString()
  @Length(1, 2048)
  turnstileToken!: string;
}

export class LoginDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone!: string;

  @IsString()
  @Length(1, 64)
  password!: string;

  @IsString()
  @Length(1, 2048)
  turnstileToken!: string;
}
```

- [ ] **Step 2: Verify — test LoginDto validation**

```bash
# Missing turnstileToken should 400
curl -s http://localhost:3001/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000000","password":"123456"}'
```

Expected: 400, error mentions `turnstileToken`

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/auth/auth.dto.ts
git commit -m "feat(security): add turnstileToken to LoginDto/RegisterDto, add phone regex to LoginDto"
```

---

### Task 5: Create missing DTOs for critical endpoints

**Files:**
- Create: `packages/backend/src/jobs/dto/create-job.dto.ts`
- Create: `packages/backend/src/export/dto/export.dto.ts`
- Create: `packages/backend/src/recharges/dto/recharge-order.dto.ts`

**Interfaces:**
- Produces: `CreateJobDto` with validated title/description; `ExportDto` with validated markdown; `RechargeOrderDto` with validated amount

- [ ] **Step 1: Create jobs DTO**

Create `packages/backend/src/jobs/dto/create-job.dto.ts`:

```typescript
import { IsString, Length } from "class-validator";

export class CreateJobDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 10000)
  description!: string;
}
```

- [ ] **Step 2: Create export DTO**

Create `packages/backend/src/export/dto/export.dto.ts`:

```typescript
import { IsString, Length } from "class-validator";

export class ExportDto {
  @IsString()
  @Length(1, 50000)
  markdown!: string;
}
```

- [ ] **Step 3: Create recharge order DTO**

Create `packages/backend/src/recharges/dto/recharge-order.dto.ts`:

```typescript
import { IsIn } from "class-validator";

const ALLOWED_AMOUNTS = [10, 20, 50];

export class RechargeOrderDto {
  @IsIn(ALLOWED_AMOUNTS, { message: "无效的充值金额，可选：10, 20, 50" })
  amount!: number;
}
```

- [ ] **Step 4: Update controllers to use new DTOs**

In `packages/backend/src/jobs/jobs.controller.ts`:
- Add import: `import { CreateJobDto } from "./dto/create-job.dto";`
- Change `@Body() body: CreateJobRequest` to `@Body() body: CreateJobDto` (line 14)

In `packages/backend/src/export/export.controller.ts`:
- Add import: `import { ExportDto } from "./dto/export.dto";`
- Change `@Body() body: { markdown: string }` in both methods to `@Body() body: ExportDto`

In `packages/backend/src/recharges/recharges.controller.ts`:
- Add import: `import { RechargeOrderDto } from "./dto/recharge-order.dto";`
- Change `@Body() body: { amount: number }` to `@Body() body: RechargeOrderDto`
- Remove the manual `ALLOWED_PLANS` check (`if (!ALLOWED_PLANS.includes(body.amount))` lines 18-20) since ValidationPipe now handles it
- Remove the `ALLOWED_PLANS` constant (lines 8) since it's now in the DTO

- [ ] **Step 5: Build shared package + verify types**

```bash
npm run build -w packages/shared
cd packages/backend && npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/jobs/dto/ packages/backend/src/export/dto/ packages/backend/src/recharges/dto/ packages/backend/src/jobs/jobs.controller.ts packages/backend/src/export/export.controller.ts packages/backend/src/recharges/recharges.controller.ts
git commit -m "feat(security): add DTO validation for jobs, export, and recharge endpoints"
```

---

### Task 6: UserAwareThrottlerGuard

**Files:**
- Create: `packages/backend/src/common/throttler/user-aware-throttler.guard.ts`
- Modify: `packages/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `req.user?.userId` (set by AuthGuard)
- Produces: `UserAwareThrottlerGuard` — extends `ThrottlerGuard`, uses `user:{userId}` key for authenticated users, `ip:{ip}` for anonymous

- [ ] **Step 1: Create the guard**

Create `packages/backend/src/common/throttler/user-aware-throttler.guard.ts`:

```typescript
import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.userId;
    if (userId) return `user:${userId}`;
    return `ip:${req.ip}`;
  }
}
```

- [ ] **Step 2: Replace global ThrottlerGuard in app.module.ts**

In `packages/backend/src/app.module.ts`, change the import:

```typescript
// Before:
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

// After:
import { ThrottlerModule } from "@nestjs/throttler";
import { UserAwareThrottlerGuard } from "./common/throttler/user-aware-throttler.guard";
```

And change the provider:

```typescript
// Before:
{ provide: APP_GUARD, useClass: ThrottlerGuard },

// After:
{ provide: APP_GUARD, useClass: UserAwareThrottlerGuard },
```

- [ ] **Step 3: Verify — type check**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Verify — test authenticated user throttling**

Start backend, get a JWT token via login, then:

```bash
TOKEN="<your-jwt>"
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/jobs \
    -H "Authorization: Bearer $TOKEN"
done
```

Expected: Last requests return 429

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/common/throttler/user-aware-throttler.guard.ts packages/backend/src/app.module.ts
git commit -m "feat(security): add UserAwareThrottlerGuard — throttle by userId for authenticated users"
```

---

### Task 7: Add @Throttle to unprotected critical routes

**Files:**
- Modify: `packages/backend/src/export/export.controller.ts`
- Modify: `packages/backend/src/resumes/resumes.controller.ts`
- Modify: `packages/backend/src/jobs/jobs.controller.ts`
- Modify: `packages/backend/src/recharges/recharges.controller.ts`

**Interfaces:**
- Produces: All mutation and heavy endpoints have explicit rate limits

- [ ] **Step 1: Add @Throttle to export controller**

In `packages/backend/src/export/export.controller.ts`:
- Add import: `import { Throttle } from "@nestjs/throttler";`
- Add `@Throttle({ default: { ttl: 60000, limit: 5 } })` above both `exportPdf()` and `exportDocx()` methods

The controller after changes:

```typescript
import { Controller, Post, Body, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { ExportService } from "./export.service";
import { AuthGuard } from "../auth/auth.guard";
import { ExportDto } from "./dto/export.dto";

@Controller("export")
@UseGuards(AuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post("pdf")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async exportPdf(@Body() body: ExportDto, @Res() res: Response) {
    const pdf = await this.exportService.exportPdf(body.markdown);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="resume.pdf"',
      "Content-Length": pdf.length.toString(),
    });
    res.send(pdf);
  }

  @Post("docx")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async exportDocx(@Body() body: ExportDto, @Res() res: Response) {
    const docx = await this.exportService.exportDocx(body.markdown);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="resume.docx"',
      "Content-Length": docx.length.toString(),
    });
    res.send(docx);
  }
}
```

- [ ] **Step 2: Add @Throttle to resume and job DELETE endpoints**

In `packages/backend/src/resumes/resumes.controller.ts`:
- Add `@Throttle({ default: { ttl: 60000, limit: 10 } })` above the `delete()` method (between `@Delete(":id")` and `async delete`)

In `packages/backend/src/jobs/jobs.controller.ts`:
- Add import: `import { Throttle } from "@nestjs/throttler";`
- Add `@Throttle({ default: { ttl: 60000, limit: 10 } })` above the `delete()` method

- [ ] **Step 3: Add @Throttle to recharge notify endpoint**

In `packages/backend/src/recharges/recharges.controller.ts`:
- Add import: `import { Throttle } from "@nestjs/throttler";`
- Add `@Throttle({ default: { ttl: 60000, limit: 10 } })` above the `notify()` method

- [ ] **Step 4: Verify — type check**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/export/export.controller.ts packages/backend/src/resumes/resumes.controller.ts packages/backend/src/jobs/jobs.controller.ts packages/backend/src/recharges/recharges.controller.ts
git commit -m "feat(security): add @Throttle to export, delete, and recharge notify endpoints"
```

---

### Task 8: BullMQ limiter

**Files:**
- Modify: `packages/backend/src/resumes/parse-queue.provider.ts`

**Interfaces:**
- Produces: Resume parse queue with `limiter: { max: 5, duration: 60000 }` (max 5 jobs per minute)

- [ ] **Step 1: Add limiter to parse queue**

Replace the content of `packages/backend/src/resumes/parse-queue.provider.ts`:

```typescript
import { Queue } from "bullmq";

export const PARSE_QUEUE = "PARSE_QUEUE";

export const parseQueueProvider = {
  provide: PARSE_QUEUE,
  useFactory: () => new Queue("resume-parse", {
    connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
    defaultJobOptions: {
      attempts: 3,
      backoff: { delay: 2000, type: "exponential" },
    },
    limiter: {
      max: 5,
      duration: 60000,
    },
  }),
};
```

- [ ] **Step 2: Verify — type check**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/resumes/parse-queue.provider.ts
git commit -m "feat(security): add BullMQ limiter (5/min) to resume parse queue"
```

---

### Task 9: Redis module + CacheService

**Files:**
- Create: `packages/backend/src/common/cache/cache.module.ts`
- Create: `packages/backend/src/common/cache/cache.service.ts`
- Modify: `packages/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Redis connection (from `REDIS_URL` env var)
- Produces: `CacheModule` (global), `CacheService` with `getOrSet<T>(key, ttlSeconds, factory)` and `del(pattern)`

- [ ] **Step 1: Create CacheService**

Create `packages/backend/src/common/cache/cache.service.ts`:

```typescript
import { Injectable, Inject } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    const data = await factory();
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }

  async del(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length) await this.redis.del(keys);
  }
}
```

- [ ] **Step 2: Create CacheModule**

Create `packages/backend/src/common/cache/cache.module.ts`:

```typescript
import { Module, Global } from "@nestjs/common";
import Redis from "ioredis";
import { CacheService, REDIS_CLIENT } from "./cache.service";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis(process.env.REDIS_URL || "redis://localhost:6379"),
    },
    CacheService,
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class CacheModule {}
```

- [ ] **Step 3: Register CacheModule in AppModule**

In `packages/backend/src/app.module.ts`:
- Add import: `import { CacheModule } from "./common/cache/cache.module";`
- Add `CacheModule` to the `imports` array

The imports array should look like:

```typescript
imports: [
  ThrottlerModule.forRoot([{
    ttl: 60000,
    limit: 60,
  }]),
  CacheModule,
  PrismaModule, AuthModule, ResumesModule, JobsModule,
  AnalyzeModule, GenerateModule, ExportModule,
  PointsModule, RechargesModule, GeneratedResumesModule, PaymentModule,
  HealthModule,
],
```

- [ ] **Step 4: Verify — type check + quick Redis test**

```bash
cd packages/backend && npx tsc --noEmit
```

Start Redis if not running (`docker compose up -d redis`), start backend, then test that the module loads without errors.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/common/cache/ packages/backend/src/app.module.ts
git commit -m "feat(cache): add Redis CacheService with getOrSet and pattern-based deletion"
```

---

### Task 10: Hot endpoint cache integration

**Files:**
- Modify: `packages/backend/src/jobs/jobs.controller.ts`
- Modify: `packages/backend/src/jobs/jobs.service.ts`
- Modify: `packages/backend/src/analyze/analyze.controller.ts`
- Modify: `packages/backend/src/analyze/analyze.service.ts`
- Modify: `packages/backend/src/resumes/resumes.controller.ts`
- Modify: `packages/backend/src/resumes/resumes.service.ts`
- Modify: `packages/backend/src/points/points.controller.ts`
- Modify: `packages/backend/src/points/points.service.ts`

**Interfaces:**
- Consumes: `CacheService.getOrSet()` and `CacheService.del()`
- Produces: Cached responses for GET hotspots; cache invalidation on writes

- [ ] **Step 1: Cache jobs list and detail endpoints**

In `packages/backend/src/jobs/jobs.controller.ts`:
- Add import: `import { CacheService } from "../common/cache/cache.service";`
- Inject: `constructor(private readonly jobsService: JobsService, private readonly cache: CacheService) {}`
- Cache `list()`:

```typescript
@Get()
async list(@Req() req: any): Promise<JobDescriptionItem[]> {
  return this.cache.getOrSet(`cache:jobs:list:${req.userId}`, 30, () =>
    this.jobsService.list(req.userId)
  );
}
```

- Cache `detail()`:

```typescript
@Get(":id")
async detail(@Param("id") id: string, @Req() req: any) {
  return this.cache.getOrSet(`cache:jobs:${id}`, 60, () =>
    this.jobsService.detail(id, req.userId)
  );
}
```

In `packages/backend/src/jobs/jobs.service.ts`:
- Inject `CacheService`
- After successful `create()`: `await this.cache.del(`cache:jobs:list:${userId}`);`
- After successful `delete()`: `await this.cache.del(`cache:jobs:list:${userId}`); await this.cache.del(`cache:jobs:${id}`);`

- [ ] **Step 2: Cache analyze saved list**

In `packages/backend/src/analyze/analyze.controller.ts`:
- Add import: `import { CacheService } from "../common/cache/cache.service";`
- Inject CacheService in constructor
- Cache `listSaved()`:

```typescript
@Get("saved")
async listSaved(@Req() req: any) {
  return this.cache.getOrSet(`cache:analyze:list:${req.userId}`, 30, () =>
    this.analyzeService.listSaved(req.userId)
  );
}
```

In `packages/backend/src/analyze/analyze.service.ts`:
- Inject `CacheService`
- After successful `analyze()`: `await this.cache.del(`cache:analyze:list:${userId}`);`

- [ ] **Step 3: Cache points balance**

In `packages/backend/src/points/points.controller.ts`:
- Add import and inject `CacheService`
- Cache the balance endpoint:

```typescript
@Get("balance")
async getBalance(@Req() req: any) {
  return this.cache.getOrSet(`cache:points:${req.userId}`, 5, () =>
    this.pointsService.getBalance(req.userId)
  );
}
```

In `packages/backend/src/points/points.service.ts`:
- Inject `CacheService`
- After any points mutation (deduct, recharge callback): `await this.cache.del(`cache:points:${userId}`);`

- [ ] **Step 4: Cache resumes list**

In `packages/backend/src/resumes/resumes.controller.ts`:
- Add import and inject `CacheService`
- Cache `list()`:

```typescript
@Get()
async list(@Req() req: any): Promise<ResumeItem[]> {
  return this.cache.getOrSet(`cache:resumes:list:${req.userId}`, 10, () =>
    this.resumesService.list(req.userId)
  );
}
```

In `packages/backend/src/resumes/resumes.service.ts`:
- Inject `CacheService`
- After `upload()` and `delete()`: `await this.cache.del(`cache:resumes:list:${userId}`);`

- [ ] **Step 5: Verify — type check**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/jobs/ packages/backend/src/analyze/ packages/backend/src/points/ packages/backend/src/resumes/
git commit -m "feat(cache): integrate Redis caching for jobs, analyze, points, and resumes hot endpoints"
```

---

### Task 11: Cloudflare Turnstile — backend verification

**Files:**
- Modify: `packages/backend/src/auth/auth.service.ts`
- Modify: `packages/backend/src/auth/auth.controller.ts`

**Interfaces:**
- Consumes: `turnstileToken` from LoginDto/RegisterDto, `TURNSTILE_SECRET_KEY` from env
- Produces: Turnstile verification before login/register; throws 400 if verification fails

- [ ] **Step 1: Add verifyTurnstile method to AuthService**

In `packages/backend/src/auth/auth.service.ts`, add after the `constructor`:

```typescript
private async verifyTurnstile(token: string): Promise<boolean> {
  const resp = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(process.env.TURNSTILE_SECRET_KEY || "")}&response=${encodeURIComponent(token)}`,
    }
  );
  const data = await resp.json();
  return data.success === true;
}
```

- [ ] **Step 2: Add verification calls to register() and login()**

In `register()`, add at the top after the existing validations:

```typescript
async register(phone: string, password: string, turnstileToken: string) {
  // ... existing phone/password validation ...

  if (!(await this.verifyTurnstile(turnstileToken))) {
    throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "安全验证失败，请重试" }, 400);
  }

  // ... rest of existing register logic ...
}
```

In `login()`, add at the top:

```typescript
async login(phone: string, password: string, turnstileToken: string) {
  if (!(await this.verifyTurnstile(turnstileToken))) {
    throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "安全验证失败，请重试" }, 400);
  }

  // ... rest of existing login logic ...
}
```

- [ ] **Step 3: Update AuthController to pass turnstileToken**

In `packages/backend/src/auth/auth.controller.ts`, update the two methods:

```typescript
@Post("register")
@Throttle({ default: { ttl: 60000, limit: 5 } })
async register(@Body() body: RegisterDto) {
  return this.authService.register(body.phone, body.password, body.turnstileToken);
}

@Post("login")
@Throttle({ default: { ttl: 60000, limit: 5 } })
async login(@Body() body: LoginDto) {
  return this.authService.login(body.phone, body.password, body.turnstileToken);
}
```

- [ ] **Step 4: Verify — type check**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/auth/
git commit -m "feat(security): add Cloudflare Turnstile verification to login and register"
```

---

### Task 12: Cloudflare Turnstile — frontend widget

**Files:**
- Modify: `packages/frontend/app/page.tsx`

**Interfaces:**
- Produces: Turnstile widget rendered in login/register form; token passed to backend on submit

- [ ] **Step 1: Install react-turnstile**

```bash
npm install react-turnstile -w packages/frontend
```

- [ ] **Step 2: Add Turnstile to login page**

In `packages/frontend/app/page.tsx`:

Add import at top:
```typescript
import Turnstile from "react-turnstile";
```

Add state after `const [agreed, setAgreed] = useState(false);`:
```typescript
const [turnstileToken, setTurnstileToken] = useState("");
```

Update `submit()` to include turnstileToken in the fetch body. Change the body line from:
```typescript
body: JSON.stringify({ phone, password }),
```
To:
```typescript
body: JSON.stringify({ phone, password, turnstileToken }),
```

Add the Turnstile widget BEFORE the submit Button (after the checkbox section for register, or before the button for both tabs). Insert this JSX right before the `<Button>` element:

```tsx
<Turnstile
  sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
  onVerify={(token) => setTurnstileToken(token)}
  onExpire={() => setTurnstileToken("")}
  theme="light"
/>
```

Update the Button's disabled prop to include turnstileToken check:
```tsx
disabled={!phone || !password || !turnstileToken || (tab === "register" && !agreed)}
```

- [ ] **Step 3: Verify — type check and build**

```bash
npm run build -w packages/shared
cd packages/frontend && npx tsc --noEmit
```

Expected: No type errors (note: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` will need to be added to env later; the fallback `1x00000000000000000000AA` is Turnstile's test key that always passes)

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/app/page.tsx packages/frontend/package.json
git commit -m "feat(security): add Cloudflare Turnstile widget to login/register page"
```

---

### Task 13: Environment variables + PROGRESS.md update

**Files:**
- Modify: `packages/backend/.env` (local dev)
- Modify: `.env.prod` (production template)
- Modify: `PROGRESS.md`

**Interfaces:**
- Produces: Turnstile keys documented in env files; PROGRESS.md checklist updated

- [ ] **Step 1: Add Turnstile env vars to .env files**

Add to `packages/backend/.env`:
```bash
# Cloudflare Turnstile (get keys at https://dash.cloudflare.com/ → Turnstile)
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Add to `.env.prod`:
```bash
# Cloudflare Turnstile
TURNSTILE_SITE_KEY=<your-production-site-key>
TURNSTILE_SECRET_KEY=<your-production-secret-key>
```

The test keys (`1x...AA`) always pass verification — used for local dev only.

- [ ] **Step 2: Mark all checklist items complete in PROGRESS.md**

Update `PROGRESS.md` section 八, changing all `⬜` to `✅` for completed items. Update the last "变更记录" entry:

```markdown
| 2026-07-29 | 全部 13 项实施完成 |
```

Update section 一 status row:
```markdown
| 安全加固 | ✅ 已完成（v0.5.2 缓存 + 防爬虫 + 防 DDoS） |
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/.env .env.prod PROGRESS.md
git commit -m "chore: add Turnstile env vars, update PROGRESS.md with completion status"
```

---

## Implementation Order

```
Batch 1 (infrastructure, no business logic):
  Task 1  → nginx hardening
  Task 2  → helmet
  Task 3  → ValidationPipe
  ── deploy & verify nginx works ──

Batch 2 (application validation + throttling):
  Task 4  → auth DTOs strengthened
  Task 5  → missing DTOs (jobs, export, recharge)
  Task 6  → UserAwareThrottlerGuard
  Task 7  → @Throttle on unprotected routes
  Task 8  → BullMQ limiter
  ── deploy & verify rate limits work ──

Batch 3 (cache + captcha):
  Task 9  → Redis CacheService
  Task 10 → hot endpoint cache integration
  Task 11 → Turnstile backend
  Task 12 → Turnstile frontend
  Task 13 → env vars + docs
  ── deploy & verify full stack ──
```

Each batch is independently deployable and testable.
