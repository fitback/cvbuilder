# 简历匹配与生成平台 — 技术设计文档

> **项目代号：** ResumeMatcher
> **版本：** v1.0 MVP
> **更新日期：** 2026-05-07
> **状态：** 初稿

---

## 一、项目概述

### 1.1 产品定位

面向国内求职者的简历优化与岗位匹配平台，包含三大核心功能：

1. **简历分析**：上传简历 + 目标岗位 JD，AI 输出匹配度评估与优化建议
2. **简历生成**：基于分析结论，重构生成高度匹配目标岗位的专业简历
3. **在线编辑 + PDF 导出**：对 AI 生成的简历进行在线修改，并导出 PDF

### 1.2 商业模式

- **C 端**：免费分析 3 次/人（体验引流），后续生成简历收费（9.9 元/次，MVP 阶段暂缓收费）
- **B 端**：C 端用户积累后，企业付费查看匹配候选人（MVP 后规划）

### 1.3 目标用户

以国内求职者为主，涵盖应届生、转行者、跳槽者。

---

## 二、技术架构

### 2.1 技术栈总览

| 层级 | 技术选型 | 说明 |
|-----|---------|------|
| 前端 | Next.js + Tailwind CSS | 快速上线，支持 SSR |
| 后端 | Node.js + NestJS | 架构清晰，模块化 |
| 数据库 | PostgreSQL | 结构化数据，支持 JSONB |
| AI 大模型 | DeepSeek（deepseek-chat） | 分析大师 + 生成大师 |
| 文件解析 | mammoth（.docx）+ pdf-parse（.pdf）| 开源方案 |
| Markdown 编辑器 | @uiw/react-md-editor | 轻量，支持预览 |
| PDF 导出 | Puppeteer（后端渲染）| 样式可控 |
| 文件存储 | 本地磁盘 + UUID 映射 | 非 public 目录，防直接访问 |
| 认证 | JWT + 手机号验证码 | 简单成熟 |

### 2.2 系统架构图

```
┌─────────────┐     HTTPS      ┌──────────────────┐
│   Browser   │ ◄───────────► │   Next.js App    │
└─────────────┘              │   (Frontend)     │
                              └────────┬─────────┘
                                       │ REST API
                              ┌────────▼─────────┐
                              │   NestJS API    │
                              │   (Backend)    │
                              └────┬──────┬────┘
                                   │      │
              ┌────────────────────┘      └────────────────────┐
              │                                                 │
     ┌────────▼────────┐                          ┌────────────▼──────┐
     │  File Storage   │                          │   PostgreSQL DB   │
     │  /data/resumes  │                          │  (users/resumes/ │
     │  (UUID mapped)   │                          │   jobs/records)   │
     └─────────────────┘                          └───────────────────┘
              │
     ┌────────▼────────┐
     │  Puppeteer Service │
     │  (PDF Rendering)   │
     └──────────────────┘
              │
     ┌────────▼────────┐
     │    DeepSeek API   │
     │  (AI Analysis &    │
     │   Generation)      │
     └───────────────────┘
```

---

## 三、数据库设计

### 3.1 ER 图概述

```
users ─────┐
           ├──< resumes ──────<
           │                    │
           ├──< job_descriptions │
           │                    │
           └──< analysis_records │
                                  │
                   resume_id ─────┘
                   jd_id ─────────┘
                   edited_resume ────<
```

### 3.2 表结构

#### users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|-----|------|------|-----|
| id | UUID | PK | 用户 ID |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | 手机号 |
| password_hash | VARCHAR(255) | NOT NULL | 密码（bcrypt）|
| created_at | TIMESTAMP | DEFAULT NOW() | 注册时间 |
| last_login_at | TIMESTAMP | | 最后登录时间 |
| status | VARCHAR(20) | DEFAULT 'active' | active / suspended / deleted |

#### resumes（简历表）

| 字段 | 类型 | 约束 | 说明 |
|-----|------|------|-----|
| id | UUID | PK | 简历 ID |
| user_id | UUID | FK → users.id | 所属用户 |
| file_path | VARCHAR(512) | NOT NULL | 存储路径（UUID）|
| file_name_original | VARCHAR(255) | | 原始文件名 |
| file_type | VARCHAR(10) | NOT NULL | pdf / docx |
| file_size | INTEGER | | 文件大小（bytes）|
| parse_status | VARCHAR(20) | DEFAULT 'pending' | pending / parsing / parsed / failed |
| parse_result | JSONB | | 结构化解析结果 |
| raw_text | TEXT | | 提取的原始文本（备查）|
| free_analysis_count | INTEGER | DEFAULT 3 | 剩余免费分析次数 |
| created_at | TIMESTAMP | DEFAULT NOW() | 上传时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

#### job_descriptions（JD 表）

| 字段 | 类型 | 约束 | 说明 |
|-----|------|------|-----|
| id | UUID | PK | JD ID |
| user_id | UUID | FK → users.id | 所属用户 |
| title | VARCHAR(255) | NOT NULL | 职位名称 |
| company | VARCHAR(255) | | 公司名称 |
| content | TEXT | NOT NULL | JD 正文 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

#### analysis_records（分析记录表）

| 字段 | 类型 | 约束 | 说明 |
|-----|------|------|-----|
| id | UUID | PK | 记录 ID |
| user_id | UUID | FK → users.id | 所属用户 |
| resume_id | UUID | FK → resumes.id | 关联简历 |
| job_description_id | UUID | FK → job_descriptions.id | 关联 JD |
| analysis_result | JSONB | | 分析大师输出 |
| match_score | INTEGER | | 匹配度分数（0-100）|
| generation_status | VARCHAR(20) | DEFAULT 'pending' | pending / generated |
| generated_resume | TEXT | | 生成的 Markdown 简历 |
| edited_resume | TEXT | | 用户编辑后的版本 |
| created_at | TIMESTAMP | DEFAULT NOW() | 分析时间 |

#### edited_resumes（用户编辑版本表）

| 字段 | 类型 | 约束 | 说明 |
|-----|------|------|-----|
| id | UUID | PK | 编辑版本 ID |
| analysis_record_id | UUID | FK → analysis_records.id | 关联分析记录 |
| content | TEXT | NOT NULL | Markdown 内容 |
| created_at | TIMESTAMP | DEFAULT NOW() | 编辑时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 最后修改时间 |

### 3.3 索引设计

```sql
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_parse_status ON resumes(parse_status);
CREATE INDEX idx_job_descriptions_user_id ON job_descriptions(user_id);
CREATE INDEX idx_analysis_records_user_id ON analysis_records(user_id);
CREATE INDEX idx_analysis_records_resume_id ON analysis_records(resume_id);
CREATE INDEX idx_analysis_records_jd_id ON analysis_records(job_description_id);
```

---

## 四、API 设计

### 4.1 认证模块

#### 注册
```
POST /auth/register
Body: { phone: string, code: string, password: string }
Response: { userId: uuid, token: jwt }
```

#### 登录
```
POST /auth/login
Body: { phone: string, password: string }
Response: { userId: uuid, token: jwt }
```

#### 发送验证码
```
POST /auth/send-code
Body: { phone: string }
Response: { success: true, message: "验证码已发送" }
```

### 4.2 简历模块

#### 上传简历
```
POST /resumes/upload
Headers: { Authorization: Bearer <token> }
Body: multipart/form-data { file: File }
Response: {
  resumeId: uuid,
  fileType: "pdf" | "docx",
  parseStatus: "parsing",
  fileNameOriginal: string
}
```

#### 列出简历
```
GET /resumes
Headers: { Authorization: Bearer <token> }
Response: {
  items: [{
    id: uuid,
    fileNameOriginal: string,
    fileType: string,
    parseStatus: string,
    createdAt: timestamp
  }]
}
```

#### 获取简历详情
```
GET /resumes/:id
Headers: { Authorization: Bearer <token> }
Response: {
  id: uuid,
  parseStatus: string,
  parseResult: object,       // 结构化 JSON
  rawText: string,          // 原始文本
  freeAnalysisCount: number
}
```

#### 删除简历
```
DELETE /resumes/:id
Headers: { Authorization: Bearer <token> }
Response: { success: true }
```

### 4.3 JD 模块

#### 创建 JD
```
POST /jobs
Headers: { Authorization: Bearer <token> }
Body: { title: string, company?: string, content: string }
Response: { jobDescriptionId: uuid }
```

#### 列出 JD
```
GET /jobs
Headers: { Authorization: Bearer <token> }
Response: { items: [{ id, title, company, createdAt }] }
```

#### 删除 JD
```
DELETE /jobs/:id
Headers: { Authorization: Bearer <token> }
Response: { success: true }
```

### 4.4 分析 & 生成模块

#### 免费分析简历
```
POST /analyze
Headers: { Authorization: Bearer <token> }
Body: { resumeId: uuid, jobDescriptionId: uuid }
Response: {
  analysisRecordId: uuid,
  matchScore: number,          // 0-100
  jdCoreDecoding: object[],    // JD 核心关键需求
  optimizationSuggestions: object[], // 核心优化建议
  detailChecklist: object[],   // 细节排雷清单
  remainingFreeCount: number
}
Error Cases:
  - 401: 未授权
  - 403: 免费次数已用完
  - 404: 简历或 JD 不存在
  - 422: 简历解析失败，无法分析
```

#### 生成简历
```
POST /generate
Headers: { Authorization: Bearer <token> }
Body: { analysisRecordId: uuid }
Response: {
  generatedResume: string, // Markdown 格式
  orderId: uuid            // 未来收费关联
}
Note: MVP 阶段暂不收费，直接生成
```

#### 保存编辑版本
```
PUT /generate/:recordId
Headers: { Authorization: Bearer <token> }
Body: { content: string } // Markdown
Response: { success: true }
```

#### 导出 PDF
```
POST /export/pdf
Headers: { Authorization: Bearer <token> }
Body: { analysisRecordId: uuid }
Response: binary (application/pdf)
Note: 调用后端 Puppeteer 服务渲染
```

### 4.5 错误码规范

| HTTP Status | 错误码 | 说明 |
|------------|-------|------|
| 400 | INVALID_PARAMS | 参数错误 |
| 401 | UNAUTHORIZED | 未登录 |
| 403 | QUOTA_EXCEEDED | 免费次数已用完 |
| 404 | RESOURCE_NOT_FOUND | 资源不存在 |
| 409 | FILE_TYPE_UNSUPPORTED | 文件格式不支持 |
| 413 | FILE_TOO_LARGE | 文件超过 5MB |
| 422 | PARSE_FAILED | 简历解析失败 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 503 | AI_SERVICE_UNAVAILABLE | AI 服务不可用（超时/限流）|

---

## 五、核心模块详细设计

### 5.1 简历解析流程

```
文件上传
  ↓
文件类型校验（.pdf / .docx）
  ↓
文件大小校验（< 5MB）
  ↓
文件类型路由：
  .docx → mammoth 解析
  .pdf  → pdf-parse 提取文本
  ↓
文本质量评估：
  有效字符数 > 200 → 正常流程
  有效字符数 < 200 → 进入「质量警告」分支
  ↓
结构化提取（正则 + 启发式规则）：
  - 按行读取，识别标题行（居中/字号大）
  - 关键词识别章节（工作经历、项目经验、教育背景）
  - 字段提取（姓名、联系方式、邮箱）
  ↓
parse_result JSON 输出：
{
  name: string,
  contact: { phone, email },
  summary: string,
  workExperience: [{ company, position, duration, description }],
  projectExperience: [{ name, role, duration, description }],
  education: [{ school, major, degree, duration }],
  skills: string[]
}
```

### 5.2 简历分析大师（Agent）

**系统提示词（System Prompt）：**

```
【见用户提供的完整提示词，此处省略】
```

**调用方式：**
- 模型：DeepSeek（deepseek-chat）
- 温度：0.3（减少幻觉，保持专业）
- 输入：结构化简历 JSON + JD 正文
- 输出：JSON 格式分析报告
- Token 预算：输入约 3000-7000 tokens，输出约 1500-2500 tokens

**输出格式（JSON）：**
```json
{
  "matchScore": 75,
  "matchSummary": "一句话概括匹配程度",
  "jdCoreDecoding": [
    { "core": "核心需求描述", "hidden": "隐性考察点" }
  ],
  "optimizationSuggestions": [
    {
      "target": "目标模块（如工作经历）",
      "action": "修改/新增/删除",
      "detail": "具体修改动作",
      "example": "修改示例"
    }
  ],
  "detailChecklist": [
    { "type": "delete/edit", "location": "具体位置", "content": "问题描述" }
  ]
}
```

### 5.3 简历生成大师（Agent）

**系统提示词（见用户提供版本）**

**调用方式：**
- 模型：DeepSeek（deepseek-chat）
- 温度：0.4（保持创造性的同时减少幻觉）
- 输入：简历分析大师的输出结论 + 原始简历 JSON
- 输出：Markdown 格式完整简历

**输出格式：**
```markdown
# 姓名
[联系方式 | 邮箱 | 求职意向：目标岗位名称]

## 个人优势/专业摘要
[3条核心匹配亮点]

## 工作经历
### 公司名称 | 职位名称 | 起止时间
- ...

## 项目经历
### 项目名称 | 担任角色 | 起止时间
- ...

## 教育背景
### 学校名称 | 专业 | 学历 | 起止时间

## 专业技能
[分类列出]
```

### 5.4 PDF 导出（Puppeteer）

```
用户请求导出 PDF
  ↓
后端接收 Markdown 内容
  ↓
加载 HTML 模板（含 CSS 样式 + 思源黑体）
  ↓
Markdown → HTML 渲染
  ↓
Puppeteer 渲染页面
  ↓
生成 PDF Buffer
  ↓
返回给前端 / 直接下载
```

**HTML 模板样式要点：**
- 字体：思源黑体（Source Han Sans CN）
- 页面：A4，单栏布局
- 标题层级：姓名（H1）> 章节名（H2）> 内容（H3）
- 行距：1.5 倍
- 页边距：2.5cm
- 不自动分页符，由 Puppeteer 自动处理

---

## 六、文件存储设计

### 6.1 存储策略

```
/data/
  └── resumes/
        ├── {uuid}.pdf
        └── {uuid}.docx
```

- **原始文件名不存储**，只存储 UUID 映射
- 文件路径不暴露于 URL，通过 API 鉴权后读取
- 文件名示例：`/data/resumes/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf`

### 6.2 安全措施

- 存储目录不在 public 或任何可访问的静态目录下
- 文件访问通过 API + JWT 鉴权
- 数据库只存 `file_path`，原始文件名存 `file_name_original`（仅用于展示）

---

## 七、前端页面设计

### 7.1 页面结构

| 页面 | 路由 | 说明 |
|-----|------|------|
| 登录/注册 | `/auth` | 手机号 + 验证码登录 |
| 隐私协议 | `/privacy` | 弹窗形式 |
| 首页/仪表盘 | `/dashboard` | 简历列表 + 快捷操作 |
| 上传简历 | `/upload` | 文件上传 + 解析状态 |
| JD 管理 | `/jobs` | 创建/编辑/删除 JD |
| 分析页 | `/analyze/:resumeId` | 选择 JD，查看分析结果 |
| 简历编辑器 | `/edit/:recordId` | Markdown 编辑器 |
| 导出页 | `/export/:recordId` | PDF 预览 + 导出 |

#### 信息架构（每页视觉层级）

**Dashboard (`/dashboard`)**
- 空态（首次访问）：居中上传 CTA + 两句话价值主张「上传简历，AI 帮你匹配理想岗位」
- 有数据时：简历列表为主体内容，操作栏紧凑置于列表上方（非独立卡片），JD 数量为次级指标

**分析页 (`/analyze/:resumeId`)**
- 匹配度分数大号居中置顶，3 个分析模块默认全部展开
- 顶部 sticky 快速导航条（JD 解码 / 优化建议 / 排雷清单）
- 「全部折叠」开关位于导航条右侧

**上传页 (`/upload`)**
- 拖拽/点击上传区域为主体（占据视觉中心），已上传文件的解析状态列表为次级内容

**JD 管理 (`/jobs`)**
- JD 列表为主体，新建按钮固定于列表顶部右侧
- 空态：居中引导「创建你的第一个岗位描述」

**简历编辑器 (`/edit/:recordId`)**
- 左侧 Markdown 编辑区（60%），右侧实时预览区（40%）
- 顶部工具栏：保存 / 导出 PDF，固定在视口内

**导出页 (`/export/:recordId`)**
- PDF 预览为主体（居中，A4 比例），导出下载按钮置于预览上方

### 7.2 核心用户路径状态流

```
[上传简历页面]
  ↓ 上传文件
[loading: "正在解析简历..."]
  ↓ 解析成功
[简历预览页面] ←→ [重新上传]
  ↓
[JD 选择/输入页面]
  ↓ 点击「免费分析」
[loading: "AI 正在分析中..."（显示进度）]
  ↓ 分析完成
[分析结果展示页面]
  ├─ 匹配度分数（醒目展示）
  ├─ JD 核心解码（可折叠）
  ├─ 优化建议（可折叠）
  └─ 排雷清单（可折叠）
  ↓
[点击「生成简历」]
[loading: "AI 正在生成简历..."]
  ↓
[简历编辑器页面]
  ├─ Markdown 编辑区
  ├─ 实时预览区
  └─ 顶部工具栏（保存/导出 PDF）
  ↓
[点击「导出 PDF」]
[系统弹窗或直接下载]
```

### 7.3 错误状态 UI

| 场景 | UI 表现 |
|-----|-------|
| 文件格式不支持 | 红色提示「仅支持 PDF 和 Word 格式」|
| 文件超过 5MB | 红色提示「文件过大，请压缩后重试」|
| 解析失败 | 橙色警告「无法识别简历内容，建议使用 Word 格式重新上传」|
| 免费次数用完 | 灰色按钮 + 提示「免费次数已用完」|
| AI 服务超时 | 红色提示「服务繁忙，请稍后重试」，附重试按钮 |
| 生成失败 | 红色提示「生成失败，请检查简历和 JD 内容后重试」|

### 7.4 交互状态全覆盖

| 功能 | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL |
|------|---------|-------|-------|---------|---------|
| 仪表盘 | 骨架屏（列表行占位） | 居中插图 +「上传你的第一份简历，AI 帮你匹配理想岗位」+ 上传按钮 | 加载失败 + 重试按钮 | — | 简历已上传但解析中（显示解析中徽标） |
| 上传简历 | 进度条（百分比 + 预计时间） | — | 格式/大小错误提示（见 §7.3） | 绿色勾 +「解析完成」→ 自动跳转简历详情 | 上传成功但解析失败（橙色警告 + 重新上传按钮） |
| AI 分析 | 3 步进度指示器（读取简历 → 解析 JD → 计算匹配度）+ 骨架屏 | — | 超时重试 / AI 不可用提示（见 §7.3） | 匹配度分数动画（0→最终值滚动效果） | — |
| AI 生成 | 生成中进度条 +「正在为你撰写简历...」 | — | 生成失败 + 重试（见 §7.3） | Markdown 简历渲染 + 编辑/导出按钮 | — |
| JD 管理 | 列表骨架屏 | 居中引导「创建你的第一个岗位描述」+ 新建按钮 | 加载失败 + 重试 | 创建成功 toast「JD 已创建」 | — |
| 简历编辑器 | 编辑器加载骨架 | — | 保存失败 toast「保存失败，请重试」 | 保存成功 toast「已保存」+ 自动保存时间戳 | 内容已修改未保存（浏览器关闭前确认弹窗） |
| PDF 导出 | 导出进度条 +「正在生成 PDF...」 | — | 生成失败 + 重试 | 自动下载 / 预览 + 下载按钮 | — |

### 7.5 关键情感节点设计

**匹配度分数展示**
- 视觉：大号分数 + 环形仪表盘，非裸数字
- 文案：分数下一句话语境化 ——「你的简历覆盖了该岗位 75% 的核心需求，以下 3 项优化可提升至 90%+」
- 设计原则：分数是对话的起点，而非判决

**上传简历 → 解析完成**
- 解析成功时显示提取到的关键字段预览（姓名、最近公司、技能数量），让用户确认「系统看懂了我的简历」—— 建立信任

### 7.6 视觉标识约束

**色彩**
- 主色调：中性灰（gray-900/700/500/100），以暖色点缀（amber/terracotta），禁用蓝紫渐变
- 用途：职业工具 = 可信赖、沉稳，非活泼/科技感

**字体**
- UI 文本：`PingFang SC, Microsoft YaHei, sans-serif`
- 简历内容标题：`Noto Serif SC`（衬线体，体现专业感）
- 禁止：Inter、system-ui、-apple-system 作为展示字体

**密度**
- 信息密集型布局，非稀疏 SaaS 卡片式
- 简历是数据，非营销页面。减少留白，提高信息可扫描性

### 7.7 响应式与无障碍

**响应式策略**
- 浏览型页面（仪表盘、分析结果、JD 列表）：完整移动端适配，底部 Tab 导航
- 上传页：移动端支持，含相机/文档选择器
- 编辑器 + PDF 导出：桌面端专用，移动端显示「请在电脑上打开以编辑简历」

**无障碍基线 (WCAG AA)**
- 色彩对比度 ≥ 4.5:1
- 所有表单输入有可见 label（禁用 placeholder-as-label）
- 焦点指示器可见
- 触摸目标 ≥ 44px
- `aria-live` 区域用于异步状态更新（解析完成、分析完成）
- 仪表盘 skip link

### 7.8 导航架构

- **桌面端**：持久化左侧边栏（Logo + 4 个主导航项：仪表盘 / 上传简历 / 我的 JD / 分析记录）
- **移动端**：底部 Tab Bar（4 个图标，相同导航项）
- **上下文页面**：编辑器、导出页为全屏覆盖层，不在主导航中

### 7.9 PDF 模板策略

- **MVP**：一个精心设计的 A4 简历模板（Noto Serif SC 标题 + 中性色系 + 清晰排版层级）
- **V2**：多种模板可选

---

## 八、简历解析测试标准

### 8.1 上线前验证要求

| 类别 | 样本数量 | 成功标准 |
|-----|---------|---------|
| .docx 标准简历 | 20 份 | 解析成功率 ≥ 90% |
| .pdf 标准文字型 | 20 份 | 解析成功率 ≥ 85% |
| .pdf 多栏布局 | 10 份 | 解析成功率 ≥ 60%（内容顺序可能异常）|
| .pdf 扫描件 | 10 份 | 触发质量警告，引导用户换格式 |

**成功定义：** 提取的文本包含姓名、至少一条工作经历、教育背景。

### 8.2 测试集来源

需自行收集脱敏简历样本，覆盖不同行业（互联网/金融/制造）和不同职位层级（初级/中级/高级）。

---

## 九、风控与日志

### 9.1 日志记录（用于后期审计）

| 事件 | 记录字段 |
|-----|---------|
| 注册 | userId, phone, ip, userAgent, timestamp |
| 上传简历 | userId, resumeId, fileType, fileSize, ip, timestamp |
| 分析请求 | userId, resumeId, jdId, ip, timestamp |
| 异常分析（免费次数为 0）| userId, ip, timestamp |
| 文件解析失败 | userId, resumeId, errorType, ip, timestamp |

### 9.2 防刷机制（MVP 阶段）

- **免费次数**：绑定 user_id + phone
- **次数扣减**：每次分析扣 1，扣到 0 则拒绝服务
- **日志留存**：所有请求入日志表，用于后期风控分析
- **IP 监控**：记录请求 IP，发现异常后可封禁

> MVP 阶段不做强防作弊（如设备指纹），先让用户跑通流程，后期根据实际情况再加。

---

## 十、排期估算

| 模块 | 工时估算 | 优先级 |
|-----|---------|-------|
| 项目脚手架 + CI/CD | 0.5 天 | P0 |
| 数据库设计与实现 | 1 天 | P0 |
| 账号系统（注册/登录/隐私协议）| 1.5 天 | P0 |
| 简历上传 + 解析 + 质量检测 | 2 天 | P0 |
| JD 管理（CRUD）| 1 天 | P0 |
| DeepSeek AI 集成（分析 + 生成）| 1.5 天 | P0 |
| Markdown 在线编辑器 | 1.5 天 | P0 |
| Puppeteer PDF 导出（含样式模板）| 2.5 天 | P0 |
| 错误处理 + 状态反馈 | 1 天 | P0 |
| 测试 + Bug 修复 | 2 天 | P1 |
| **总计** | **约 2 周** | |

---

## 十一、技术债务与未来扩展

### 11.1 MVP 阶段已知技术债务

| 债务 | 说明 | 建议处理时机 |
|-----|------|------------|
| 无版本历史 | 用户编辑后无法回退 | V2 |
| 无支付接口 | 收费功能暂缓 | MVP 后接入微信支付 |
| 简历格式支持有限 | 多栏/扫描件质量差 | 根据用户反馈决定是否加强 |
| 无国际化 | 仅支持中文简历 | V2（英文简历）|

### 11.2 未来扩展方向

1. **B 端企业入口**：企业上传 JD，平台推荐匹配候选人
2. **简历多语言**：支持英文简历生成
3. **版本对比**：新旧简历差异对比展示
4. **简历模板**：多种简历样式模板可选
5. **智能推荐职位**：根据简历内容推荐相关 JD

---

## 附录

### A. 简历解析数据结构（parse_result JSONB）

```json
{
  "name": "张三",
  "contact": {
    "phone": "138xxxx1234",
    "email": "zhangsan@example.com",
    "location": "上海"
  },
  "summary": "5年Java开发经验，擅长微服务架构",
  "workExperience": [
    {
      "company": "XX科技有限公司",
      "position": "高级Java工程师",
      "duration": "2021.03 - 至今",
      "description": "负责核心交易系统开发..."
    }
  ],
  "projectExperience": [
    {
      "name": "电商平台重构项目",
      "role": "技术负责人",
      "duration": "2022.01 - 2022.06",
      "description": "主导微服务拆分，提升系统吞吐量..."
    }
  ],
  "education": [
    {
      "school": "XX大学",
      "major": "计算机科学与技术",
      "degree": "本科",
      "duration": "2015.09 - 2019.06"
    }
  ],
  "skills": ["Java", "Spring Boot", "MySQL", "Redis", "K8s"]
}
```

### B. 环境变量清单（.env.example）

```bash
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/resume_matcher

# AI
DEEPSEEK_API_KEY=sk-xxxxx
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# 文件存储
RESUME_STORAGE_PATH=/data/resumes
MAX_FILE_SIZE_MB=5

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 服务
PORT=3000
API_BASE_URL=http://localhost:3000
```

---

*文档版本：v1.0 MVP — 2026-05-07*

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN (PLAN) | 15 issues, 6 critical gaps |
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | ISSUES_OPEN (PLAN) | score: 3/10 → 7/10, 12 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **UNRESOLVED:** 0 (all decisions resolved in-session)
- **CRITICAL GAPS:** 6 failure modes flagged (see eng review failure modes)
- **VERDICT:** eng review completed with all issues resolved. Key decisions:
  - Async parsing via BullMQ+Redis, separate PDF worker
  - DeepSeek-based resume extraction replacing regex parser
  - Cookie-based anonymous sessions for MVP (no auth)
  - pdf.js direct + Tesseract OCR for Chinese PDF parsing
  - Prisma ORM, class-validator, shared types package
  - 10-example LLM eval set for both AI prompts
  - Dockerfile installs Noto Sans CJK for PDF rendering
  - Atomic UPDATE for free count, DB unique constraint for idempotency
  - Token bucket rate limiting, standard API response envelope
  - Magic bytes file type detection
