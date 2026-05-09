# ResumeMatcher

面向国内求职者的简历优化与岗位匹配平台。

## 功能

- 上传简历（PDF/Word），AI 自动解析结构化信息
- 创建岗位描述（JD），AI 分析简历与岗位的匹配度
- 查看匹配度分数、核心解码、优化建议、排雷清单

## 前置条件

- Node.js >= 22
- Docker Desktop（或 Colima / OrbStack）
- DeepSeek API key（[获取地址](https://platform.deepseek.com)）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动 PostgreSQL 和 Redis
docker compose up -d

# 3. 初始化数据库
npm run db:push -w packages/backend

# 4. 配置环境变量
cp packages/backend/.env .env.example
# 编辑 .env，填入你的 DEEPSEEK_API_KEY

# 5. 启动后端（端口 3001）
npm run dev:backend

# 6. 新开终端，启动前端（端口 3000）
npm run dev:frontend
```

访问 http://localhost:3000

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15 + Tailwind CSS |
| 后端 | NestJS 11 |
| 数据库 | PostgreSQL 16 |
| 队列 | BullMQ + Redis |
| AI | DeepSeek (deepseek-chat) |

## 项目结构

```
packages/
├── shared/      共享 TypeScript 类型
├── backend/     NestJS API 服务
└── frontend/    Next.js 前端
```

完整技术设计见 `TECH-DESIGN.md`，设计系统见 `DESIGN.md`。
