# 安全加固设计方案：缓存 + 防爬虫 + 防 DDoS

> 版本：v1.0
> 日期：2026-07-29
> 策略：小项目低成本方案（nginx + 应用层自建，无外部付费服务）

---

## 一、背景与目标

### 当前状态

| 领域 | 现状 | 风险 |
|------|------|------|
| 缓存 | 几乎为零，仅 QR 图片有 Cache-Control | 所有请求穿透到后端，DB 和 AI API 无保护 |
| 安全头 | 无 helmet、CSP、HSTS、X-Frame-Options | 常见 Web 攻击面未关闭 |
| 限流 | 全局 60/min IP 限流，仅 3 个路由有 @Throttle | 换代理可绕过，大量路由无保护 |
| 输入校验 | 仅 RegisterDto 有 class-validator | 无效/恶意请求打到业务逻辑 |
| 防爬虫 | 零防护，登录注册无验证码 | 批量注册、撞库、岗位数据抓取 |
| 防 DDoS | nginx 纯透传，无任何限制 | 任何 IP 可以打满连接和请求 |

### 目标

在不大幅增加成本的前提下，建立三层防线：

```
用户 → nginx（限流/缓存/连接控制）
         → NestJS 全局（安全头/请求校验/用户维度限流）
              → 路由级（Turnstile 验证码/Redis 缓存/BullMQ 限流）
```

---

## 二、nginx 层防护

### 2.1 限流区域定义

```nginx
# 全局 API 限流：单 IP 30 次/秒
limit_req_zone  $binary_remote_addr zone=api_global:10m rate=30r/s;
# 登录注册更严格：单 IP 3 次/分钟
limit_req_zone  $binary_remote_addr zone=api_auth:10m   rate=3r/m;
# 连接数限制
limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;
```

### 2.2 缓存路径

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:100m
                 max_size=1g inactive=60m;
```

### 2.3 全局限制

| 参数 | 值 | 说明 |
|------|-----|------|
| `client_max_body_size` | 6m | 略大于 multer 5MB 限制 |
| `client_body_timeout` | 10s | 防慢速 body 攻击 |
| `client_header_timeout` | 10s | 防慢速 header 攻击 |

### 2.4 路由级配置

| location | 限流 | 连接限制 | 缓存 |
|----------|------|----------|------|
| `/api/` | `30r/s + burst=15` | `conn_per_ip=20` | GET 5s |
| `/api/auth/` | `3r/m + burst=2` | `conn_per_ip=5` | 无 |
| `/_next/static/` | 无 | 无 | 30d |

### 2.5 缓存策略

- GET 请求：5 秒短缓存，`proxy_cache_key` 包含 Authorization header（区分不同用户）
- POST/PUT/DELETE：自动跳过缓存（`proxy_cache_methods GET HEAD` 只缓存 GET/HEAD）
- `_next/static/`：30 天长缓存（文件带 content hash）

---

## 三、应用层：安全头 + 全局校验

### 3.1 Helmet

```typescript
// main.ts
import helmet from "helmet";
app.use(helmet({
  contentSecurityPolicy: false,   // Next.js 自己管理
  crossOriginEmbedderPolicy: false,
}));
```

自动添加的安全头：

| Header | 值 |
|--------|-----|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| X-XSS-Protection | 1; mode=block |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| X-DNS-Prefetch-Control | off |
| Referrer-Policy | no-referrer |

### 3.2 全局 ValidationPipe

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // 自动剔除 DTO 未声明的字段
  forbidNonWhitelisted: true,   // 未声明字段直接 400
  transform: true,
}));
```

### 3.3 DTO 校验清单

| DTO | 路由 | 校验规则 |
|-----|------|----------|
| `LoginDto` | `POST /auth/login` | phone: `@Matches(/^1[3-9]\d{9}$/)`, password: `@IsString() @Length(1, 64)`, turnstileToken: `@IsString()` |
| `RegisterDto` | `POST /auth/register` | phone: `@Matches(...)`, password: `@Length(6, 64)`, turnstileToken: `@IsString()` |
| `AnalyzeDto` | `POST /analyze` | resumeId: `@IsUUID()`, jobDescriptionId: `@IsUUID()` |
| `GenerateDto` | `POST /generate` | analysisRecordId: `@IsUUID()` |
| `ExportDto` | `POST /export/pdf` `/export/docx` | markdown: `@IsString() @Length(1, 50000)` |
| `CreateJobDto` | `POST /jobs` | title: `@Length(1, 200)`, description: `@Length(1, 10000)` |
| `RechargeOrderDto` | `POST /recharges/orders` | amount: `@IsIn([10, 20, 50])` |

---

## 四、限流升级

### 4.1 UserAwareThrottlerGuard

```typescript
// packages/backend/src/common/throttler/user-aware-throttler.guard.ts
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.userId;
    if (userId) return `user:${userId}`;
    return `ip:${req.ip}`;
  }
}
```

### 4.2 限流配置总表

| 路由 | 方法 | 限流 | 备注 |
|------|------|------|------|
| `/auth/login` | POST | 5/min + Turnstile | 防撞库 |
| `/auth/register` | POST | 5/min + Turnstile | 防批量注册 |
| `/resumes/upload` | POST | 10/min | 文件上传 |
| `/analyze` | POST | 10/min | AI 调用 |
| `/generate` | POST | 10/min | AI 调用 |
| `/export/pdf` | POST | 5/min | Puppeteer |
| `/export/docx` | POST | 5/min | DOCX 生成 |
| `/resumes/:id` | DELETE | 10/min | 删简历 |
| `/jobs/:id` | DELETE | 10/min | 删岗位 |
| `/recharges/notify` | POST | 10/min | 支付宝回调 |
| 全部 | 全局 | 60/min | UserAwareThrottlerGuard |

---

## 五、缓存体系

### 5.1 CacheService

```typescript
// packages/backend/src/common/cache/cache.service.ts
@Injectable()
export class CacheService {
  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    const data = await factory();
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }

  async del(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length) await this.redis.del(keys);
  }
}
```

### 5.2 缓存策略

| 接口 | TTL | 缓存 Key | 失效触发 |
|------|-----|----------|----------|
| `GET /jobs` | 30s | `cache:jobs:list:{userId}` | POST/PUT/DELETE /jobs |
| `GET /jobs/:id` | 60s | `cache:jobs:{id}` | PUT/DELETE /jobs/:id |
| `GET /analyze/saved` | 30s | `cache:analyze:list:{userId}` | POST /analyze |
| `GET /points/balance` | 5s | `cache:points:{userId}` | 积分变动操作 |
| `GET /resumes` | 10s | `cache:resumes:list:{userId}` | POST/DELETE /resumes |

### 5.3 缓存层级

```
请求 → nginx proxy_cache (5s, GET only)
         → Redis CacheService (5-60s, 业务级)
              → PostgreSQL
```

两层缓存互补：nginx 扛瞬时重复请求，Redis 缓存业务语义数据。

---

## 六、防爬虫：Cloudflare Turnstile

### 6.1 前端

登录和注册表单各加一个 Turnstile widget：

```tsx
import Turnstile from "react-turnstile";

<Turnstile
  sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
  onVerify={(token) => setTurnstileToken(token)}
  onExpire={() => setTurnstileToken(null)}
  theme="light"
/>
```

### 6.2 后端

```typescript
// auth.service.ts
private async verifyTurnstile(token: string): Promise<boolean> {
  const resp = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(process.env.TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
    }
  );
  const data = await resp.json();
  return data.success === true;
}
```

### 6.3 费用

Cloudflare Turnstile 完全免费，无请求次数限制。

---

## 七、BullMQ 队列保护

```typescript
// parse-queue.provider.ts
export const parseQueue = new Queue("resume-parse", {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { delay: 2000, type: "exponential" },
  },
  limiter: {
    max: 5,        // 每分钟最多 5 个
    duration: 60000,
  },
});
```

配合 worker `concurrency: 2`，形成两层保护。

---

## 八、环境变量汇总

新增环境变量（`.env` 和 `.env.prod` 都需要）：

```bash
# Cloudflare Turnstile
TURNSTILE_SITE_KEY=0x4AAAAAA...     # 前端使用
TURNSTILE_SECRET_KEY=0x4AAAAAA...   # 后端使用（保密）
```

---

## 九、实施优先级

按依赖关系分 3 批：

**第 1 批（nginx + 安全头）**：1.1 1.2 1.3 2.1 2.2 — 零业务代码侵入

**第 2 批（应用层限流 + 校验）**：2.3 3.1 3.2 6.1 — 代码改动 + 配置

**第 3 批（缓存 + 验证码）**：4.1 4.2 5.1 5.2 — 需要注册 Turnstile

每一批独立可测试、可上线。
