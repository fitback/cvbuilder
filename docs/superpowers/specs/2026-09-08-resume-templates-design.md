# 简历模板系统设计规格

> 创建时间：2026-09-08
> 状态：规格已确认，待实现

## 一、目标

提供 4 套视觉风格不同的简历模板，用户在导出 PDF / 预览时可以选择模板，让同一份简历呈现不同视觉风格以适配不同求职场景。

**不做**：
- 不做模板编辑器（用户不能自定义模板）
- 不做模板市场上架（开发者内置 4 套，不开放上传）
- 不做收费模板区分（4 套全部免费可用）
- 不做 DOCX 模板化（DOCX 维持现有单一格式）

## 二、用户场景

### 场景 1：生成简历后切换模板预览
1. 用户在分析页生成简历 → 跳转到编辑页（[/generated/{id}](file:///Users/billchen/projects/cvbuilder/packages/frontend/app/generated/%5Bid%5D/page.tsx)）
2. 编辑页顶部新增「模板」选择器（4 套缩略图 + 名字）
3. 默认选「modern」模板
4. 切换模板 → 右侧预览面板立即按新模板渲染
5. 用户编辑 markdown 内容时，预览按当前模板实时刷新

### 场景 2：导出 PDF 时选择模板
1. 编辑页点「导出 PDF」按钮 → 弹出 ExportPreviewModal
2. 弹窗内顶部显示当前选中的模板（可切换）
3. 点击「下载 PDF」→ 后端按当前模板渲染 PDF

### 场景 3：原始简历编辑页也支持模板
- 原始简历编辑页（[/resumes/{id}](file:///Users/billchen/projects/cvbuilder/packages/frontend/app/resumes/%5Bid%5D/page.tsx)）也加模板选择器
- 原始简历的 `parseResult` 是结构化 JSON（包含姓名、工作经历等），可以直接喂给模板渲染

## 三、模板规格

### 4 套内置模板

| ID | 名称 | 适用场景 | 视觉特征 |
|---|---|---|---|
| `modern` | 现代简洁 | 互联网/技术岗 | 单栏 + accent 色块在标题下 + 左侧粗体姓名 |
| `classic` | 经典商务 | 金融/法律/国企 | 单栏 + 居中标题 + 分隔线 + 衬线字体 |
| `compact` | 紧凑双栏 | 经历丰富的高级人才 | 左栏（联系方式+技能+教育）+ 右栏（工作经历+项目） |
| `creative` | 创意设计 | 设计/创意岗 | 顶部彩色 banner + 头像位 + accent 色背景块 |

### 共享设计 token

所有模板遵循 [DESIGN.md](file:///Users/billchen/projects/cvbuilder/DESIGN.md)：
- **Accent 色**：`#B75C3A`（terracotta），各模板用不同饱和度
- **字体**：`Noto Sans CJK SC` / `PingFang SC` / `Source Han Sans CN` 无衬线
- **正文字号**：10.5pt / 行高 1.5
- **A4 页面**：21cm × 29.7cm，页边距 1.5-2.5cm（按模板调整）
- **打印友好**：`printBackground: true`，避免大面积深色背景

### 模板输入数据契约

模板的 `render(data)` 函数接受统一的数据结构：

```typescript
interface TemplateInput {
  // 来自 GeneratedResume.content（markdown）或 Resume.parseResult.rawText
  markdown: string;

  // 来自 parseResult 的结构化字段（可选，模板按需使用）
  structured?: {
    name?: string;
    phone?: string;
    email?: string;
    summary?: string;
    workExperience?: Array<{
      company?: string;
      position?: string;
      duration?: string;
      description?: string;
    }>;
    projectExperience?: Array<{
      name?: string;
      role?: string;
      duration?: string;
      description?: string;
    }>;
    education?: Array<{
      school?: string;
      major?: string;
      degree?: string;
      duration?: string;
    }>;
    skills?: string[];
  };
}
```

- 生成简历：`markdown` 来自 `GeneratedResume.content`，`structured` 来自关联 `Resume.parseResult`（如有）
- 原始简历：`markdown` 由 `parseResult` 字段拼接而成，`structured` 直接用 `parseResult`

## 四、技术架构

### 4.1 后端模板注册

新建 `packages/backend/src/templates/` 目录：

```
packages/backend/src/templates/
├── templates.module.ts          # 注册所有模板
├── templates.service.ts          # 列表 + 渲染入口
├── templates.controller.ts       # GET /templates 列表
├── template.interface.ts         # TemplateInput, ResumeTemplate 接口
├── modern.template.ts            # 4 套模板
├── classic.template.ts
├── compact.template.ts
└── creative.template.ts
```

每个模板导出一个 `ResumeTemplate` 对象：

```typescript
export interface ResumeTemplate {
  id: string;                   // "modern" | "classic" | "compact" | "creative"
  name: string;                 // "现代简洁"
  description: string;          // 一句话说明
  thumbnailDataUri: string;     // 16:9 SVG 缩略图（base64 data URI，前端直接 <img>）
  render(input: TemplateInput): string;  // 返回完整 HTML 文档字符串
}
```

### 4.2 扩展 ExportService

修改 [export.service.ts](file:///Users/billchen/projects/cvbuilder/packages/backend/src/export/export.service.ts)：

```typescript
// 现有：buildHtml(markdown) → HTML
// 改为：renderWithTemplate(markdown, templateId, structured?) → HTML

async exportPdf(markdown: string, templateId: string = "modern", structured?: any): Promise<Buffer>
async exportDocx(markdown: string): Promise<Buffer>  // 不变，DOCX 不模板化
```

- `templateId` 默认 `modern`，向后兼容
- 找不到 templateId 时 fallback 到 `modern`（记 warn）
- Puppeteer 渲染逻辑不变，只替换 HTML 源

### 4.3 扩展 ExportDto

修改 [export.dto.ts](file:///Users/billchen/projects/cvbuilder/packages/backend/src/export/dto/export.dto.ts)：

```typescript
export class ExportDto {
  @IsString() @Length(1, 50000)
  markdown: string;

  @IsString() @IsOptional() @IsIn(["modern", "classic", "compact", "creative"])
  templateId?: string;  // 默认 "modern"

  @IsObject() @IsOptional()
  structured?: any;  // 结构化简历数据
}
```

### 4.4 数据模型扩展

`GeneratedResume` 新增字段：

```prisma
model GeneratedResume {
  // ... 现有字段 ...
  templateId String @default("modern")  // 用户选择的模板
  // ...
}
```

- 不改 `Resume` 模型（原始简历的模板选择是会话级的，不持久化）
- 生成 migration：`add_generated_resume_template`

### 4.5 模板列表 API

新增 `GET /templates` 接口（无需鉴权，模板是公开资产）：

```json
{
  "success": true,
  "data": [
    {
      "id": "modern",
      "name": "现代简洁",
      "description": "互联网/技术岗适用",
      "thumbnailDataUri": "data:image/svg+xml;base64,..."
    },
    // ...
  ]
}
```

### 4.6 GeneratedResume API 扩展

- `PUT /generated-resumes/:id` 接受可选 `templateId`，更新持久化
- `GET /generated-resumes/:id` 返回 `templateId` 字段

## 五、前端实现

### 5.1 模板选择器组件

新建 [TemplateSelector.tsx](file:///Users/billchen/projects/cvbuilder/packages/frontend/components/TemplateSelector.tsx)：

- 横向 4 个缩略图卡片（点击切换）
- 选中态：accent 色边框 + 阴影
- hover 显示模板名称 tooltip
- 加载时从 `GET /templates` 拉列表

### 5.2 编辑页集成

- [generated/[id]/page.tsx](file:///Users/billchen/projects/cvbuilder/packages/frontend/app/generated/%5Bid%5D/page.tsx)：
  - 顶部工具栏加 TemplateSelector
  - 选择时调 `PUT /generated-resumes/:id` 持久化 `templateId`
  - 预览面板渲染时把 `templateId` + `structured` 传给后端 preview API
- [resumes/[id]/page.tsx](file:///Users/billchen/projects/cvbuilder/packages/frontend/app/resumes/%5Bid%5D/page.tsx)：
  - 顶部工具栏加 TemplateSelector
  - 不持久化（state-only），每次进页面默认 `modern`

### 5.3 预览渲染

两种方案：

**方案 A（推荐）**：前端调后端 `POST /export/preview` 接口，后端返回 HTML 字符串，前端 iframe 渲染
- 优点：前后端渲染一致，不会出现"预览跟 PDF 长得不一样"
- 缺点：每次切换模板 + 编辑都要请求后端（加去抖动 + 缓存）

**方案 B**：前端自己实现 4 套 React 组件渲染
- 优点：实时响应快
- 缺点：前后端要维护两套模板代码，容易不一致

选方案 A：保证一致性优先。preview API 加 500ms 去抖缓存（同一 markdown+templateId+structured 的 hash 命中缓存）。

### 5.4 ExportPreviewModal 集成

[ExportPreviewModal.tsx](file:///Users/billchen/projects/cvbuilder/packages/frontend/components/ExportPreviewModal.tsx)：
- 弹窗顶部加 TemplateSelector（默认选编辑页选的那个）
- 「下载 PDF」时把 templateId 传给 `POST /export/pdf`

## 六、任务拆分

| # | 任务 | 文件 | 优先级 |
|---|---|---|---|
| 1 | 定义 TemplateInput / ResumeTemplate 接口 | backend/src/templates/template.interface.ts | P0 |
| 2 | 实现 modern 模板（迁移现有 buildHtml） | backend/src/templates/modern.template.ts | P0 |
| 3 | 实现 classic 模板 | backend/src/templates/classic.template.ts | P0 |
| 4 | 实现 compact 模板（双栏） | backend/src/templates/compact.template.ts | P0 |
| 5 | 实现 creative 模板（banner + 头像位） | backend/src/templates/creative.template.ts | P0 |
| 6 | TemplatesService + Module + Controller | backend/src/templates/*.ts | P0 |
| 7 | 扩展 ExportService + ExportDto | backend/src/export/ | P0 |
| 8 | 数据模型加 templateId + migration | backend/prisma/schema.prisma | P0 |
| 9 | GeneratedResume service/controller 支持 templateId | backend/src/generated-resumes/ | P0 |
| 10 | 前端 TemplateSelector 组件 | frontend/components/TemplateSelector.tsx | P0 |
| 11 | 编辑页（generated/[id]）集成模板选择 + 持久化 | frontend/app/generated/[id]/page.tsx | P0 |
| 12 | 原始简历编辑页（resumes/[id]）集成 | frontend/app/resumes/[id]/page.tsx | P0 |
| 13 | ExportPreviewModal 集成模板选择 | frontend/components/ExportPreviewModal.tsx | P0 |
| 14 | 新增 POST /export/preview 接口（返回 HTML） | backend/src/export/ | P0 |
| 15 | 前端预览面板改用 iframe + preview API | frontend/app/generated/[id]/page.tsx | P0 |
| 16 | 缩略图 SVG 生成（每模板一张 16:9） | 各 .template.ts 的 thumbnailDataUri | P1 |
| 17 | 端到端验收（4 模板 × 编辑+导出） | — | P0 |

## 七、验收标准

1. **模板列表**：`GET /templates` 返回 4 套模板的 id/name/description/thumbnailDataUri
2. **PDF 导出**：用相同 markdown，分别用 4 个 templateId 调 `POST /export/pdf`，产出 4 份视觉明显不同的 PDF
3. **持久化**：在编辑页选 creative 模板 → 刷新页面 → 仍是 creative
4. **预览一致**：前端预览的 HTML 跟 PDF 导出的 HTML 100% 一致（同一 render 函数）
5. **fallback**：传不存在的 templateId（如 "abc"）→ fallback 到 modern + 后端日志 warn
6. **默认值**：现有 `POST /export/pdf` 不传 templateId → 用 modern（向后兼容）
7. **原始简历**：原始简历编辑页能选模板 + 预览 + 导出

## 八、依赖与风险

### 依赖
- Puppeteer 已就绪（v0.6.0 起单实例 + 错误恢复）
- `marked` 已在 backend 依赖
- `GeneratedResume` 模型已有，只需加字段

### 风险

| 风险 | 缓解 |
|---|---|
| 双栏模板（compact）在 PDF 分页时栏错位 | 用 CSS `display: flex` + `page-break-inside: avoid`，测试时多页简历必须验证 |
| creative 模板的彩色 banner 占空间大 | 测试 1 页简历 + 3 页简历两种场景 |
| 前端预览请求频繁 | 500ms 去抖 + md5(markdown+templateId+structured) 缓存 5 分钟 |
| parseResult schema 不稳定（不同简历字段可能缺失） | 模板 render 函数所有字段都做 optional 处理 + 缺失时不渲染那一块 |
| 缩略图 SVG 内嵌到 TS 文件让文件膨胀 | 缩略图用极简 SVG（< 2KB），base64 后 ~3KB |

## 九、不做的事

- 不做用户自定义模板编辑器
- 不做模板市场（用户上传/售卖模板）
- 不做付费模板（4 套全免费）
- 不做 DOCX 模板化
- 不做实时协同编辑模板（多人同时改模板选择）
