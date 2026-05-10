# 积分充值系统 — 实施计划

> **对于 agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用积分制替代免费次数限制，接入手动微信充值审核流程。

**Architecture:** 新增 PointsModule 和 RechargesModule 两个 NestJS 模块。PointsModule 提供原子扣减/退款/查询，RechargesModule 管理申请/审批。前端新增充值页、积分余额展示、管理员审批组件。

**Tech Stack:** NestJS + Prisma + Next.js 15 (App Router) + Tailwind CSS 4 + shared types package

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `packages/backend/prisma/schema.prisma` | 新增 RechargeRecord、PointTransaction 模型，User 加 points/role |
| 新增 | `packages/backend/src/points/points.module.ts` | 积分模块定义 |
| 新增 | `packages/backend/src/points/points.service.ts` | 原子扣减/退款/查询积分 |
| 新增 | `packages/backend/src/points/points.controller.ts` | 积分余额 + 流水 API |
| 新增 | `packages/backend/src/recharges/recharges.module.ts` | 充值模块定义 |
| 新增 | `packages/backend/src/recharges/recharges.service.ts` | 充值申请/审批 |
| 新增 | `packages/backend/src/recharges/recharges.controller.ts` | 充值 API |
| 修改 | `packages/backend/src/app.module.ts` | 导入 PointsModule + RechargesModule |
| 修改 | `packages/backend/src/analyze/analyze.service.ts` | 替换 freeAnalysisCount 为 pointsService.deduct |
| 修改 | `packages/backend/src/analyze/analyze.module.ts` | 导入 PointsModule |
| 修改 | `packages/backend/src/generate/generate.service.ts` | 增加 pointsService.deduct |
| 修改 | `packages/backend/src/generate/generate.module.ts` | 导入 PointsModule |
| 修改 | `packages/backend/src/auth/auth.service.ts` | register 送 30 积分，me 返回 points/role |
| 修改 | `packages/backend/src/auth/auth.controller.ts` | 无需改动（service 改 return 即可） |
| 新增 | `packages/shared/types/points.ts` | Points 相关共享类型 |
| 新增 | `packages/frontend/app/recharge/page.tsx` | 充值页面 |
| 新增 | `packages/frontend/app/recharge/history/page.tsx` | 充值记录页 |
| 新增 | `packages/frontend/components/PointsBalance.tsx` | 侧边栏积分卡片 |
| 新增 | `packages/frontend/components/PointsModal.tsx` | 积分明细弹窗 |
| 新增 | `packages/frontend/components/RechargeApproval.tsx` | 管理员审批栏 |
| 新增 | `packages/frontend/components/InsufficientPoints.tsx` | 积分不足拦截弹窗 |
| 修改 | `packages/frontend/app/layout.tsx` | 侧边栏增加积分卡片 |
| 修改 | `packages/frontend/app/dashboard/page.tsx` | 替换 freeCount 为积分展示，增加审批栏 |
| 修改 | `packages/frontend/app/analyze/[resumeId]/page.tsx` | 积分消耗提示 + 不足拦截 |
| 修改 | `packages/frontend/components/AuthModal.tsx` | 注册成功提示送积分 |
| 修改 | `packages/frontend/lib/auth.ts` | apiFetch QUOTA_EXCEEDED 全局拦截 |

---

### Task 1: Schema — Update Database Models

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`

- [ ] **Step 1: Update User model with role and points**

Add `role` and `points` fields to the existing User model. The role field was already added earlier — verify it's present. Add `points`:

```prisma
model User {
  id           String   @id @default(uuid())
  phone        String   @unique
  passwordHash String
  role         String   @default("user")
  points       Int      @default(30)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  resumes          Resume[]
  jobDescriptions  JobDescription[]
  analysisRecords  AnalysisRecord[]
  rechargeRecords  RechargeRecord[]
  pointTransactions PointTransaction[]
  adminRecharges   RechargeRecord[]     @relation("AdminRecharges")
}
```

- [ ] **Step 2: Add RechargeRecord and PointTransaction models**

Add the two new models after the existing models in schema.prisma:

```prisma
model RechargeRecord {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  amount        Int
  points        Int
  orderNo       String
  status        String    @default("pending")
  adminNote     String?
  adminId       String?
  admin         User?     @relation("AdminRecharges", fields: [adminId], references: [id])
  createdAt     DateTime  @default(now())
  approvedAt    DateTime?

  @@index([userId])
  @@index([status])
}

model PointTransaction {
  id          String   @id @default(uuid())
  userId      String
  type        String
  amount      Int
  balance     Int
  description String
  referenceId String?
  createdAt   DateTime @default(now())

  @@index([userId])
}
```

- [ ] **Step 3: Push schema to database**

```bash
npm run db:push -w packages/backend
```

Expected: Schema synced successfully, no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/prisma/schema.prisma
git commit -m "feat: add points, recharge, and transaction models to DB schema"
```

---

### Task 2: Shared Types — Points DTOs

**Files:**
- Create: `packages/shared/types/points.ts`

- [ ] **Step 1: Create shared types file**

```typescript
export interface PointsBalance {
  balance: number;
  recentTransactions: PointTransactionItem[];
}

export interface PointTransactionItem {
  id: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export interface RechargeRequest {
  amount: number;
  orderNo: string;
}

export interface RechargeItem {
  id: string;
  amount: number;
  points: number;
  orderNo: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface PendingRecharge {
  id: string;
  userPhone: string;
  amount: number;
  points: number;
  orderNo: string;
  createdAt: string;
}
```

- [ ] **Step 2: Re-export from shared index**

Read `packages/shared/types/index.ts` and add `export * from "./points";`.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/types/points.ts packages/shared/types/index.ts
git commit -m "feat: add points shared types"
```

---

### Task 3: PointsModule — Backend Service

**Files:**
- Create: `packages/backend/src/points/points.module.ts`
- Create: `packages/backend/src/points/points.service.ts`

- [ ] **Step 1: Create PointsModule**

`packages/backend/src/points/points.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { PointsService } from "./points.service";
import { PointsController } from "./points.controller";

@Module({
  providers: [PointsService],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
```

- [ ] **Step 2: Create PointsService**

`packages/backend/src/points/points.service.ts`:

```typescript
import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async deduct(userId: string, amount: number, description: string, referenceId?: string): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, points: { gte: amount } },
      data: { points: { decrement: amount } },
    });
    if (result.count === 0) {
      throw new HttpException(
        { code: ErrorCode.QUOTA_EXCEEDED, message: `积分不足，需要 ${amount} 积分` },
        403,
      );
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await this.prisma.pointTransaction.create({
      data: { userId, type: "debit", amount, balance: user.points, description, referenceId },
    });

    return user.points;
  }

  async credit(userId: string, amount: number, description: string, referenceId?: string): Promise<number> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: amount } },
    });

    await this.prisma.pointTransaction.create({
      data: { userId, type: "credit", amount, balance: user.points, description, referenceId },
    });

    return user.points;
  }

  async refund(userId: string, amount: number, description: string, referenceId?: string): Promise<number> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: amount } },
    });

    await this.prisma.pointTransaction.create({
      data: { userId, type: "refund", amount, balance: user.points, description, referenceId },
    });

    return user.points;
  }

  async getBalance(userId: string): Promise<{ balance: number; recentTransactions: any[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const recentTransactions = await this.prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, amount: true, balance: true, description: true, createdAt: true },
    });
    return {
      balance: user.points,
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async getTransactions(userId: string, page: number = 1, pageSize: number = 20) {
    const [items, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, type: true, amount: true, balance: true, description: true, createdAt: true },
      }),
      this.prisma.pointTransaction.count({ where: { userId } }),
    ]);
    return {
      items: items.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
      total,
      page,
      pageSize,
    };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/points/
git commit -m "feat: add PointsModule with atomic deduct/refund/query"
```

---

### Task 4: PointsController — Balance & Transactions API

**Files:**
- Create: `packages/backend/src/points/points.controller.ts`

- [ ] **Step 1: Create PointsController**

`packages/backend/src/points/points.controller.ts`:

```typescript
import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { PointsService } from "./points.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";

@Controller("points")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get("balance")
  async getBalance(@Req() req: any) {
    return this.pointsService.getBalance(req.userId);
  }

  @Get("transactions")
  async getTransactions(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.pointsService.getTransactions(
      req.userId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/points/points.controller.ts
git commit -m "feat: add PointsController with balance and transactions endpoints"
```

---

### Task 5: RechargesModule — Recharge Service & Controller

**Files:**
- Create: `packages/backend/src/recharges/recharges.module.ts`
- Create: `packages/backend/src/recharges/recharges.service.ts`
- Create: `packages/backend/src/recharges/recharges.controller.ts`

- [ ] **Step 1: Create RechargesModule**

`packages/backend/src/recharges/recharges.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { RechargesController } from "./recharges.controller";
import { PointsModule } from "../points/points.module";

@Module({
  imports: [PointsModule],
  providers: [RechargesService],
  controllers: [RechargesController],
})
export class RechargesModule {}
```

- [ ] **Step 2: Create RechargesService**

`packages/backend/src/recharges/recharges.service.ts`:

```typescript
import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PointsService } from "../points/points.service";
import { ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class RechargesService {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
  ) {}

  async create(userId: string, amount: number, orderNo: string) {
    if (!Number.isInteger(amount) || amount < 1) {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "充值金额必须为正整数" },
        400,
      );
    }
    if (!orderNo || orderNo.trim().length < 4) {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "请填写转账单号" },
        400,
      );
    }

    const existing = await this.prisma.rechargeRecord.findFirst({
      where: { orderNo: orderNo.trim(), userId },
    });
    if (existing) {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "该单号已提交过" },
        400,
      );
    }

    const record = await this.prisma.rechargeRecord.create({
      data: {
        userId,
        amount,
        points: amount * 10,
        orderNo: orderNo.trim(),
      },
    });

    return { id: record.id, amount, points: record.points, status: record.status };
  }

  async listMine(userId: string) {
    const records = await this.prisma.rechargeRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, amount: true, points: true, orderNo: true,
        status: true, adminNote: true, createdAt: true, approvedAt: true,
      },
    });
    return records.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? undefined,
    }));
  }

  async listPending() {
    const records = await this.prisma.rechargeRecord.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { phone: true } } },
    });
    return records.map((r) => ({
      id: r.id,
      userPhone: r.user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
      amount: r.amount,
      points: r.points,
      orderNo: r.orderNo,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async approve(id: string, adminId: string) {
    const record = await this.prisma.rechargeRecord.findUnique({ where: { id } });
    if (!record) {
      throw new HttpException(
        { code: ErrorCode.RESOURCE_NOT_FOUND, message: "充值记录不存在" },
        404,
      );
    }
    if (record.status !== "pending") {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "该记录已处理" },
        400,
      );
    }

    await this.prisma.rechargeRecord.update({
      where: { id },
      data: { status: "approved", adminId, approvedAt: new Date() },
    });

    await this.points.credit(
      record.userId,
      record.points,
      `充值 ${record.amount} 元`,
      record.id,
    );

    return { success: true };
  }

  async reject(id: string, adminId: string, note?: string) {
    const record = await this.prisma.rechargeRecord.findUnique({ where: { id } });
    if (!record) {
      throw new HttpException(
        { code: ErrorCode.RESOURCE_NOT_FOUND, message: "充值记录不存在" },
        404,
      );
    }
    if (record.status !== "pending") {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "该记录已处理" },
        400,
      );
    }

    await this.prisma.rechargeRecord.update({
      where: { id },
      data: { status: "rejected", adminId, adminNote: note || null },
    });

    return { success: true };
  }
}
```

Note: `approve` uses `this.points.refund()` (not deduct) because refund adds points. The naming is `refund` in the context of "refunding" the recharge amount to the user's balance. This is intentional — it adds points with type "refund" but the description clarifies it's a recharge credit.

- [ ] **Step 3: Create RechargesController**

`packages/backend/src/recharges/recharges.controller.ts`:

```typescript
import { Controller, Post, Get, Body, Param, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";

@Controller("recharges")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class RechargesController {
  constructor(private readonly rechargesService: RechargesService) {}

  @Post()
  async create(@Body() body: { amount: number; orderNo: string }, @Req() req: any) {
    return this.rechargesService.create(req.userId, body.amount, body.orderNo);
  }

  @Get()
  async listMine(@Req() req: any) {
    return this.rechargesService.listMine(req.userId);
  }

  @Get("pending")
  async listPending(@Req() req: any) {
    const user = await (this.rechargesService as any).prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role !== "admin") {
      throw new (await import("@nestjs/common")).HttpException(
        { code: "UNAUTHORIZED", message: "无权限" },
        401,
      );
    }
    return this.rechargesService.listPending();
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Req() req: any) {
    return this.rechargesService.approve(id, req.userId);
  }

  @Post(":id/reject")
  async reject(@Param("id") id: string, @Body() body: { note?: string }, @Req() req: any) {
    return this.rechargesService.reject(id, req.userId, body.note);
  }
}
```

Wait — the above controller has inline admin check logic that is messy. Fix:

`packages/backend/src/recharges/recharges.controller.ts`:

```typescript
import { Controller, Post, Get, Body, Param, Req, UseGuards, UseInterceptors, HttpException } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode } from "@cvbuilder/shared";

@Controller("recharges")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class RechargesController {
  constructor(
    private readonly rechargesService: RechargesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(@Body() body: { amount: number; orderNo: string }, @Req() req: any) {
    return this.rechargesService.create(req.userId, body.amount, body.orderNo);
  }

  @Get()
  async listMine(@Req() req: any) {
    return this.rechargesService.listMine(req.userId);
  }

  @Get("pending")
  async listPending(@Req() req: any) {
    const user = await this.prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role !== "admin") {
      throw new HttpException({ code: ErrorCode.UNAUTHORIZED, message: "无权操作" }, 401);
    }
    return this.rechargesService.listPending();
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Req() req: any) {
    return this.rechargesService.approve(id, req.userId);
  }

  @Post(":id/reject")
  async reject(@Param("id") id: string, @Body() body: { note?: string }, @Req() req: any) {
    return this.rechargesService.reject(id, req.userId, body.note);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/recharges/
git commit -m "feat: add RechargesModule with CRUD and approval endpoints"
```

---

### Task 6: Wire Modules into AppModule

**Files:**
- Modify: `packages/backend/src/app.module.ts`

- [ ] **Step 1: Import new modules**

`packages/backend/src/app.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ResumesModule } from "./resumes/resumes.module";
import { JobsModule } from "./jobs/jobs.module";
import { AnalyzeModule } from "./analyze/analyze.module";
import { GenerateModule } from "./generate/generate.module";
import { ExportModule } from "./export/export.module";
import { PointsModule } from "./points/points.module";
import { RechargesModule } from "./recharges/recharges.module";

@Module({
  imports: [
    PrismaModule, AuthModule, ResumesModule, JobsModule,
    AnalyzeModule, GenerateModule, ExportModule,
    PointsModule, RechargesModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/app.module.ts
git commit -m "feat: wire PointsModule and RechargesModule into AppModule"
```

---

### Task 7: Update AnalyzeModule and AnalyzeService

**Files:**
- Modify: `packages/backend/src/analyze/analyze.module.ts`
- Modify: `packages/backend/src/analyze/analyze.service.ts`

- [ ] **Step 1: Import PointsModule in AnalyzeModule**

`packages/backend/src/analyze/analyze.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { AnalyzeController } from "./analyze.controller";
import { AnalyzeService } from "./analyze.service";
import { PointsModule } from "../points/points.module";

@Module({
  imports: [PointsModule],
  controllers: [AnalyzeController],
  providers: [AnalyzeService],
})
export class AnalyzeModule {}
```

- [ ] **Step 2: Replace freeAnalysisCount with PointsService in AnalyzeService**

Read `packages/backend/src/analyze/analyze.service.ts`. Replace the analyze method's quota check section.

Current code (lines ~73-81):
```typescript
    // Admin users bypass quota
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      const updated = await this.prisma.resume.updateMany({
        where: { id: body.resumeId, freeAnalysisCount: { gt: 0 } },
        data: { freeAnalysisCount: { decrement: 1 } },
      });
      if (updated.count === 0) {
        throw new HttpException({ code: ErrorCode.QUOTA_EXCEEDED, message: "免费次数已用完" }, 403);
      }
    }
```

Replace with:
```typescript
    // Admin users bypass quota
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      await this.points.deduct(userId, 30, "AI分析", body.resumeId);
    }
```

Also update the error handler (lines ~109-112). Current:
```typescript
    } catch (err) {
      if (!isAdmin) {
        await this.prisma.resume.update({ where: { id: body.resumeId }, data: { freeAnalysisCount: { increment: 1 } } });
      }
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "AI服务暂时不可用，请稍后重试" }, 503);
    }
```

Replace with:
```typescript
    } catch (err) {
      if (!isAdmin) {
        await this.points.refund(userId, 30, "AI分析失败退还", body.resumeId);
      }
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "AI服务暂时不可用，请稍后重试" }, 503);
    }
```

Add `PointsService` to constructor:
```typescript
import { PointsService } from "../points/points.service";

// In constructor:
constructor(
  private prisma: PrismaService,
  private points: PointsService,
) {}
```

Also remove `freeAnalysisCount` from the response — the idempotency return and the success return should no longer include `remainingFreeCount`. Remove that field from both return objects.

Update `packages/shared/types/analysis.ts`: change `remainingFreeCount: number;` to `remainingFreeCount?: number;`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/analyze/
git commit -m "feat: replace freeAnalysisCount with PointsService in AnalyzeService"
```

---

### Task 8: Update GenerateModule and GenerateService

**Files:**
- Modify: `packages/backend/src/generate/generate.module.ts`
- Modify: `packages/backend/src/generate/generate.service.ts`

- [ ] **Step 1: Import PointsModule in GenerateModule**

`packages/backend/src/generate/generate.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";
import { PointsModule } from "../points/points.module";

@Module({
  imports: [PointsModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
```

- [ ] **Step 2: Add points deduction to GenerateService**

Add import and constructor injection:
```typescript
import { PointsService } from "../points/points.service";

// In constructor:
constructor(
  private prisma: PrismaService,
  private points: PointsService,
) {}
```

In the `generate` method, after the analysis record validation (after line ~59), add:
```typescript
    // Admin users bypass quota
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== "admin") {
      await this.points.deduct(userId, 50, "生成简历", body.resumeId);
    }
```

In the catch block, add refund logic:
```typescript
    } catch (err) {
      if (user.role !== "admin") {
        await this.points.refund(userId, 50, "生成失败退还", body.resumeId).catch(() => {});
      }
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "AI服务暂时不可用，请稍后重试" }, 503);
    }
```

But wait — `user` is defined after the catch block's scope. To handle this, define `isAdmin` before the try block:
```typescript
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      await this.points.deduct(userId, 50, "生成简历", body.resumeId);
    }

    try {
      // ... existing generate logic
    } catch {
      if (!isAdmin) {
        await this.points.refund(userId, 50, "生成失败退还", body.resumeId).catch(() => {});
      }
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "AI服务暂时不可用，请稍后重试" }, 503);
    }
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/generate/
git commit -m "feat: add PointsService deduction to GenerateService"
```

---

### Task 9: Update AuthService — Register Gift & Me Returns

**Files:**
- Modify: `packages/backend/src/auth/auth.service.ts`

- [ ] **Step 1: Register gives 30 points and writes a transaction**

In the `register` method, change the `prisma.user.create` data:
```typescript
    const user = await this.prisma.user.create({
      data: { phone, passwordHash: bcrypt.hashSync(password, 10), points: 30 },
    });
```

After user creation, add the initial transaction:
```typescript
    await this.prisma.pointTransaction.create({
      data: { userId: user.id, type: "credit", amount: 30, balance: 30, description: "新用户赠送" },
    });
```

- [ ] **Step 2: getMe returns points and role**

In the `getMe` method, change the return:
```typescript
    return {
      id: user.id,
      phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
      points: user.points,
      role: user.role,
    };
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/auth/auth.service.ts
git commit -m "feat: register gives 30 points, getMe returns points and role"
```

---

### Task 10: Frontend — PointsBalance Component

**Files:**
- Create: `packages/frontend/components/PointsBalance.tsx`

- [ ] **Step 1: Create PointsBalance component**

`packages/frontend/components/PointsBalance.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/auth";

const API = "http://localhost:3001";

export default function PointsBalance({ onOpenModal }: { onOpenModal: () => void }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    apiFetch(`${API}/points/balance`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setBalance(j.data.balance);
      })
      .catch(() => {});
  }, []);

  if (balance === null) return null;

  return (
    <div className="mt-3 p-3 bg-surface-tertiary rounded-md">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">我的积分</span>
        <a href="/recharge" className="text-xs text-accent hover:underline">
          充值
        </a>
      </div>
      <div className="font-[family-name:var(--font-display)] text-xl font-bold text-accent">
        {balance}
      </div>
      <div className="text-[10px] text-text-muted">
        ≈ {Math.round(balance / 10 * 100) / 100} 元
      </div>
      <button
        onClick={onOpenModal}
        className="mt-2 text-xs text-text-muted hover:text-text-secondary w-full text-left"
      >
        积分明细 →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/components/PointsBalance.tsx
git commit -m "feat: add PointsBalance sidebar component"
```

---

### Task 11: Frontend — PointsModal Component

**Files:**
- Create: `packages/frontend/components/PointsModal.tsx`

- [ ] **Step 1: Create PointsModal component**

`packages/frontend/components/PointsModal.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { PointTransactionItem } from "@cvbuilder/shared";
import { apiFetch } from "../lib/auth";

const API = "http://localhost:3001";

const TYPE_LABELS: Record<string, string> = {
  credit: "充值",
  debit: "消费",
  refund: "退还",
};

const TYPE_COLORS: Record<string, string> = {
  credit: "text-green-600",
  debit: "text-text-secondary",
  refund: "text-amber-600",
};

export default function PointsModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<PointTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API}/points/transactions`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setItems(j.data.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">积分明细</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-lg leading-none">
            ×
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-tertiary rounded animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">暂无积分记录</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-border-light last:border-0">
                <div>
                  <div className="text-sm">{item.description}</div>
                  <div className="text-xs text-text-muted">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${TYPE_COLORS[item.type] || "text-text-secondary"}`}>
                    {item.type === "debit" ? "-" : "+"}{item.amount}
                  </div>
                  <div className="text-xs text-text-muted">余额 {item.balance}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/components/PointsModal.tsx
git commit -m "feat: add PointsModal for transaction history"
```

---

### Task 12: Frontend — Recharge Page

**Files:**
- Create: `packages/frontend/app/recharge/page.tsx`

- [ ] **Step 1: Create recharge page**

`packages/frontend/app/recharge/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/auth";

const API = "http://localhost:3001";

export default function RechargePage() {
  const [amount, setAmount] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit() {
    setError("");
    setSuccess("");
    if (!amount || parseInt(amount) < 1) {
      setError("请输入有效的充值金额");
      return;
    }
    if (!orderNo.trim()) {
      setError("请填写微信转账单号");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/recharges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseInt(amount), orderNo: orderNo.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "提交失败");
        return;
      }
      setSuccess(`充值申请已提交，等待管理员审核。到账 ${amount} 元 × 10 = ${parseInt(amount) * 10} 积分`);
      setAmount("");
      setOrderNo("");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/dashboard" className="text-text-muted hover:text-text-secondary text-sm">← 返回</a>
        <h2 className="text-xl font-semibold">积分充值</h2>
      </div>

      <div className="flex gap-8 flex-col md:flex-row">
        <div className="flex-1 md:max-w-[280px]">
          <div className="bg-surface border border-border-light rounded-md p-6 text-center">
            <div className="w-40 h-40 bg-surface-tertiary rounded mx-auto mb-4 flex items-center justify-center">
              <span className="text-text-muted text-sm">微信收款码</span>
            </div>
            <p className="text-sm text-text-secondary">
              微信扫码转账后，填写下方信息提交审核
            </p>
            <p className="text-xs text-text-muted mt-1">10积分 = 1元</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-surface border border-border-light rounded-md p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">充值金额（元）</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="输入充值金额"
                  className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none"
                />
                {amount && parseInt(amount) >= 1 && (
                  <p className="text-xs text-text-muted mt-1">
                    到账积分：{parseInt(amount) * 10}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">微信转账单号</label>
                <input
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="从微信支付记录复制转账单号"
                  className="w-full px-3 py-2 border border-border rounded text-sm focus:border-accent focus:ring-2 focus:ring-accent/15 outline-none"
                />
              </div>

              {error && <div className="text-sm text-error p-3 bg-red-50 rounded">{error}</div>}
              {success && <div className="text-sm text-green-700 p-3 bg-green-50 rounded">{success}</div>}

              <button
                onClick={submit}
                disabled={loading || !amount || !orderNo}
                className="w-full py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors"
              >
                {loading ? "提交中..." : "提交审核"}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <a href="/recharge/history" className="text-sm text-accent hover:underline">
              查看充值记录 →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/app/recharge/
git commit -m "feat: add recharge page with QR code and order form"
```

---

### Task 13: Frontend — Recharge History Page

**Files:**
- Create: `packages/frontend/app/recharge/history/page.tsx`

- [ ] **Step 1: Create recharge history page**

`packages/frontend/app/recharge/history/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { RechargeItem } from "@cvbuilder/shared";
import { apiFetch } from "../../../lib/auth";

const API = "http://localhost:3001";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "待审核", className: "bg-amber-50 text-amber-700" },
  approved: { label: "已通过", className: "bg-green-50 text-green-700" },
  rejected: { label: "已驳回", className: "bg-red-50 text-red-600" },
};

export default function RechargeHistoryPage() {
  const [items, setItems] = useState<RechargeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API}/recharges`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setItems(j.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/recharge" className="text-text-muted hover:text-text-secondary text-sm">← 返回</a>
        <h2 className="text-xl font-semibold">充值记录</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-tertiary rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-20">💰</div>
          <h3 className="text-lg font-semibold mb-2">暂无充值记录</h3>
          <p className="text-sm text-text-secondary mb-6">还没有提交过充值申请</p>
          <a href="/recharge" className="inline-block px-5 py-2.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors">
            去充值
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="p-4 bg-surface border border-border-light rounded-md flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">{item.amount} 元 → {item.points} 积分</div>
                <div className="text-xs text-text-muted mt-1">
                  单号：<span className="font-mono">{item.orderNo}</span>
                  {" · "}
                  {new Date(item.createdAt).toLocaleString("zh-CN")}
                </div>
                {item.adminNote && (
                  <div className="text-xs text-text-muted mt-1">备注：{item.adminNote}</div>
                )}
              </div>
              <div className={`text-xs px-2 py-1 rounded ${STATUS_MAP[item.status]?.className || ""}`}>
                {STATUS_MAP[item.status]?.label || item.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/app/recharge/history/
git commit -m "feat: add recharge history page"
```

---

### Task 14: Frontend — RechargeApproval Component (Admin)

**Files:**
- Create: `packages/frontend/components/RechargeApproval.tsx`

- [ ] **Step 1: Create RechargeApproval component**

`packages/frontend/components/RechargeApproval.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { PendingRecharge } from "@cvbuilder/shared";
import { apiFetch } from "../lib/auth";

const API = "http://localhost:3001";

export default function RechargeApproval() {
  const [items, setItems] = useState<PendingRecharge[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPending() {
    try {
      const res = await apiFetch(`${API}/recharges/pending`);
      const json = await res.json();
      if (json.success) setItems(json.data ?? []);
    } catch {}
  }

  useEffect(() => {
    fetchPending().finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string) {
    await apiFetch(`${API}/recharges/${id}/approve`, { method: "POST" });
    await fetchPending();
  }

  async function handleReject(id: string) {
    const note = prompt("驳回原因（可选）：");
    await apiFetch(`${API}/recharges/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || undefined }),
    });
    await fetchPending();
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-surface border border-accent/20 rounded-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">待审批充值</h3>
        <span className="text-xs px-2 py-0.5 bg-accent text-white rounded-full">
          {items.length} 笔
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center py-2 border-b border-border-light last:border-0">
            <div>
              <div className="text-sm">
                <span className="text-text-muted text-xs">{item.userPhone}</span>
                {" · "}
                {item.amount} 元 → {item.points} 积分
              </div>
              <div className="text-xs text-text-muted font-mono">{item.orderNo}</div>
              <div className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(item.id)}
                className="px-3 py-1 text-xs text-white bg-accent rounded hover:bg-accent-hover"
              >
                通过
              </button>
              <button
                onClick={() => handleReject(item.id)}
                className="px-3 py-1 text-xs text-text-muted border border-border rounded hover:text-error"
              >
                驳回
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/components/RechargeApproval.tsx
git commit -m "feat: add RechargeApproval admin component"
```

---

### Task 15: Frontend — InsufficientPoints Component

**Files:**
- Create: `packages/frontend/components/InsufficientPoints.tsx`

- [ ] **Step 1: Create InsufficientPoints component**

`packages/frontend/components/InsufficientPoints.tsx`:

```typescript
"use client";

interface Props {
  needed: number;
  current: number;
  onClose: () => void;
}

export default function InsufficientPoints({ needed, current, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface rounded-lg p-6 w-full max-w-sm shadow-xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl mb-4">💡</div>
        <h3 className="text-lg font-semibold mb-2">积分不足</h3>
        <p className="text-sm text-text-secondary mb-4">
          需要 <strong className="text-accent">{needed}</strong> 积分，
          当前余额 <strong>{current}</strong> 积分
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded text-sm text-text-secondary hover:bg-surface-tertiary"
          >
            取消
          </button>
          <a
            href="/recharge"
            className="px-4 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover"
          >
            去充值 · 10积分/元
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/components/InsufficientPoints.tsx
git commit -m "feat: add InsufficientPoints modal"
```

---

### Task 16: Update Layout — Sidebar Points & Recharge Nav

**Files:**
- Modify: `packages/frontend/app/layout.tsx`

- [ ] **Step 1: Add PointsBalance and PointsModal to layout**

Add imports:
```typescript
import PointsBalance from "../components/PointsBalance";
import PointsModal from "../components/PointsModal";
```

Add state for PointsModal:
```typescript
const [showPoints, setShowPoints] = useState(false);
```

Add `<PointsBalance onOpenModal={() => setShowPoints(true)} />` inside the sidebar, after the nav and before the user section.

Add `{showPoints && <PointsModal onClose={() => setShowPoints(false)} />}` after the AuthModal.

Full sidebar bottom section (after nav, replacing existing):
```tsx
            <nav className="flex flex-col gap-1 flex-1">
              <a href="/dashboard" className="px-3 py-2 rounded text-sm text-accent bg-surface-tertiary font-medium">仪表盘</a>
              <a href="/upload" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">上传简历</a>
              <a href="/jobs" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">我的 JD</a>
              <a href="/recharge" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">充值</a>
            </nav>
            <PointsBalance onOpenModal={() => setShowPoints(true)} />
```

And at the bottom of the component (before `</html>`), add:
```tsx
        {showPoints && <PointsModal onClose={() => setShowPoints(false)} />}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/app/layout.tsx
git commit -m "feat: add points balance and recharge nav to sidebar"
```

---

### Task 17: Update Dashboard — Points & Admin Approvals

**Files:**
- Modify: `packages/frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Replace freeAnalysisCount text, add RechargeApproval**

Add import:
```typescript
import RechargeApproval from "../../components/RechargeApproval";
```

Remove `freeAnalysisCount` from the resume item display text. Change line 86 from:
```tsx
                  上传于 {new Date(r.createdAt).toLocaleDateString("zh-CN")} · {r.parseStatus === "parsed" ? "解析完成" : r.parseStatus === "parsing" ? "解析中..." : "解析失败"}{r.parseStatus === "parsed" && r.analysisCount > 0 && ` · 已分析 ${r.analysisCount} 次`}{r.parseStatus === "parsed" && ` · 剩余 ${r.freeAnalysisCount} 次`}
```
To:
```tsx
                  上传于 {new Date(r.createdAt).toLocaleDateString("zh-CN")} · {r.parseStatus === "parsed" ? "解析完成" : r.parseStatus === "parsing" ? "解析中..." : "解析失败"}{r.parseStatus === "parsed" && r.analysisCount > 0 && ` · 已分析 ${r.analysisCount} 次`}
```

Add `<RechargeApproval />` as the first element in the return JSX (after the if blocks, before the main div).

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/app/dashboard/page.tsx
git commit -m "feat: update dashboard with admin approvals and remove freeCount"
```

---

### Task 18: Update Analyze Page — Points Cost & Insufficient Handling

**Files:**
- Modify: `packages/frontend/app/analyze/[resumeId]/page.tsx`

- [ ] **Step 1: Replace free text with points cost, add InsufficientPoints modal**

Add imports:
```typescript
import InsufficientPoints from "../../../components/InsufficientPoints";
```

Add state:
```typescript
const [showInsufficient, setShowInsufficient] = useState(false);
const [pointsNeeded, setPointsNeeded] = useState(0);
const [currentBalance, setCurrentBalance] = useState(0);
```

Update the `startAnalyze` function error handling to catch QUOTA_EXCEEDED:
```typescript
      if (!json.success) {
        if (json.error?.code === "QUOTA_EXCEEDED") {
          setPointsNeeded(30);
          setCurrentBalance(0); // Will be filled from error message if available
          setShowInsufficient(true);
          return;
        }
        setError(json.error?.message ?? "分析失败");
        return;
      }
```

For the `startGenerate` function, add similar handling — point cost is 50.

Change the button text:
- Line 273: `{analyzing ? "分析中..." : "免费分析"}` → `{analyzing ? "分析中..." : "AI分析 · 消耗 30 积分"}`  
- The generate button text: `"✨ 生成优化简历"` → `"✨ 生成优化简历 · 消耗 50 积分"`

Remove or change:
- Lines 275-277: The `freeAnalysisCount` display → show point cost note instead: `<p className="text-xs text-text-muted mt-2">消耗 30 积分</p>`

Add `{showInsufficient && <InsufficientPoints needed={pointsNeeded} current={currentBalance} onClose={() => setShowInsufficient(false)} />}` at the end of the JSX (before the closing `</div>`).

Also update the generate error handler similarly for QUOTA_EXCEEDED (needed: 50).

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/app/analyze/\[resumeId\]/page.tsx
git commit -m "feat: update analyze page with points cost and insufficient handling"
```

---

### Task 19: Update AuthModal — Register Gift Notice

**Files:**
- Modify: `packages/frontend/components/AuthModal.tsx`

- [ ] **Step 1: Add success message after register**

After `setToken(json.data.token)`, add a toast-like notification. Add state:
```typescript
const [giftNotice, setGiftNotice] = useState("");
```

Then after successful register:
```typescript
setGiftNotice("注册成功！已赠送 30 积分，快去试试 AI 分析吧 🎉");
setTimeout(() => setGiftNotice(""), 4000);
```

And after successful login, clear any gift notice.

Add the notice display at the top of the modal content (inside the white card, above the tab buttons):
```tsx
{giftNotice && (
  <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded">
    {giftNotice}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/components/AuthModal.tsx
git commit -m "feat: show 30-point gift notice on register"
```

---

### Task 20: Update apiFetch — Global QUOTA_EXCEEDED Handling

**Files:**
- Modify: `packages/frontend/lib/auth.ts`

No change needed here. The QUOTA_EXCEEDED handling will be done per-page because the InsufficientPoints modal needs context (points needed vs current). The analyze page already handles this in Task 18.

Instead, this task is to ensure the Shared types are properly exported.

- [ ] **Step 1: Verify shared index exports**

Read `packages/shared/types/index.ts` and verify:
```typescript
export * from "./api";
export * from "./resume";
export * from "./jobs";
export * from "./analyze";
export * from "./generate";
export * from "./points";  // <-- ensure this line exists
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/types/index.ts
git commit -m "chore: ensure points types are exported from shared"
```

---

### Task 21: End-to-End Smoke Test

- [ ] **Step 1: Verify backend compiles**

```bash
cd packages/backend && npx tsc --noEmit 2>&1
```

Expected: No type errors.

- [ ] **Step 2: Verify frontend compiles**

```bash
cd packages/frontend && npx next build 2>&1 | tail -5
```

Expected: Build completes without errors.

- [ ] **Step 3: Test the flows manually**

1. Register a new user → verify points = 30 in DB
2. Login → verify sidebar shows balance
3. Go to `/recharge` → verify page renders
4. Submit recharge → check DB for pending record
5. Login as admin → verify approval bar shows in dashboard
6. Approve recharge → verify user balance increased
7. Upload a resume + analyze → verify 30 points deducted
8. Generate resume → verify 50 points deducted
9. Try with 0 points → verify insufficient modal appears

---

*Plan version: v1.0 — 2026-05-10*
