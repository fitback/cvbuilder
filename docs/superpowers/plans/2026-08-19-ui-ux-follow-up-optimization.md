# UI/UX 后续渐进式优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**计划日期：** 2026-08-19
**关联版本：** v0.6.0 基础 UI 优化之后的跟进批次
**当前阶段：** P0 纠偏优化 + P1 交互优化，全部仅限本地开发和验收

**目标：** 修复页面中可能误导用户的入口和操作文案，降低分析与编辑流程的认知负荷，并补齐移动端与无障碍体验。

**架构：** 沿用现有 Next.js App Router、Tailwind CSS、NestJS API 和现有组件模式。优先修改页面行为和文案，不引入新的状态管理或 UI 依赖；自动保存、弹窗和导航等共享行为只在确认存在重复需求后抽取最小公共抽象。

**Tech Stack：** Next.js 15、React 19、Tailwind CSS v4、TypeScript、现有 Button/Toast 组件。

## 全局约束

- 所有改动先在本地完成，先通过构建和浏览器验收，再决定是否提交、推送或部署。
- 不执行 `git push`，不触发 GitHub Actions 部署，不直接修改生产环境。
- 保留现有 API 和页面路由，除非某项任务明确要求改变用户入口。
- 触控目标保持至少 44px；输入框在移动端保持 16px，避免 iOS 自动缩放。
- 遵守 `DESIGN.md` 的紧凑布局、低动效、`prefers-reduced-motion` 和焦点可见规范。
- 每完成一个任务，先运行该任务的本地验证，再继续下一项。

## 当前状态总览

| 优先级 | 范围 | 当前状态 | 说明 |
|--------|------|----------|------|
| P0 | 误导与断点 | 🟡 进行中 | 6 项中 5 项已完成，仅剩移动端底部导航需处理 |
| P1 | 认知负荷 | 🟡 进行中 | 已有基础 Sticky 分数卡、建议状态持久化和编辑分屏；其余待做 |
| P2 | 移动端与无障碍 | ⬜ 未开始 | 少量基础样式已有，但尚未完成专项验收 |
| P3 | 设计系统长期对齐 | ⬜ 未开始 | 深色模式和共享组件仍需后续独立整理 |

## P0：修复误导与断点

### Task P0.1：修正 Dashboard 统计卡片入口

**Files:**
- Modify: `packages/frontend/app/dashboard/page.tsx`

**当前问题：** “生成简历”统计卡片在已有生成简历时只跳转页面内锚点，没有直接进入生成简历列表。

**实施要求：**

- 有生成简历时跳转 `/generated`。
- 没有生成简历时跳转 `/upload`，保持新用户下一步引导。
- 卡片副文案与实际行为一致。

**验收：**

- [x] 无生成简历时点击卡片进入 `/upload`。
- [x] 有生成简历时点击卡片进入 `/generated`。
- [x] Dashboard 其他两个统计卡片行为不变。
- [x] `npm run build -w packages/frontend` 通过（存在既有深色模式 CSS 选择器警告，不影响构建）。

### Task P0.2：保留已解析简历的分析入口

**Files:**
- Modify: `packages/frontend/app/dashboard/page.tsx`

**当前状态：** 已完成。Dashboard 已使用 `parseStatus === "parsed"` 的简历生成“开始分析”入口；解析中的简历按钮保持禁用。

**验收记录：**

- [x] 解析完成的简历跳转 `/analyze/[resumeId]`。
- [x] 解析中或解析失败时不提供可点击的分析入口。

### Task P0.3：删除按钮保持可见

**Files:**
- Modify: `packages/frontend/app/dashboard/page.tsx`
- Modify: `packages/frontend/app/jobs/page.tsx`

**当前状态：** 已完成。删除操作不再依赖桌面端 hover 才显示；移动端可直接访问。

**验收记录：**

- [x] 桌面端删除按钮默认可见。
- [x] 移动端删除按钮默认可见。
- [x] 删除确认弹窗仍然保留。

### Task P0.4：统一保存相关文案

**Files:**
- Modify: `packages/frontend/app/analyze/[resumeId]/page.tsx`
- Modify: `packages/frontend/app/generated/[id]/page.tsx`

**当前状态：** 已完成。生成简历结果页使用“保存简历”，编辑页使用“保存并返回”。

**验收记录：**

- [x] 分析结果页保存按钮明确表示“保存简历”。
- [x] 生成简历编辑页明确表示保存后返回。
- [x] 不改变保存接口行为。

### Task P0.5：简化移动端底部导航

**Files:**
- Modify: `packages/frontend/app/layout.tsx`
- Potentially create: `packages/frontend/app/me/page.tsx`

**实施要求：**

- 移动端主导航最多保留 5 个入口：仪表盘、上传简历、我的 JD、充值或管理、我的。
- 深色模式、账号信息和退出登录放入“我的”入口或同等层级的账号面板。
- 管理员继续看到管理入口，普通用户继续看到充值入口。
- 桌面侧栏保持现有信息架构，除非移动端实现需要共享状态。

**验收：**

- [x] 普通用户移动端导航不超过 5 个主入口。
- [x] 管理员移动端导航不超过 5 个主入口，并保留管理入口。
- [x] 深色模式和退出登录仍可访问。
- [x] 当前路由高亮、解析 badge 和登录状态不回归。
- [ ] 在 390px 宽度下无文字重叠或横向溢出，待浏览器验收。

## P1：降低认知负荷

### Task P1.1：优化 Sticky 分数卡和生成入口

**Files:**
- Modify: `packages/frontend/app/analyze/[resumeId]/page.tsx`

**实施要求：**

- 将分数卡调整为 `sticky top-4 z-20`，避免贴住浏览器顶部并提高层级。
- 在分数卡右侧增加“生成优化简历”主按钮。
- 没有分析结果或正在生成时按钮隐藏或禁用。
- 页面底部保留辅助生成入口，避免长页面用户无法回到顶部时失去操作入口。

**验收：**

- [ ] 滚动分析结果时分数卡不被页面内容遮挡。
- [ ] 桌面端和移动端按钮不挤压分数、岗位名称或总结文字。
- [ ] 生成中、积分不足、生成完成三种状态都能正确反馈。
- [x] `npm run build -w packages/frontend` 通过（存在既有深色模式 CSS 选择器警告，不影响构建）。

### Task P1.2：优化建议卡片折叠

**Files:**
- Modify: `packages/frontend/app/analyze/[resumeId]/page.tsx`

**实施要求：**

- 默认展开前 3 条建议，其余建议默认折叠。
- 提供“展开全部 / 收起全部”控制。
- 单条建议支持独立展开和收起。
- 建议的 applied/ignored/pending 状态、复制示例和 localStorage 持久化不受影响。
- 控制按钮使用可访问名称和 `aria-expanded`。

**验收：**

- [x] 建议少于等于 3 条时全部展开。
- [x] 建议超过 3 条时仅前 3 条展开。
- [ ] 刷新页面后建议状态和折叠状态符合预期，折叠状态的浏览器验收待完成。
- [x] 忽略、应用、重置、复制示例操作仍可用。
- [x] 单条建议和“全部展开/收起”按钮提供 `aria-expanded` 或可读名称。

### Task P1.3：为原始简历编辑增加变更感知自动保存

**Files:**
- Modify: `packages/frontend/app/resumes/[id]/page.tsx`

**实施要求：**

- 记录最近一次成功保存的表单快照。
- 用户修改后延迟约 2 秒保存，连续输入时重新计时。
- 表单没有变化时不发 PUT 请求。
- 复用现有 `save-status` custom event，显示保存中、已保存、保存失败。
- 保留 Ctrl/Cmd+S 手动保存作为即时保存入口。
- 组件卸载时清理 debounce timer。

**验收：**

- [ ] 修改字段后停止输入，约 2 秒内触发一次保存，待浏览器验收。
- [x] 连续输入不会为每个字符发送请求。
- [x] 未修改时不发送自动保存请求。
- [x] 保存失败后显示失败状态，并允许再次编辑后重试。
- [x] 手动保存和页面跳转行为保留，前端构建通过。

### Task P1.4：统一编辑器顶部主次操作

**Files:**
- Modify: `packages/frontend/app/resumes/[id]/page.tsx`
- Modify: `packages/frontend/app/generated/[id]/page.tsx`

**实施要求：**

- 顶部保留一个主要动作“保存”或“保存并返回”。
- “返回”“复制”“分屏”“预览导出”等作为次级操作或更多菜单项。
- “分析依据 / 简历分析”放入正文 CTA 或次级入口，避免与保存并列争夺主视觉。
- “不保存直接离开”改为 secondary 样式，不使用 danger 样式；危险删除操作继续使用 danger。

**验收：**

- [x] 桌面端和移动端主按钮层级一致。
- [x] 保存、返回、分析依据、导出入口仍可访问。
- [x] 未保存离开确认弹窗仍能阻止误离开。
- [x] “不保存直接离开”不再使用 danger 样式。
- [x] `npm run build -w packages/frontend` 通过（存在既有深色模式 CSS 选择器警告，不影响构建）。

### Task P1.5：补充完整 Dashboard 下一步引导

**Files:**
- Modify: `packages/frontend/app/dashboard/page.tsx`

**实施要求：**

- 当简历和 JD 都存在时，保留紧凑的三步流程指示器。
- 第三步“开始分析”高亮，并提供可用的分析入口。
- 当没有可解析完成的简历时，第三步保持禁用并说明原因。

**验收：**

- [x] 简历为空时突出上传入口。
- [x] JD 为空时突出创建岗位入口。
- [x] 两者存在且有已解析简历时突出开始分析。
- [x] 两者存在但没有已解析简历时说明等待解析，不产生错误链接。
- [x] `npm run build -w packages/frontend` 通过（存在既有深色模式 CSS 选择器警告，不影响构建）。

## P2：移动端与无障碍

### Task P2.1：统一页面主内容宽度和编辑器高度

**Files:**
- Modify: `packages/frontend/app/layout.tsx`
- Modify: `packages/frontend/app/resumes/[id]/page.tsx`
- Modify: `packages/frontend/app/generated/[id]/page.tsx`

**实施要求：**

- 主内容区域使用 `mx-auto w-full`，同时保留当前最大宽度限制。
- 编辑器和预览区域在移动端使用较小高度，在桌面端保持舒适高度。
- 不使用渲染期间读取 `window.innerWidth` 的方式，优先使用 CSS 响应式高度或稳定的容器布局。

**验收：**

- [ ] 390px、768px、1440px 宽度下内容无横向溢出，待浏览器验收。
- [x] 移动端编辑器使用较小的响应式高度，避免占据过长首屏。
- [x] 桌面端编辑区域和预览保持 600px 高度，前端构建通过。

### Task P2.2：统一 Modal 遮罩、关闭和焦点行为

**Files:**
- Modify: `packages/frontend/components/AuthModal.tsx`
- Modify: `packages/frontend/app/layout.tsx`
- Modify: `packages/frontend/app/dashboard/page.tsx`
- Modify: `packages/frontend/app/analyze/[resumeId]/page.tsx`
- Modify: `packages/frontend/app/generated/[id]/page.tsx`

**实施要求：**

- 统一遮罩视觉：`bg-black/40 backdrop-blur-sm`。
- 支持点击遮罩关闭的弹窗继续保留该行为；表单提交或保存中禁止误关闭。
- 支持 Escape 关闭非阻塞弹窗。
- 打开弹窗时聚焦第一个可交互元素，关闭后恢复原焦点；无法实现焦点恢复的弹窗至少保证键盘可进入和退出。
- 弹窗内容设置合适的 `role`、标题关联和按钮标签。

**验收：**

- [ ] 鼠标、Escape、键盘 Tab 都能完成关闭或操作，代码已迁移，待浏览器验收。
- [x] AuthModal 保存/提交中不会因误点遮罩关闭。
- [x] 所有弹窗已迁移共享焦点 Hook，焦点循环的浏览器验收待完成。
- [x] `npm run build -w packages/frontend` 通过（存在既有深色模式 CSS 选择器警告，不影响构建）。

### Task P2.3：补充图标按钮和 Toast 可访问性

**Files:**
- Modify: `packages/frontend/components/Toast.tsx`
- Modify: `packages/frontend/app/analyze/[resumeId]/page.tsx`
- Modify: `packages/frontend/app/jobs/page.tsx`
- Modify: `packages/frontend/app/layout.tsx`

**实施要求：**

- Toast 容器设置 `role="status"` 和 `aria-live="polite"`。
- 所有纯图标按钮提供准确的 `aria-label`。
- 仅依靠颜色表达状态的元素同时提供文字或语义标签。
- 保留现有 focus-visible ring 样式。

**验收：**

- [x] Toast 容器已设置 `role="status"`、`aria-live="polite"` 和 `aria-atomic`。
- [x] 主要页面纯图标按钮已补充可读名称，其他页面待继续盘点。
- [ ] 键盘焦点清晰可见，待逐页验收。
- [x] AuthModal、Toast 和共享 Hook 前端构建通过。

## P3：设计系统长期对齐

### Task P3.1：收敛圆角和语义颜色

**Files:**
- Modify: `packages/frontend/app/globals.css`
- Modify: affected frontend pages/components after inventory

**实施要求：**

- 新增或完善 surface、text、border、semantic color tokens。
- 新代码优先使用语义 token，不继续扩散硬编码 hex。
- 将高频 `rounded-xl`、`rounded-2xl` 逐步收敛到 `DESIGN.md` 允许的 4/6/8px 体系。
- 不在本任务中大范围重排已有页面结构。

**验收：**

- [ ] 新增组件不使用未定义的颜色 token。
- [ ] 主要页面圆角与 `DESIGN.md` 一致。
- [ ] 浅色模式构建和浏览器验收通过。

### Task P3.2：重写深色模式覆盖策略

**Files:**
- Modify: `packages/frontend/app/globals.css`
- Modify: affected frontend pages/components after inventory

**实施要求：**

- 先建立完整的深色 surface/text/border token，再逐步移除通用 `!important` 覆盖。
- 不在没有视觉回归截图或逐页验收的情况下直接删除现有覆盖。
- 保持系统偏好、localStorage 持久化和手动切换行为。

**验收：**

- [ ] Dashboard、分析页、两个编辑器、JD、充值、管理页在深色模式下可读。
- [ ] 刷新后主题保持。
- [ ] 系统偏好默认行为保持。
- [ ] `prefers-reduced-motion` 行为不受影响。

### Task P3.3：抽取共享 EmptyState、Modal、PageHeader

**Files:**
- Create: `packages/frontend/components/EmptyState.tsx`
- Create: `packages/frontend/components/Modal.tsx`
- Create: `packages/frontend/components/PageHeader.tsx`
- Modify: consuming pages after the shared APIs are verified

**实施要求：**

- 先抽取两个以上重复且视觉一致的场景，再迁移调用方。
- 组件 API 保持小而明确，避免把业务逻辑放进通用组件。
- 每次只迁移一个页面，迁移后进行页面构建和行为验收。

**验收：**

- [ ] 空状态、弹窗、页面标题的视觉和交互一致。
- [ ] 通用组件没有页面专属 API 或业务请求。
- [ ] 迁移前后路由和用户流程不变。

## 发布门槛

以下条件全部满足前，不推送、不部署：

- [ ] P0 任务全部完成并在本地浏览器验收。
- [ ] P1 任务至少完成 P1.1、P1.2，并通过页面行为验收。
- [ ] `npm run build -w packages/shared` 通过。
- [ ] `npm run build -w packages/backend` 通过。
- [ ] `npm run build -w packages/frontend` 通过。
- [ ] 本地 Postgres、Redis、backend、worker、frontend 均可启动。
- [ ] 桌面端和移动端关键流程无阻断：登录、Dashboard、上传、编辑、分析、生成、保存、导出。
- [ ] 单独确认后才允许整理 commit、推送和触发云端部署。

## 跟进记录

| 日期 | 事项 | 结果 |
|------|------|------|
| 2026-08-19 | 核对 v0.6.0 与本方案的重叠项 | v0.6.0 基础 UI 优化已完成；本计划承接后续纠偏和可访问性工作 |
| 2026-08-19 | 本地构建验证 | shared、backend、frontend 构建通过 |
| 2026-08-19 | 发布状态 | 未推送、未触发云端部署 |
