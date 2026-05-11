# Ngrok Tunnel 外网访问设计

> Design for exposing the local dev environment to external users via ngrok for testing.

**Goal:** 让外网用户通过 ngrok 隧道访问本地运行的全部服务（前端 + 后端），用于项目启动测试和数据检查。

**Architecture:** ngrok 同时隧道前端(:3000)和后端(:3001)，前端通过 `NEXT_PUBLIC_API_URL` 环境变量指向后端的 ngrok 地址。CORS 配置允许 ngrok 前端域名。

**Tech Stack:** ngrok (free tier), Next.js 环境变量, NestJS CORS

---

## 1. ngrok 配置

一个 yaml 管理两个隧道：

```yaml
# ~/.ngrok2/ngrok.yml
tunnels:
  frontend:
    addr: 3000
    proto: http
  backend:
    addr: 3001
    proto: http
```

启动命令：`ngrok start --all`

## 2. 前端 API URL 集中化

当前 `localhost:3001` 硬编码在以下 11 个文件中：

| 文件 | 用途 |
|------|------|
| `app/dashboard/page.tsx` | 仪表盘数据 |
| `app/analyze/[resumeId]/page.tsx` | 分析页 |
| `app/layout.tsx` | 用户信息 |
| `app/upload/page.tsx` | 上传 |
| `app/jobs/page.tsx` | JD 管理 |
| `app/recharge/page.tsx` | 充值 |
| `app/recharge/history/page.tsx` | 充值记录 |
| `components/PointsBalance.tsx` | 积分显示 |
| `components/PointsModal.tsx` | 积分明细 |
| `components/AuthModal.tsx` | 登录/注册 |
| `components/RechargeApproval.tsx` | 管理员审批 |

**方案：在 `lib/auth.ts` 中集中管理 API base URL**

```typescript
// lib/auth.ts — 新增
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// 现有 apiFetch 保持不变，各文件改用：
import { apiFetch, API_BASE } from "../../lib/auth";
// const res = await apiFetch(`${API_BASE}/resumes`);
```

这样只需改一处默认值，外部访问时设置 `packages/frontend/.env.local`：
```
NEXT_PUBLIC_API_URL=https://<backend-ngrok-url>
```

## 3. CORS

后端 NestJS `main.ts` 需要启用 CORS，允许 ngrok 前端域名：

```typescript
app.enableCors({
  origin: [/\.ngrok-free\.app$/],
  credentials: true,
});
```

本地开发时 `localhost:3000` 也需要保留。

## 4. 启动流程

```
1. docker compose up -d          # PostgreSQL + Redis
2. npm run dev:backend           # NestJS :3001
3. npm run dev:frontend          # Next.js :3000
4. npx ts-node ...parse.worker   # 简历解析 worker
5. ngrok start --all             # 隧道
6. 复制后端 ngrok URL 写入 .env.local，重启前端
```

## 5. 注意事项

- 免费版 ngrok 域名重启会变，每次 `ngrok start --all` 后需检查 URL 是否变化
- 免费版有速率限制（~40 req/min），仅供测试
- 数据库和 Redis 不暴露到外网，仅通过后端 API 间接访问
