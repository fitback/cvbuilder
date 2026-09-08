# 编辑与导出体验优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为原始简历和 AI 生成简历增加可靠的自动版本历史、安全恢复和可预期的导出预览。

**Architecture:** 为 `Resume` 和 `GeneratedResume` 分别建立快照表，保存当前内容和创建快照在 Prisma 事务内完成。两种编辑器继续各自渲染内容，只统一保存节流、版本 API 和导出交互。

**Tech Stack:** Next.js 15、React 19、NestJS 11、Prisma 6、PostgreSQL 16、Tailwind CSS v4、TypeScript。

## Global Constraints

- 全部开发、迁移、构建、测试和浏览器验收必须先在本地完成；通过前不提交、不推送、不部署。
- 前端生产构建必须使用非 VS Code 沙箱 shell，避免已确认的 `spawn EPERM`。
- 每份简历最多保留 20 个版本，超出后删除最旧版本。
- 所有版本操作必须验证资源归属；不属于当前用户时返回 `RESOURCE_NOT_FOUND`。
- 仅保留浅色模式，不新增 UI 或状态管理依赖。

---

### Task 1: 建立版本数据模型与共享类型

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`
- Create: `packages/shared/types/resume-version.ts`
- Create: `packages/shared/types/generated-resume-version.ts`
- Modify: `packages/shared/index.ts`

**Interfaces:**
- 新增 `VersionSource = "auto" | "manual" | "before_restore"`。
- `ResumeVersion` 保存 `parseResult`、`rawText`；`GeneratedResumeVersion` 保存 `name`、`content`。
- 两个模型具有父资源外键、`label?`、`source`、`createdAt`，并对父 id 建索引，父资源删除时级联删除。

- [ ] 在 `Resume` 与 `GeneratedResume` 添加版本关系字段，并添加上述两个 Prisma model。
- [ ] 在 shared 中导出列表、详情和 `{ label?: string }` 创建请求类型；列表仅含 id、label、source、createdAt，详情含完整快照内容。
- [ ] 执行 Prisma client generation、schema validate 和 shared build。

```bash
cd /Users/billchen/projects/cvbuilder
set -a && source packages/backend/.env && set +a
npm run db:generate -w packages/backend
npx prisma validate --schema=packages/backend/prisma/schema.prisma
npm run build -w packages/shared
```

Expected: Prisma 与 shared 均无错误。

### Task 2: 原始简历的事务快照与恢复接口

**Files:**
- Modify: `packages/backend/src/resumes/resumes.service.ts`
- Modify: `packages/backend/src/resumes/resumes.controller.ts`
- Create: `packages/backend/src/resumes/resumes.service.spec.ts`

**Interfaces:**
- `listVersions(id, userId)`、`getVersion(id, versionId, userId)`、`createVersion(id, userId, label)`、`restoreVersion(id, versionId, userId)`。
- `update()` 在内容实际变化时创建 `auto` 快照。

- [ ] 建立 service 测试基座，mock `PrismaService.$transaction`、`resume` 和 `resumeVersion` delegate。
- [ ] 写失败测试：内容变更仅创建一个自动快照；第 21 条后只删除最旧记录；跨用户读取版本抛 404；恢复前写入 `before_restore`。
- [ ] 实现私有快照 helper：在 transaction 内写快照、按 `createdAt desc` 保留前 20 条、删除超额 id。
- [ ] 在 `PUT /resumes/:id` 内，先更新内容，再写 `auto` 快照；未改变的字段不得写版本。
- [ ] 在静态 `:id` 路由之前添加：

```text
GET  /resumes/:id/versions
POST /resumes/:id/versions
GET  /resumes/:id/versions/:versionId
POST /resumes/:id/versions/:versionId/restore
```

- [ ] 恢复接口在同一 transaction 中依次创建 `before_restore`、覆盖当前内容、创建新的 `auto` 快照，并返回更新后的简历详情。
- [ ] 运行 service 测试和后端 build。

### Task 3: 生成简历的事务快照与恢复接口

**Files:**
- Modify: `packages/backend/src/generated-resumes/generated-resumes.service.ts`
- Modify: `packages/backend/src/generated-resumes/generated-resumes.controller.ts`
- Create: `packages/backend/src/generated-resumes/generated-resumes.service.spec.ts`

**Interfaces:**
- 使用和 Task 2 一致的四个版本操作，快照内容为 `name` 与 `content`。

- [ ] 为 changed/unchanged update、20 条上限、所有权隔离、恢复前保护快照编写测试。
- [ ] 在现有 duplicate name 校验通过后，以 transaction 更新生成简历并创建 `auto` 快照。
- [ ] 以同样路由形状实现 `generated-resumes/:id/versions` 的 list/create/detail/restore。
- [ ] 运行生成简历 service 测试、shared build 和 backend build。

### Task 4: 添加可访问的版本历史面板

**Files:**
- Create: `packages/frontend/components/VersionHistoryModal.tsx`
- Modify: `packages/frontend/components/icons.tsx`

**Interfaces:**
- Props: `resourceLabel`、`versions`、`loading`、`onCreate(label)`、`onPreview(id)`、`onRestore(id)`、`onClose`。
- 父页面负责 API 调用和完整内容预览；组件负责时间线、命名输入和操作呈现。

- [ ] 列表按时间倒序显示来源、可选标签与本地化时间。
- [ ] 包含“保存当前版本”、每项“预览”和“恢复此版本”；全部操作具有文字或 `aria-label`。
- [ ] 使用 `useModalA11y`，保存、恢复请求进行时禁止遮罩与 Escape 误关闭。
- [ ] 仅在现有图标集缺少时补 `History` 和 `RotateCcw` 图标。
- [ ] 运行 `npx tsc -p packages/frontend/tsconfig.json --noEmit`。

### Task 5: 两类编辑器接入版本与 2 秒自动保存

**Files:**
- Modify: `packages/frontend/app/resumes/[id]/page.tsx`
- Modify: `packages/frontend/app/generated/[id]/page.tsx`

**Interfaces:**
- 两页分别调用自身 `/versions` API，复用 `VersionHistoryModal`。
- 仅用户停止输入约 2 秒后保存；内容未变时不请求。

- [ ] 原始简历：保留已有 JSON snapshot 去抖逻辑，补版本面板、历史预览、确认恢复和恢复成功后的表单重置。
- [ ] 生成简历：移除 30 秒 `setInterval`，以 `{ name, content }` 序列化快照替换；连续输入清理旧 timer，卸载时清理 timer。
- [ ] 手动保存始终即时执行；自动保存成功后更新最后保存快照与现有 `save-status` 事件。
- [ ] 未保存内容下，打开旧版本预览或确认恢复前需要二次确认；只有恢复成功才覆盖编辑状态。
- [ ] 桌面把“版本”作为次级操作；移动端将“版本记录”加入现有更多菜单，主保存按钮保持可见。
- [ ] 执行 TypeScript 检查和非沙箱 frontend build。

### Task 6: 统一导出预览与错误恢复

**Files:**
- Create: `packages/frontend/components/ExportPreviewModal.tsx`
- Modify: `packages/frontend/app/resumes/[id]/page.tsx`
- Modify: `packages/frontend/app/generated/[id]/page.tsx`

**Interfaces:**
- Props: `html`、`fileName`、`isEmpty`、`warnings`、`exporting`、`onExport(format)`、`onClose`。

- [ ] 添加纯函数检查：空内容、生成简历缺少一级标题、正文过短和正文过长；仅空内容阻止导出。
- [ ] 模态框显示可滚动 A4 预览、检查结果、PDF/DOCX 选择和单一导出命令。
- [ ] 保留现有 `/export/pdf` 和 `/export/docx`；传入当前未手动保存的内容，文件名取当前名称，缺省为 `resume`。
- [ ] 失败时保留编辑内容、格式选择和 modal，并提供可点击重试；请求中阻止关闭。
- [ ] 执行 TypeScript 检查和非沙箱 frontend build。

### Task 7: 本地端到端验收与发布门禁

**Files:**
- Modify: `PROGRESS.md`（仅记录实际验证结果）

- [ ] 启动本地 PostgreSQL 与 Redis，生成 Prisma client 并执行版本表迁移。

```bash
cd /Users/billchen/projects/cvbuilder
docker compose up -d
set -a && source packages/backend/.env && set +a
npx prisma migrate dev --schema=packages/backend/prisma/schema.prisma --name add_resume_versions
```

- [ ] 启动前端、后端与 worker；对两类编辑器验证连续输入、2 秒自动保存、刷新后内容、命名快照、历史预览、恢复、恢复前保护快照与 20 条淘汰。
- [ ] 对两类编辑器验证 PDF、DOCX、未手动保存内容、空内容拦截和导出失败重试。
- [ ] 在 390px、768px、1440px 视口验证没有溢出、文本重叠或缺失操作；用 Tab/Escape 验证 focus 与 modal 行为。
- [ ] 最后按顺序执行所有构建：

```bash
cd /Users/billchen/projects/cvbuilder
npm run build -w packages/shared
npm run build -w packages/backend
cd packages/frontend && rm -rf .next && npx next build
```

Expected: 三个构建通过。记录命令结果与浏览器验收结果到 `PROGRESS.md` 后，才可由用户决定是否提交、推送和部署。