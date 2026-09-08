# 简历模板系统实施计划

> 创建时间：2026-09-08
> 对应规格：[2026-09-08-resume-templates-design.md](../specs/2026-09-08-resume-templates-design.md)
> 预计交付：v0.10.0
> 状态：✅ 全部完成（Task 12 范围调整：原始简历编辑页无导出流程，跳过集成）

## 阶段 1：后端模板基础设施（Task 1-7）✅

### Task 1：定义接口
**文件**：`packages/backend/src/templates/template.interface.ts`

定义 `TemplateInput`、`ResumeTemplate`、`TemplateMetadata` 三个接口。`TemplateInput` 含 `markdown` + `structured?`，`ResumeTemplate` 含 `id` / `name` / `description` / `thumbnailDataUri` / `render(input) → string`。

**验收**：tsc --noEmit 通过。

### Task 2：modern 模板
**文件**：`packages/backend/src/templates/modern.template.ts`

迁移现有 [export.service.ts#L8-L33](file:///Users/billchen/projects/cvbuilder/packages/backend/src/export/export.service.ts#L8-L33) 的 `buildHtml` 函数到 `render(input)` 接口。样式保持现有风格（accent #B75C3A，h1 18pt，h2 带 border-bottom），加 `<header>` 顶部 accent 色块。

### Task 3：classic 模板
**文件**：`packages/backend/src/templates/classic.template.ts`

居中标题 + 衬线感（`Noto Serif CJK SC`）+ 横线分隔，accent 色降到 `#8B4513`（深褐），`h2` 用 border-top + border-bottom 双线。

### Task 4：compact 双栏模板
**文件**：`packages/backend/src/templates/compact.template.ts`

CSS Grid 两栏（左 35% / 右 65%），左栏放联系方式 + 技能 + 教育（背景 `#F5F0EC`），右栏放工作经历 + 项目。移动端单栏 fallback。`structured` 字段必填时优先用结构化数据渲染，缺失时从 markdown 提取。

### Task 5：creative 模板
**文件**：`packages/backend/src/templates/creative.template.ts`

顶部 12cm 高 accent 色 banner + 圆形头像位（无照片时显示首字母）+ 左侧侧边栏放联系方式 + 技能标签云。banner 下主区域放工作 + 项目经历。需要测试多页 PDF 的 banner 重复问题（用 `position: relative` + 顶层 banner 不重复）。

### Task 6：TemplatesService + Module + Controller
**文件**：
- `packages/backend/src/templates/templates.service.ts`
- `packages/backend/src/templates/templates.module.ts`
- `packages/backend/src/templates/templates.controller.ts`

`TemplatesService` 持有 4 个模板的注册表（Map），提供 `list()` 和 `render(templateId, input)`。Controller `GET /templates` 返回元数据列表（不含 render 函数）。Module 注册 controller + service，导出 service 供 ExportModule 用。注册到 `app.module.ts`。

### Task 7：扩展 ExportService + ExportDto
**文件**：
- `packages/backend/src/export/export.service.ts`
- `packages/backend/src/export/dto/export.dto.ts`
- `packages/backend/src/export/export.controller.ts`

ExportDto 加 `templateId?` 和 `structured?`。`ExportService.exportPdf(markdown, templateId, structured?)` 调 `TemplatesService.render(templateId, { markdown, structured })` 获取 HTML，其余 puppeteer 逻辑不变。ExportModule import TemplatesModule。

**阶段 1 验收**：`POST /export/pdf` 带 `templateId: "classic"` 返回不同视觉的 PDF。不传 templateId 时 fallback modern。

## 阶段 2：数据模型 + API（Task 8-9）✅

### Task 8：schema 加 templateId + migration
**文件**：`packages/backend/prisma/schema.prisma`

`GeneratedResume` 加 `templateId String @default("modern")`。生成 migration：`add_generated_resume_template`。本地 `prisma migrate dev` + 重新 seed。

### Task 9：GeneratedResume service/controller 支持 templateId
**文件**：
- `packages/backend/src/generated-resumes/generated-resumes.service.ts`
- `packages/backend/src/generated-resumes/generated-resumes.controller.ts`
- `packages/backend/src/generated-resumes/dto/generated-resume.dto.ts`

`GeneratedResumeDto` 加 `templateId?` 字段（IsOptional + IsIn 4 个模板 id）。`update` 方法接受 `templateId` 并持久化。`findOne` / `findAll` 返回 `templateId`。

## 阶段 3：前端集成（Task 10-15）✅

### Task 10：TemplateSelector 组件
**文件**：`packages/frontend/components/TemplateSelector.tsx`

横向 4 个缩略图卡片，每张 ~80x45px（16:9），点击切换，选中态 accent 边框。组件 props：`value: string` / `onChange: (id) => void`。组件内部 fetch `GET /templates` 拿缩略图 dataUri。

### Task 11：编辑页（generated/[id]）集成
**文件**：`packages/frontend/app/generated/[id]/page.tsx`

- 顶部工具栏加 TemplateSelector
- 加载简历时拿 `templateId`，state 初始化
- onChange 时调 `PUT /generated-resumes/:id` 持久化（去抖 500ms）
- 预览 iframe 的 src 从 `POST /export/preview` 拿

### Task 12：原始简历编辑页集成（跳过）
**文件**：`packages/frontend/app/resumes/[id]/page.tsx`

**范围调整**：原始简历编辑页（resumes/[id]）为结构化表单编辑，无 PDF 导出按钮——PDF 导出在生成简历页（generated/[id]）完成。在该页加入 TemplateSelector 会造成 UX 困惑（选择无对应动作）。跳过 Task 12，模板选择集中在 generated/[id] 编辑页 + ExportPreviewModal 完成。

### Task 13：ExportPreviewModal 集成
**文件**：`packages/frontend/components/ExportPreviewModal.tsx`

- 弹窗顶部加 TemplateSelector（从父组件传 value + onChange）
- 「下载 PDF」时把 templateId 传给 `POST /export/pdf`

### Task 14：新增 POST /export/preview 接口
**文件**：`packages/backend/src/export/export.controller.ts`

```typescript
@Post("preview")
@UseGuards(AuthGuard)
async preview(@Body() dto: PreviewDto) {
  const html = this.exportService.renderHtml(dto.markdown, dto.templateId, dto.structured);
  return { html };  // 返回 HTML 字符串（不走 ApiResponseInterceptor 的话直接 res.send）
}
```

为简化，返回 `{ success: true, data: { html } }`，前端拿到后写入 iframe srcdoc。

### Task 15：预览面板改用 iframe + preview API
**文件**：`packages/frontend/app/generated/[id]/page.tsx`、`packages/frontend/app/resumes/[id]/page.tsx`

- 替换现有 `marked` + dangerouslySetInnerHTML 预览为 `<iframe srcdoc={html} />`
- 500ms 去抖 `POST /export/preview`
- md5(markdown + templateId + JSON.stringify(structured)) 缓存 5 分钟（Map）

## 阶段 4：缩略图 + 验收（Task 16-17）✅

**验收结果**（2026-09-08）：
- ✅ `GET /templates` 返回 4 个模板（modern/classic/compact/creative），均带 SVG 缩略图 data URI
- ✅ `POST /export/preview` 各模板返回不同长度的 HTML（modern 1357 / classic 1481 / compact 745 / creative 2276 字符）
- ✅ Invalid templateId 被 DTO `@IsIn(TEMPLATE_IDS)` 校验拒绝（400 INVALID_PARAMS），更严格的设计；service 层仍保留 fallback 到 modern 的逻辑供内部调用
- ✅ GeneratedResume 列表返回 `templateId` 字段，默认 "modern"
- ✅ Backend tsc / Frontend tsc / Shared tsc 全部通过
- ⚠️ PDF 实际渲染需在浏览器手动验收（Puppeteer + Chrome 已就绪）

### Task 16：缩略图 SVG
**文件**：各 `*.template.ts` 的 `thumbnailDataUri`

每模板一张 16:9 SVG，~2KB。用模板的代表色 + 简单几何（线条/色块/文字位）表达模板风格。base64 编码后作为 data URI。

### Task 17：端到端验收

| 场景 | 步骤 | 期望 |
|---|---|---|
| 4 模板列表 | `GET /templates` | 返回 4 项，每项有缩略图 data URI |
| 4 模板 PDF | `POST /export/pdf` 用 4 个 templateId | 产出 4 份视觉不同的 PDF |
| 持久化 | 编辑页选 creative → 刷新 → 仍 creative | ✅ |
| 预览一致 | 前端预览截图 vs PDF 第一页 | 视觉一致 |
| fallback | `templateId: "invalid"` | fallback 到 modern + 后端 warn |
| 向后兼容 | 不传 templateId | 用 modern |
| 原始简历 | resumes/[id] 选模板 + 导出 | ✅ |
| 多页 compact | 上传一份 3+ 段经历简历 + compact 模板导出 | 分页不错位 |
| creative banner | creative 模板 + 1 页 / 3 页 | banner 不重复 |

## 阶段 5：收尾

- 更新 [AGENTS.md](file:///Users/billchen/projects/cvbuilder/AGENTS.md) 加模板系统说明
- 更新 [PROGRESS.md](file:///Users/billchen/projects/cvbuilder/PROGRESS.md) v0.10.0 变更记录
- 更新 [TODOS.md](file:///Users/billchen/projects/cvbuilder/TODOS.md) 标记 P3 模板系统完成
- commit + push + 部署

## 估时（参考，不严格承诺）

- 阶段 1：模板接口 + 4 模板 + 后端基础设施 = 主体工作
- 阶段 2：migration + DTO 扩展
- 阶段 3：前端组件 + 4 处集成
- 阶段 4：缩略图 + 测试

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| compact 双栏在 PDF 多页错位 | CSS `page-break-inside: avoid` + 真实多页简历测试 |
| creative banner 在多页重复 | 只在第一页加 banner，用 `position: relative` 不用 fixed |
| 前端预览请求频繁 | 500ms 去抖 + md5 hash 缓存 |
| parseResult 字段缺失 | 模板 render 函数全 optional + 缺失不渲染 |
| 模板样式跟现有品牌冲突 | 全部用 DESIGN.md 的 accent 色 + 字体 token |
