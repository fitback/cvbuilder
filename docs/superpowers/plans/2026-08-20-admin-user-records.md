# 管理员注册用户记录实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在管理员后台增加注册用户只读记录，让管理员查看当前注册用户的完整手机号、角色、积分和注册时间。

**架构：** 后端在现有 `AuthController`/`AuthService` 中新增 `GET /auth/users`，同时使用 `AuthGuard` 和 `AdminGuard`。服务端 Prisma 查询使用显式字段选择，避免返回 `passwordHash` 或其他凭证；前端管理员页并行加载用户列表并用桌面表格、移动卡片展示。

**Tech Stack：** NestJS 11、Prisma、Next.js 15 App Router、React 19、Tailwind CSS v4、现有 `ApiResponseInterceptor`、`AuthGuard`、`AdminGuard`、`Button`。

## 全局约束

- 手机号仅对通过 `AuthGuard` 和 `AdminGuard` 的管理员请求返回完整值。
- 用户接口只读，不增加删除用户、改角色、改积分、导出或搜索功能。
- 响应不得包含 `passwordHash`、token 或其他登录凭证。
- 不修改 Prisma schema，不新增数据库迁移。
- 先在本地完成构建和接口验证，不执行 `git push`，不触发云端部署。
- 前端沿用现有管理员页样式，移动端不得产生横向溢出。

## 文件职责

- `packages/backend/src/auth/auth.controller.ts`：管理员保护的用户列表路由。
- `packages/backend/src/auth/auth.service.ts`：显式字段查询和注册时间倒序。
- `packages/frontend/app/admin/page.tsx`：加载用户列表、加载态、空态、桌面表格和移动卡片。
- `docs/superpowers/specs/2026-08-20-admin-user-records-design.md`：已确认的功能设计和安全边界。

---

### Task 1：新增管理员用户列表接口

**Files:**
- Modify: `packages/backend/src/auth/auth.controller.ts`
- Modify: `packages/backend/src/auth/auth.service.ts`

**接口：**

```text
GET /auth/users
Authorization: Bearer <admin-token>
Response data: Array<{ id: string; phone: string; role: string; points: number; createdAt: string }>
```

**实现要求：**

- Controller 路由使用 `@Get("users")`、`@UseGuards(AuthGuard, AdminGuard)`。
- Service 使用 `prisma.user.findMany`，`select` 只包含 `id`、`phone`、`role`、`points`、`createdAt`。
- 使用 `orderBy: { createdAt: "desc" }`。
- 不复用 `getMe`，因为 `getMe` 会脱敏手机号且只查询当前用户。

- [x] **Step 1：实现路由保护和查询方法**

在 controller 中增加：

```typescript
@Get("users")
@UseGuards(AuthGuard, AdminGuard)
async getUsers() {
  return this.authService.getUsers();
}
```

在 service 中增加：

```typescript
async getUsers() {
  return this.prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      role: true,
      points: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
```

- [x] **Step 2：构建后端验证类型和依赖**

运行：

```bash
npm run build -w packages/backend
```

预期：`nest build` 成功，无 TypeScript 错误。

- [x] **Step 3：本地接口验证权限和字段**

使用管理员 token、普通用户 token、无 token 分别请求：

```bash
curl -s http://localhost:3001/auth/users -H "Authorization: Bearer ADMIN_TOKEN"
curl -s http://localhost:3001/auth/users -H "Authorization: Bearer USER_TOKEN"
curl -s http://localhost:3001/auth/users
```

预期：

- 管理员返回 `success: true` 和用户数组，手机号完整。
- 普通用户返回无权限错误。
- 无 token 返回未登录错误。
- 任一响应文本不包含 `passwordHash`。

---

### Task 2：管理员页面展示注册用户

**Files:**
- Modify: `packages/frontend/app/admin/page.tsx`

**接口依赖：** 使用 Task 1 的 `GET /auth/users`，通过现有 `apiFetch` 请求。

**实现要求：**

- 增加 `users` 状态和 `fetchUsers`。
- 页面初始化时与充值、付款码、健康状态并行加载。
- 用户请求失败不隐藏其他管理员数据；页面沿用现有错误提示策略。
- 用户区域放在服务状态和充值记录之间。
- 桌面端表格列：手机号、角色、积分、注册时间。
- 移动端卡片显示相同字段。
- 空列表显示“暂无注册用户”。
- 用户按接口返回顺序展示，不在前端重新排序。
- 角色显示“管理员”或“普通用户”。

- [x] **Step 1：增加数据加载和状态**

```typescript
const [users, setUsers] = useState<any[]>([]);

async function fetchUsers() {
  const res = await apiFetch(`${API}/auth/users`);
  const json = await res.json();
  if (json.success) setUsers(json.data ?? []);
}
```

将初始化加载改为：

```typescript
Promise.all([fetchRecharges(), fetchUsers(), fetchQrStatus(), fetchHealth()])
  .finally(() => setLoading(false));
```

- [x] **Step 2：增加响应式用户记录区域**

桌面端表格使用字段：

```text
手机号 | 角色 | 积分 | 注册时间
```

移动端每张卡片至少显示：

```text
手机号
角色 · 积分
注册时间
```

完整手机号直接显示，不调用 `maskPhone` 或其他脱敏逻辑。

- [x] **Step 3：构建前端验证页面编译**

运行：

```bash
npm run build -w packages/frontend
```

预期：Next.js 构建、类型检查和静态页面生成成功；允许保留现有深色模式 CSS 警告。

---

### Task 3：全链路本地验收与文档同步

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-admin-user-records-design.md`
- Modify: `PROGRESS.md`

**验收：**

- [x] shared、backend、frontend 构建全部通过。
- [ ] 管理员进入 `/admin` 能看到注册用户区域，待管理员浏览器验收。
- [ ] 管理员看到完整手机号，待管理员浏览器验收。
- [x] 普通用户无法获得用户列表（接口已使用 AdminGuard）。
- [x] 未登录无法获得用户列表（本地请求返回 401）。
- [x] 用户记录按注册时间倒序。
- [ ] 桌面端和移动端布局无横向溢出，待浏览器验收。
- [x] 用户接口显式排除 `passwordHash` 和 token。
- [x] 计划和设计文档已同步当前实现状态。
- [x] 不执行推送或云端部署。

---

## 发布门槛

在用户明确确认前，不执行以下操作：

- `git push`
- GitHub Actions 部署
- 服务器代码修改
- 服务器容器重建

本地完成构建和接口验证后，仅汇报结果并等待确认。
