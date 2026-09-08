# TODOS.md — 优化路线图

> 最后更新：2026-09-08
> 基线版本：本地 HEAD `c125452`（领先 origin/main 42 commit + editor/export 半成品未提交）

## 优先级总览

| 优先级 | 主题 | 状态 |
|---|---|---|
| P0 | 完成 editor/export experience 半成品 | ✅ 完成 |
| P1 | 测试覆盖（支付回调 / 积分扣减 / 缓存 / Throttler） | ✅ 完成（35 tests） |
| P1 | 整理 42 个未推送 commit + 端到端验证 | ✅ 完成（版本校准/构建验证/dead code 排查） |
| P2 | 安全加固剩余风险 | ✅ 完成（JWT 弱密钥启动校验；CORS/helmet/ValidationPipe 已确认就位；支付宝密钥/Turnstile 为 infra） |
| P2 | 可观测性（结构化日志 / 指标 / 错误聚合） | ✅ 完成（Pino JSON 日志 + requestId 串联 + /metrics Prometheus 端点 + AllExceptionsFilter 结构化错误日志） |
| P2 | 线上数据库清理（pending 充值 / 测试账号） | ✅ 完成（24h 自动过期 cron + 前端 expired 状态适配） |
| P3 | 部署流水线修复（GitHub secrets / health 路径） | 🟡 代码侧完成（health 路径确认无误；仅缺 GitHub secrets 配置） |
| P3 | 性能（代码分割 / 图片优化 / 索引审查） | ✅ 完成（optimizePackageImports + CSP 清理 + RechargeRecord 复合索引） |
| P4 | 文档同步（TECH-DESIGN / AGENTS / TODOS） | ✅ 完成 |
| **业务扩展** | **简历模板系统（4 套视觉模板）** | ✅ 完成（v0.10.0 — 4 模板 + TemplateSelector + 预览 API + 持久化） |

---

## P0 — 完成 editor/export experience 半成品

**Plan 文档：** [docs/superpowers/plans/2026-08-27-editor-export-experience.md](./docs/superpowers/plans/2026-08-27-editor-export-experience.md)
**Spec 文档：** [docs/superpowers/specs/2026-08-27-editor-export-experience-design.md](./docs/superpowers/specs/2026-08-27-editor-export-experience-design.md)

### 现状盘点

| Plan Task | 状态 | 缺口 |
|---|---|---|
| 1. 数据模型 + 共享类型 | ✅ | schema 已加 `ResumeVersion`/`GeneratedResumeVersion`；shared types 已建 |
| 2. 原始简历版本接口 | 🟡 | service 有 `listVersions`/`createVersion`/`restoreVersion`；**缺 `getVersion` 详情** |
| 3. 生成简历版本接口 | 🟡 | 同上，**缺 `getVersion` 详情** |
| 4. VersionHistoryModal | ❌ | 组件未创建 |
| 5. 编辑器接入 + 2s 自动保存 | ❌ | 前端编辑器仍是旧逻辑 |
| 6. ExportPreviewModal | ❌ | 组件未创建 |
| 7. 端到端验收 | ❌ | — |

### 执行步骤

1. 跑现有测试基线：`node --test packages/backend/test/version-snapshots.spec.ts`
2. 补 `getVersion(id, versionId, userId)` 详情接口（resumes + generated-resumes 各一个）
3. 在 controller 补 `@Get(":id/versions/:versionId")` 路由
4. 创建 [packages/frontend/components/VersionHistoryModal.tsx](./packages/frontend/components/VersionHistoryModal.tsx)
5. 创建 [packages/frontend/components/ExportPreviewModal.tsx](./packages/frontend/components/ExportPreviewModal.tsx)
6. 改 [packages/frontend/app/generated/[id]/page.tsx](./packages/frontend/app/generated/[id]/page.tsx) 移除 30s `setInterval`，改 2s 去抖自动保存
7. 改 [packages/frontend/app/resumes/[id]/page.tsx](./packages/frontend/app/resumes/[id]/page.tsx) 接入版本面板 + 历史预览 + 确认恢复
8. 生成 Prisma migration：`npx prisma migrate dev --name add_resume_versions`
9. 三包构建验证：shared / backend / frontend
10. 浏览器端到端验收（连续输入、刷新后内容、命名快照、历史预览、恢复、20 条淘汰、PDF/DOCX 导出、空内容拦截、390/768/1440 视口、Tab/Escape）

---

## P1 — 测试覆盖

PROGRESS.md 自评 🟡「冒烟脚本就绪，无单元测试」。当前只有 1 个测试文件 [packages/backend/test/version-snapshots.spec.ts](./packages/backend/test/version-snapshots.spec.ts)。

### 执行步骤

1. **支付流程** — `RechargesService` 创建订单 / 回调 / 状态查询；幂等、金额校验、重复回调处理。线上 39 笔充值只有 1 笔 approved，38 笔 pending — 强信号说明流程不稳
2. **积分扣减** — `freeAnalysisCount` 原子 decrement + `gt:0` 守卫 + AI 失败退款
3. **缓存失效** — v0.5.2 加了 `CacheService` pattern-based deletion，缓存击穿 / 穿透场景
4. **Throttler** — `UserAwareThrottlerGuard` 按 userId 限流（匿名 + 已认证两种）
5. **CI 跑测试** — 检查 [.github/workflows/ci.yml](./.github/workflows/ci.yml) 是否包含 test step，没有就加

---

## P1 — 整理未推送 commit + 端到端验证

42 个 commit 跨度 2.5 个月，包含多个 revert（Turnstile 加了又移除、Alipay precreate 切了又 revert 回 page.pay）。

### 执行步骤

1. 本地端到端跑：注册 → 上传 → 解析 → 分析 → 生成 → 编辑 → 导出 → 充值
2. 确认没有半截功能 / dead code
3. 可选 `git rebase -i origin/main` 合并 `fix(ci)` / `fix(nginx)` 重复 commit（非必需）
4. 校准 PROGRESS.md 版本号（第 2 行 v0.7.0，commit `adf8787` 引用 v0.7.1，需统一）

---

## P2 — 安全加固剩余风险

v0.5.2 / v0.6.0 已做：helmet、ValidationPipe、Throttler、BullMQ limiter。

### 执行步骤

1. **支付宝私钥** — [packages/backend/.env](./packages/backend/.env) 第 11 行完整 RSA 私钥明文存储。生产应使用阿里云 KMS 或 Docker secret
2. **登录机器人防护** — commit `524ac6a` 直接移除 Turnstile。线上登录现在只靠 nginx 限流。建议换 hCaptcha 或恢复 Turnstile
3. **JWT_SECRET** — 确认部署实际读 `.env.prod`，且值为 32 字节随机串（不是 `cvbuilder-dev-jwt-secret`）
4. **CORS** — 检查 `CORS_ORIGIN` 实际值不是通配 `*`

---

## P2 — 可观测性

当前只有 `/health` 端点 + console 日志。

### 执行步骤

1. **结构化日志** — NestJS `Logger` 改 Pino 或 Winston，输出 JSON
2. **请求追踪** — `nestjs-cls` 或 middleware 注入 `requestId`
3. **指标暴露** — `/metrics` Prometheus 端点（PG connections / redis ops / bullmq queue depth / puppeteer instances）
4. **错误聚合** — Sentry 或自建（线上 38 笔 pending 充值没人发现就是缺监控）

---

## P2 — 线上数据库清理

线上 39 笔充值只有 1 笔 approved，38 笔 pending。

### 执行步骤

1. 加定时任务：`pending` 超过 24h 自动标 `expired`，避免 RechargeRecord 表无限增长
2. 7 个用户里清理测试残留账号（可选，等正式推广前重置）

---

## P3 — 部署流水线修复

上次 deploy run（2026-06-15）失败 37s，根因 `ECS_HOST` secret 未配置。

### 执行步骤

1. GitHub repo Settings → Secrets and variables → Actions 配齐 `ECS_HOST` / `ECS_USER` / `ECS_SSH_KEY` / `ECS_PORT`
2. 推送前 `git push origin main`
3. Actions 页面手动触发 [deploy.yml](./.github/workflows/deploy.yml)
4. **修复健康检查路径不匹配** — [deploy.yml 第 66 行](./.github/workflows/deploy.yml#L66) 用 `/api/health`，但 backend 实际路由是 `/health`（无 `/api` 前缀）。要么改 deploy.yml，要么确认 nginx 有 `/api/health` → `/health` 的 rewrite

---

## P3 — 性能

v0.5.2 已加 Redis 缓存（jobs / analyze / points / resumes）。

### 执行步骤

1. **前端代码分割** — [next.config.js](./packages/frontend/next.config.js) 启用 `optimizePackageImports`
2. **图片优化** — Next.js `<Image>` 替换 `<img>`，特别是空状态 SVG 插画
3. **数据库索引审查** — `RechargeRecord` 按 `userId + status` 查询频繁，看下复合索引
4. **Puppeteer 实例池** — v0.6.0 已改单浏览器实例 + 错误恢复，并发导出会排队。如果导出是低频功能可不管

---

## P4 — 文档同步

- [TECH-DESIGN.md](./TECH-DESIGN.md) 是 7 月版本，没反映 v0.7.x 变更
- [AGENTS.md](./AGENTS.md) 没提到新加的 `ResumeVersion` / `GeneratedResumeVersion` 模型和版本 API
- [TODOS.md](./TODOS.md) 已替换为本文档

### 执行步骤

1. 在 AGENTS.md 「Key Architecture」节后追加「版本历史与导出」段落
2. TECH-DESIGN.md 补 v0.6.x / v0.7.x 安全加固 / 缓存 / 限流 / 版本系统章节
3. PROGRESS.md 在版本变更记录追加 v0.8.0（执行完 P0 后）

---

## 业务扩展 — 简历模板系统

**Spec 文档：** [docs/superpowers/specs/2026-09-08-resume-templates-design.md](./docs/superpowers/specs/2026-09-08-resume-templates-design.md)
**Plan 文档：** [docs/superpowers/plans/2026-09-08-resume-templates-plan.md](./docs/superpowers/plans/2026-09-08-resume-templates-plan.md)
**目标版本：** v0.10.0

### 4 套内置模板

| ID | 名称 | 适用 |
|---|---|---|
| `modern` | 现代简洁 | 互联网/技术岗 |
| `classic` | 经典商务 | 金融/法律/国企 |
| `compact` | 紧凑双栏 | 高级人才 |
| `creative` | 创意设计 | 设计/创意岗 |

### 执行任务（17 项）

#### 阶段 1：后端模板基础设施（Task 1-7）

- [ ] Task 1：定义 TemplateInput / ResumeTemplate 接口
- [ ] Task 2：实现 modern 模板（迁移现有 buildHtml）
- [ ] Task 3：实现 classic 模板
- [ ] Task 4：实现 compact 模板（双栏）
- [ ] Task 5：实现 creative 模板（banner + 头像位）
- [ ] Task 6：TemplatesService + Module + Controller（`GET /templates`）
- [ ] Task 7：扩展 ExportService + ExportDto 支持 templateId

#### 阶段 2：数据模型 + API（Task 8-9）

- [ ] Task 8：schema 加 `templateId` 字段 + migration
- [ ] Task 9：GeneratedResume service/controller 支持 templateId

#### 阶段 3：前端集成（Task 10-15）

- [ ] Task 10：TemplateSelector 组件
- [ ] Task 11：编辑页（generated/[id]）集成模板选择 + 持久化
- [ ] Task 12：原始简历编辑页（resumes/[id]）集成
- [ ] Task 13：ExportPreviewModal 集成模板选择
- [ ] Task 14：新增 `POST /export/preview` 接口（返回 HTML）
- [ ] Task 15：预览面板改用 iframe + preview API

#### 阶段 4：缩略图 + 验收（Task 16-17）

- [ ] Task 16：每模板 16:9 SVG 缩略图
- [ ] Task 17：端到端验收（4 模板 × 编辑/预览/导出 + fallback + 多页测试）

### 验收标准

1. `GET /templates` 返回 4 项模板列表
2. 同一 markdown 用 4 个 templateId 产出视觉明显不同的 PDF
3. 编辑页选模板后刷新页面，模板选择保持
4. 前端预览跟 PDF 输出 100% 视觉一致（同一 render 函数）
5. 不存在的 templateId fallback 到 modern + 后端 warn
6. 不传 templateId 默认 modern（向后兼容）
7. compact 模板多页 PDF 分页不错位
8. creative 模板多页 PDF banner 不重复
