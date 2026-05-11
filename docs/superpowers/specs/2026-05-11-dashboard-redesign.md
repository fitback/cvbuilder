# 仪表盘改版 — 设计文档

> **项目：** ResumeMatcher
> **版本：** v0.1.0
> **日期：** 2026-05-11
> **状态：** 待实现

---

## 一、概述

将仪表盘从单一简历列表改为三区工作台：简历 / JD / 已生成简历。每个区有独立的加载、空态、错误处理。

---

## 二、信息架构

### 2.1 布局

```
┌──────────────────────────────────────────────────────┐
│  [Sidebar 200px]  │  Dashboard Content (max 960px)   │
│                   │                                  │
│  ResumeMatcher    │  ┌─ 我的简历 (3) ──────────────┐ │
│  ● 仪表盘         │  │  item · item · item          │ │
│    上传简历       │  └──────────────────────────────┘ │
│    我的 JD        │                                  │
│    充值           │  ┌─ 我的 JD (2) ────────────────┐ │
│                   │  │  item · item                 │ │
│  [积分: 280]      │  └──────────────────────────────┘ │
│  [隐私协议]       │                                  │
│  [138****0000]    │  ┌─ 已保存的简历 (1) ───────────┐ │
│                   │  │  item                       │ │
│                   │  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

- 顺序：简历 → JD → 已生成简历
- 全部默认展开，每区最多显示 5 条
- 空区不隐藏，显示紧凑空态提示
- 全空时显示居中引导 CTA

### 2.2 列表项设计

紧凑单行布局，hover 时显示操作按钮：

```
┌──────────────────────────────────────────────────┐
│ 📄 resume.pdf · 解析完成 · 已分析 2 次 · 05-11   │  [分析] [删除]
└──────────────────────────────────────────────────┘
```

- 文件名/标题 + 状态标签 + 元信息 + 日期
- 操作按钮默认隐藏，hover 时出现（移动端始终可见）
- 状态标签使用 DESIGN.md 语义色

---

## 三、各区详细设计

### 3.1 我的简历区

**数据来源：** `GET /resumes`

| 状态 | 展示 |
|------|------|
| 加载中 | 3 行骨架屏 |
| 空 | "还没有上传简历" + 上传 CTA |
| 有数据 | 紧凑列表，最多 5 条 |
| 错误 | "加载失败" + 重试按钮 |

**交互：**
- 已解析 → 点击跳转 `/analyze/[resumeId]`
- 解析中 → 显示 "解析中" 标签，不可点击
- 解析失败 → 显示 "解析失败" 标签，hover 显示删除
- hover → 显示分析/删除按钮

### 3.2 我的 JD 区

**数据来源：** `GET /jobs`

| 状态 | 展示 |
|------|------|
| 加载中 | 2 行骨架屏 |
| 空 | "还没有创建 JD" + 创建 CTA |
| 有数据 | 紧凑列表，最多 5 条 |
| 错误 | "加载失败" + 重试按钮 |

**交互：**
- 点击标题 → 弹窗显示完整 JD 内容（复用 analyze 页 modal）
- hover → 显示删除按钮

### 3.3 已保存的简历区

**数据来源：** 新增 `GET /saved-resumes`

| 状态 | 展示 |
|------|------|
| 加载中 | 2 行骨架屏 |
| 空 | "还没有保存的简历" + 提示文字 |
| 有数据 | 紧凑列表，最多 5 条 |
| 错误 | "加载失败" + 重试按钮 |

**交互：**
- 点击 → 跳转 `/analyze/[resumeId]?record=[analysisRecordId]`，自动加载该分析记录并展开对比视图
- hover → 无额外操作（编辑在跳转后进行）

---

## 四、交互状态表

| 功能 | LOADING | EMPTY | ERROR | SUCCESS |
|------|---------|-------|-------|---------|
| 简历列表 | 3 行骨架屏 | 居中插图 + 上传按钮 | 重试按钮 | 紧凑列表 |
| JD 列表 | 2 行骨架屏 | 一句话 + 创建链接 | 重试按钮 | 紧凑列表 |
| 已保存简历 | 2 行骨架屏 | 一句话提示 | 重试按钮 | 紧凑列表 |
| JD 详情弹窗 | 骨架屏 | — | — | 完整内容 |
| 全空状态 | — | 居中引导 CTA | — | — |

---

## 五、后端新增接口

### GET /saved-resumes

```
GET /saved-resumes
Headers: { Authorization: Bearer <token> }
Response: {
  items: [{
    analysisRecordId: string,
    resumeId: string,
    resumeFileName: string,
    jdTitle: string,
    jdCompany?: string,
    matchScore: number,
    savedAt: string
  }]
}
```

实现：扫描该用户所有 analysisRecord，筛选 `analysisResult.editedResume` 不为空的记录，返回列表。

---

## 六、响应式

- **桌面端：** 侧边栏 200px + 三区纵向排列
- **移动端：** 底部 Tab 导航 + 三区纵向堆叠，顶部 sticky 锚点快速跳转
- 每区最多 3 条（移动端），超出折叠

---

## 七、设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 三区顺序 | 简历 → JD → 已生成简历 | 上传→分析→生成→留档 的逻辑流 |
| 折叠策略 | 全部默认展开 | 仪表盘是工作台，信息密度优先 |
| 空态策略 | 全空时引导，部分空时紧凑提示 | 新用户有明确 CTA，老用户不被打扰 |
| 列表密度 | 紧凑单行 + hover 展开 | 对齐 DESIGN.md compact 原则 |
| 编辑入口 | 跳转 analyze 页 | 复用已有对比界面 |
| 移动端 | 纵向堆叠 + 锚点 | 保持一致性，避免 Tab 切换 |
| 数据接口 | 新增 GET /saved-resumes | 后端查询效率高，前端简单 |

---

*文档版本：v1.0 — 2026-05-11*

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN (PLAN) | 15 issues, 6 critical gaps |
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | ISSUES_OPEN (PLAN) | score: 3/10 → 7/10, 7 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **UNRESOLVED:** 0 (all decisions resolved in-session)
- **VERDICT:** DESIGN REVIEW PASSED — 7 decisions made, ready for implementation
