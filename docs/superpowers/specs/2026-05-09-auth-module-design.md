# Auth Module Design

## Context

当前使用匿名 session cookie 区分用户，无真实登录。需增加手机号+密码认证，同时兼容现有 session 方案过渡。

## Architecture

```
POST /auth/register    — 手机号 + 密码注册，返回 JWT
POST /auth/login       — 手机号 + 密码登录，返回 JWT
GET  /auth/me          — 获取当前用户信息（需 JWT）
```

## Data Model

新增 `User` 表。现有表暂不改变 sessionId 字段，兼容期间两者共存。

```prisma
model User {
  id           String   @id @default(uuid())
  phone        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## JWT Strategy

- 登录/注册后签发 JWT access token，有效期 7 天
- 前端存 localStorage，每次请求带 `Authorization: Bearer <token>`
- 不引入 refresh token（MVP 够用）

## AuthGuard — 兼容模式

```
请求 → 取 Authorization header
     → 有 JWT → 验证通过 → req.userId = xxx
     → 无 JWT → 取 session_id cookie → 保持现有逻辑 req.sessionId = xxx
```

各业务 controller 通过 guard 注入的 userId（已登录）或 sessionId（匿名）查询数据。

## Frontend

- 顶部导航栏增加用户状态
- 未登录：显示"登录/注册"按钮
- 已登录：显示手机号脱敏（如 138****1234）
- 登录/注册：模态框，支持切换登录/注册 tab
- 所有 fetch 自动附带 Authorization header

## Security

- bcrypt 哈希（cost=10）
- 手机号格式校验（11 位中国大陆手机号 `/^1[3-9]\d{9}$/`）
- 密码最少 6 位
- JWT secret 从环境变量读取

## Files to Create/Modify

### Backend (new files)
- `packages/backend/src/auth/auth.module.ts`
- `packages/backend/src/auth/auth.controller.ts`
- `packages/backend/src/auth/auth.service.ts`
- `packages/backend/src/auth/auth.guard.ts`
- `packages/backend/src/auth/jwt.strategy.ts`

### Backend (modified files)
- `packages/backend/prisma/schema.prisma` — 新增 User model
- `packages/backend/src/app.module.ts` — 注册 AuthModule
- `packages/backend/src/resumes/*` — guard 切换为 AuthGuard
- `packages/backend/src/jobs/*` — guard 切换为 AuthGuard
- `packages/backend/src/analyze/*` — guard 切换为 AuthGuard

### Frontend (new files)
- `packages/frontend/app/login/page.tsx` — 登录/注册模态框组件
- `packages/frontend/lib/auth.ts` — token 管理工具

### Frontend (modified files)
- `packages/frontend/app/layout.tsx` — 顶部栏加用户状态
- `packages/frontend/app/*/page.tsx` — fetch 加 Authorization header

## Dependencies

- `@nestjs/jwt` — JWT 签发和验证
- `@nestjs/passport` / `passport-jwt` — JWT 策略
- `bcryptjs` — 密码哈希（纯 JS，无需编译）
