# 积分充值系统 — 设计文档

> **项目：** ResumeMatcher
> **版本：** v1.1 MVP
> **日期：** 2026-05-10
> **状态：** 待实现

---

## 一、概述

### 1.1 目标

用积分制替代当前的免费次数限制，接入微信支付（手动转账模式），为简历分析和生成功能建立付费体系。

### 1.2 定价

| 操作 | 积分 | 折合金额 |
|------|------|----------|
| 上传简历 | 免费 | 0 元 |
| AI 分析 | 30 积分 | 3 元 |
| AI 生成简历 | 50 积分 | 5 元 |
| PDF 导出 | 免费 | 0 元 |

> 兑换比例：10 积分 = 1 元

### 1.3 新人体验

新用户注册赠送 30 积分（够 1 次分析），体验后再付费。

### 1.4 支付方式

微信支付（手动模式）：用户扫码转账 → 填写转账单号 → 管理员核对微信商户后台 → 审批通过/驳回 → 积分到账。

---

## 二、数据库设计

### 2.1 User 模型变更

```prisma
model User {
  // ... existing fields ...
  role         String   @default("user")
  points       Int      @default(30)      // 新增
}
```

### 2.2 RechargeRecord（充值记录）

```prisma
model RechargeRecord {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  amount        Int                         // 充值金额（元）
  points        Int                         // 对应积分
  orderNo       String                      // 微信转账单号
  status        String   @default("pending") // pending / approved / rejected
  adminNote     String?                     // 管理员备注（驳回原因等）
  adminId       String?                     // 审批管理员 ID
  createdAt     DateTime @default(now())
  approvedAt    DateTime?

  @@index([userId])
  @@index([status])
}
```

### 2.3 PointTransaction（积分流水）

```prisma
model PointTransaction {
  id          String   @id @default(uuid())
  userId      String
  type        String                      // credit / debit / refund
  amount      Int                         // 变动量
  balance     Int                         // 变动后余额
  description String                      // 描述
  referenceId String?                     // 关联业务 ID
  createdAt   DateTime @default(now())

  @@index([userId])
}
```

### 2.4 Resume 模型

`freeAnalysisCount` 字段保留但不再使用，后续可删除。

---

## 三、后端模块

### 3.1 PointsModule

**PointsService**（`packages/backend/src/points/points.service.ts`）：

| 方法 | 说明 |
|------|------|
| `deduct(userId, amount, description, referenceId)` | 原子扣积分，不足抛 QUOTA_EXCEEDED |
| `refund(userId, amount, description, referenceId)` | 退还积分（AI 失败时调用） |
| `getBalance(userId)` | 查询余额 |
| `getTransactions(userId, page)` | 积分流水分页 |

**PointsController**：

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/points/balance` | user | 返回 `{ balance, transactions }` |
| GET | `/points/transactions` | user | 分页积分流水 |

### 3.2 RechargesModule

**RechargeService**（`packages/backend/src/recharges/recharges.service.ts`）：

| 方法 | 说明 |
|------|------|
| `create(userId, amount, orderNo)` | 提交充值申请 |
| `approve(id, adminId)` | 审批通过 → 加积分 + 写 credit 流水 |
| `reject(id, adminId, note)` | 驳回 |
| `listMine(userId)` | 我的充值记录 |
| `listPending()` | 管理员待审批列表 |

**RechargesController**：

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/recharges` | user | `{ amount, orderNo }` 提交充值 |
| GET | `/recharges` | user | 我的充值记录 |
| GET | `/recharges/pending` | admin | 待审批列表 |
| POST | `/recharges/:id/approve` | admin | 通过 |
| POST | `/recharges/:id/reject` | admin | 驳回 `{ note }` |

### 3.3 AnalyzeService 改造

- 去掉 `freeAnalysisCount` 原子扣减和退款逻辑
- 改为调用 `PointsService.deduct(userId, 30, 'AI分析', analysisRecordId)`
- admin 角色跳过扣积分
- AI 失败时调用 `PointsService.refund()`

### 3.4 GenerateService 改造

- 在生成前调用 `PointsService.deduct(userId, 50, '生成简历', analysisRecordId)`
- admin 角色跳过扣积分

### 3.5 AuthService 改造

- `register` 时设置 `points: 30`（新人赠送）
- `GET /auth/me` 返回增加 `points` 和 `role` 字段

### 3.6 金额校验

- `RechargeService.create` 校验 amount ≥ 1 且为整数（元）
- 自动计算积分：points = amount * 10

---

## 四、前端改动

### 4.1 新增页面

| 路由 | 内容 |
|------|------|
| `/recharge` | 充值页，左右分栏：左收款码 + 右表单（金额、单号、提交） |
| `/recharge/history` | 充值记录列表，状态标签（待审核/已通过/已驳回） |

### 4.2 新增/改造组件

| 组件 | 位置 | 说明 |
|------|------|------|
| 积分余额卡片 | 侧边栏底部 | 显示余额 + 充值入口 + "积分明细"链接 |
| 积分明细弹窗 | 全局 | 积分流水列表，credit/debit/refund 图标 |
| 积分不足拦截 | 分析/生成触发 | 弹窗引导充值，显示所需 vs. 现有积分 |
| 管理员审批栏 | Dashboard 顶部 | 仅 admin 可见，badge 显示待处理数 |
| AuthModal | 登录注册 | 注册成功提示"赠送 30 积分" |

### 4.3 改造现有页面

| 页面 | 改动 |
|------|------|
| `dashboard` | 去掉 freeAnalysisCount 展示，顶部改为积分余额 |
| `analyze/[resumeId]` | 分析按钮显示"消耗 30 积分"，余额不足弹拦截 |
| `generate` | 生成按钮显示"消耗 50 积分"，生成前校验 |

### 4.4 全局 `apiFetch` 扩展

- 增加 `QUOTA_EXCEEDED` 错误码的全局处理，自动弹出积分不足引导

---

## 五、用户流程

### 5.1 充值流程

```
用户点击充值 → /recharge 页面
  → 扫码转账到微信商户
  → 填写金额 + 微信转账单号
  → 提交审核（RechargeRecord: pending）
  → 管理员在 Dashboard 看到待审批
  → 核对微信商户后台
  → 通过：points += amount*10, PointTransaction(credit), RechargeRecord(approved)
  → 驳回：RechargeRecord(rejected)
```

### 5.2 消费流程

```
用户触发分析/生成
  → PointsService.deduct 原子检查余额
  → 余额充足：扣积分 + 写 debit 流水
  → 余额不足：返回 QUOTA_EXCEEDED → 前端弹充值引导
  → AI 调用失败：PointsService.refund 退还 + 写 refund 流水
```

### 5.3 新用户注册流程

```
注册成功 → user.points = 30
  → 写 PointTransaction(credit, 30, "新用户赠送")
  → 前端提示"已赠送 30 积分，免费体验 1 次 AI 分析"
```

---

## 六、错误处理

| 场景 | 错误码 | HTTP | 前端表现 |
|------|--------|------|----------|
| 积分不足 | QUOTA_EXCEEDED | 403 | 弹窗：显示所需 vs. 现有，引导充值 |
| 充值金额无效 | INVALID_PARAMS | 400 | 表单校验提示 |
| 单号重复 | INVALID_PARAMS | 400 | 提示"该单号已提交" |
| 非管理员审批 | UNAUTHORIZED | 401 | 无权限提示 |
| 充值记录不存在 | RESOURCE_NOT_FOUND | 404 | 提示"记录不存在" |

---

## 七、文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `prisma/schema.prisma` | 修改 | 新增 RechargeRecord、PointTransaction、User.points |
| `src/points/points.module.ts` | 新增 | 积分模块 |
| `src/points/points.service.ts` | 新增 | 扣积分/退积分/查询 |
| `src/points/points.controller.ts` | 新增 | 积分接口 |
| `src/recharges/recharges.module.ts` | 新增 | 充值模块 |
| `src/recharges/recharges.service.ts` | 新增 | 充值申请/审批 |
| `src/recharges/recharges.controller.ts` | 新增 | 充值接口 |
| `src/analyze/analyze.service.ts` | 修改 | 替换 freeAnalysisCount 为积分扣减 |
| `src/analyze/analyze.module.ts` | 修改 | 导入 PointsModule |
| `src/generate/generate.service.ts` | 修改 | 增加积分扣减 |
| `src/generate/generate.module.ts` | 修改 | 导入 PointsModule |
| `src/auth/auth.service.ts` | 修改 | 注册送 30 积分、me 接口返回 points/role |
| `src/auth/auth.controller.ts` | 修改 | me 接口返回扩展 |
| `app/recharge/page.tsx` | 新增 | 充值页面 |
| `app/recharge/history/page.tsx` | 新增 | 充值记录页 |
| `components/PointsBalance.tsx` | 新增 | 积分余额卡片 |
| `components/PointsModal.tsx` | 新增 | 积分明细弹窗 |
| `components/RechargeApproval.tsx` | 新增 | 管理员审批组件 |
| `components/InsufficientPoints.tsx` | 新增 | 积分不足拦截弹窗 |
| `app/dashboard/page.tsx` | 修改 | 替换 freeCount 为积分展示 |
| `app/analyze/[resumeId]/page.tsx` | 修改 | 积分消耗提示 + 不足拦截 |
| `components/AuthModal.tsx` | 修改 | 注册提示送积分 |
| `lib/auth.ts` | 修改 | apiFetch QUOTA_EXCEEDED 处理 |
| `src/resumes/resumes.service.ts` | 修改 | 可移除 freeAnalysisCount 返回 |

---

*文档版本：v1.0 — 2026-05-10*
