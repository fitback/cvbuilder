# ResumeMatcher 部署迁移方案

> **文档版本：** v0.4.0
> **更新日期：** 2026-05-28
> **状态：** 待实施
> **前置版本：** [TECH-DESIGN.md](../TECH-DESIGN.md) (v1.0 MVP)

---

## 版本更新记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v0.1.0 | 2026-05-09 | 项目初始化，本地 Docker 部署 |
| v0.2.0 | 2026-05-16 | 简历分析/生成流程、积分系统上线 |
| v0.3.0 | 2026-05-23 | 首页改版、登录流程优化、管理员支付二维码管理 |
| v0.4.0 | 2026-05-28 | **部署迁移方案：本地 → 生产环境** |

---

## 一、方案总览

提供两套部署方案。

| 维度 | 方案 A（推荐）：阿里云单机 | 方案 B：多云免费 |
|------|---------------------------|-----------------|
| **部署方式** | Docker Compose 一键启动 | 4 个平台分别配置 |
| **改代码量** | **零**（和现在完全一样） | 中等（文件存储、Puppeteer、Worker 等需改造） |
| **月费** | ¥60-100（2C4G ECS） | $0（免费额度内） |
| **国内访问** | 快（国内机房） | 一般（香港节点） |
| **运维** | 自己管服务器 Docker | 零运维，全托管 |
| **数据库** | 服务器上 Docker PG 容器 | Supabase 托管，Web Dashboard |
| **备份** | 自己写 cron 定时备份 | Supabase 每天自动 + Upstash 持久化 |
| **HTTPS/域名** | 配 Nginx + Let's Encrypt | Vercel 自带 |
| **CI/CD** | GitHub Actions + rsync | `git push` 自动部署 |
| **上线周期** | 半天（买服务器 → 配域名 → 部署） | 2-3 天（代码改造 + 4 平台配置） |
| **扩展性** | 升级配置或加机器 | 各平台自动弹性 |

**推荐方案 A**：你们业务面向国内用户，阿里云国内机房访问快，且和现在开发环境一模一样，零改造直接部署。

---

## 二、方案 A：阿里云单机部署（推荐）

### 2.1 架构

```
阿里云 ECS (2C4G, Ubuntu 22.04)

┌─────────────────────────────────────────────────────┐
│  Nginx (:80/:443)                                    │
│  - 反向代理 → frontend:3000, backend:3001            │
│  - HTTPS (Let's Encrypt)                             │
│  - gzip 静态资源                                     │
├─────────────────────────────────────────────────────┤
│  Docker Compose                                      │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐   │
│  │ Frontend │ │ Backend  │ │ Worker │ │ Nginx  │   │
│  │ :3000    │ │ :3001    │ │        │ │ proxy  │   │
│  └──────────┘ └──────────┘ └────────┘ └────────┘   │
│  ┌──────────┐ ┌──────────┐                          │
│  │ Postgres │ │  Redis   │                          │
│  │ :5432    │ │  :6379   │                          │
│  └──────────┘ └──────────┘                          │
├─────────────────────────────────────────────────────┤
│  /data/resumes/     ← Docker Volume 持久化           │
│  /data/backups/     ← 定时备份                       │
└─────────────────────────────────────────────────────┘
```

### 2.2 费用估算

| 项目 | 配置 | 月费 |
|------|------|------|
| ECS 实例 | 2C4G，40GB ESSD | ¥60-80 |
| 域名 | `.com` / `.cn` | ¥5-10/月（年付） |
| 快照备份 | 每天自动快照 | ¥10-20 |
| **合计** | | **¥75-110/月** |

> 新用户首年 ECS 有 3 折优惠，实际可能更低。

### 2.3 需要的改造

**零代码改动。** 仅需新增两个配置文件和一份部署脚本。

| 新增文件 | 用途 |
|----------|------|
| `docker-compose.prod.yml` | 生产环境 Docker 编排（已部分存在，微调） |
| `nginx/nginx.conf` | Nginx 反向代理 + HTTPS 配置 |
| `deploy.sh` | 一键部署脚本 |

### 2.4 部署步骤

#### 第一步：服务器初始化（30 分钟）

```bash
# 1. 买阿里云 ECS，选 Ubuntu 22.04，2C4G，开启 22/80/443 端口

# 2. SSH 登录，装 Docker
ssh root@<服务器IP>
curl -fsSL https://get.docker.com | bash
apt install docker-compose-plugin -y

# 3. 创建目录结构
mkdir -p /opt/cvbuilder /data/resumes /data/backups
```

#### 第二步：推送代码 & 构建（10 分钟）

```bash
# 本地构建并推送镜像（或直接在服务器上 clone + build）
git clone https://github.com/fitback/cvbuilder2.0 /opt/cvbuilder
cd /opt/cvbuilder

# 构建
docker compose -f docker-compose.prod.yml build
```

#### 第三步：配置环境变量（10 分钟）

```bash
# 在服务器上创建 .env.prod
cat > /opt/cvbuilder/.env.prod << 'EOF'
# 数据库
DATABASE_URL=postgresql://resume:resume_prod_xxx@postgres:5432/resume_matcher

# Redis
REDIS_URL=redis://redis:6379

# AI
DEEPSEEK_API_KEY=sk-xxxxx
DEEPSEEK_MODEL=deepseek-chat

# JWT
JWT_SECRET=your-production-secret-key

# 文件存储
RESUME_STORAGE_PATH=/data/resumes

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# CORS
CORS_ORIGIN=https://your-domain.com

# 前端 API
NEXT_PUBLIC_API_URL=https://your-domain.com
EOF
```

#### 第四步：配置 Nginx + HTTPS（15 分钟）

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 第五步：一键启动

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 2.5 CI/CD（GitHub Actions 自动部署）

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Alibaba Cloud
        uses: easingthemes/ssh-deploy@v4
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
          REMOTE_HOST: ${{ secrets.HOST }}
          REMOTE_USER: root
          TARGET: /opt/cvbuilder
          SCRIPT_AFTER: |
            cd /opt/cvbuilder
            docker compose -f docker-compose.prod.yml up -d --build
```

### 2.6 备份策略

```bash
# 数据库每天凌晨 3 点备份
0 3 * * * docker exec cvbuilder-postgres-1 pg_dump -U resume resume_matcher > /data/backups/db_$(date +\%Y\%m\%d).sql

# 保留最近 7 天的备份
0 4 * * * find /data/backups -name "db_*.sql" -mtime +7 -delete
```

### 2.7 监控

- **基础监控**：阿里云控制台自带 CPU/内存/磁盘/网络监控，免费
- **告警**：CPU > 80% 或磁盘 > 85% 时短信通知
- **日志**：`docker compose logs -f --tail=100` 查看各服务日志

---

## 三、方案 B：多云免费部署

### 3.1 架构

```
                         ┌──────────────────────────┐
                         │       Vercel (免费)        │
                         │   Next.js Frontend        │
                         │   - CDN + HTTPS            │
                         └────────────┬─────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Fly.io (免费 3 × 256MB VM)                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐     │
│  │  NestJS API              │  │  Worker (BullMQ)         │     │
│  └────────────┬─────────────┘  └────────────┬─────────────┘     │
└───────────────┼─────────────────────────────┼────────────────────┘
                │                             │
        ┌───────┴────────┐           ┌────────┴──────────┐
        ▼                ▼           ▼                   ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Supabase    │ │  Upstash     │ │  Supabase    │ │  DeepSeek    │
│  PostgreSQL  │ │  Redis       │ │  Storage     │ │  API         │
│  (500MB 免费)│ │  (256MB 免费)│ │  (1GB 免费)  │ │  (外部)      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### 3.2 费用

| 平台 | 用途 | 免费额度 | 预计月费 |
|------|------|----------|----------|
| Vercel | 前端 + CDN | 100GB 带宽/月 | $0 |
| Fly.io | 后端 + Worker | 3 × 256MB VM | $0 |
| Supabase | PostgreSQL + 文件存储 | 500MB DB + 1GB 存储 | $0 |
| Upstash | Redis | 256MB + 10K 请求/日 | $0 |
| DeepSeek | AI 调用 | 无 | 按量付费 |
| **合计** | | | **$0 + AI 费用** |

### 3.3 需要的改造

相比方案 A 多出以下代码改造：

| 模块 | 改动 | 预估 |
|------|------|------|
| 文件存储 | 本地磁盘 → Supabase Storage SDK | 0.5 天 |
| PDF 导出 | 系统 Chrome → `@sparticuz/chromium` | 0.5 天 |
| Worker | 独立进程 → Fly.io 独立 Service | 0.5 天 |
| 环境变量 | 分散到 4 个平台配置 | 0.5 天 |
| 联调测试 | 跨平台网络、CORS、SSL | 1 天 |

### 3.4 各平台配置要点

**Vercel**：
```json
{
  "buildCommand": "npm run build -w packages/shared && npm run build -w packages/frontend",
  "outputDirectory": "packages/frontend/.next"
}
```

**Fly.io**：
```toml
app = "cvbuilder"
primary_region = "hkg"

[build]
  image = "node:24-alpine"

[processes]
  api = "node packages/backend/dist/main.js"
  worker = "node packages/backend/dist/resumes/parse.worker.js"

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"
```

**Supabase**：创建项目 → 获取 `DATABASE_URL` → 创建 `resumes` 和 `payment-qr` 两个 Storage Bucket → 配置 RLS 策略。

**Upstash**：创建 Redis 实例 → 获取 `REDIS_URL`（含密码）→ BullMQ 零改动。

---

## 四、方案选择建议

```
面向国内用户？ ──是──→ 方案 A（阿里云单机）

否
 │
 ├── 用户量 < 100？ ──是──→ 方案 B（多云免费）
 │
 └── 有运维能力？ ──是──→ 方案 A
        │
        否 → 方案 B
```

你们的情况：面向国内求职者，国内访问速度是刚需。**建议方案 A。**

---

## 五、后续规划

| 阶段 | 内容 |
|------|------|
| v0.5.0 | 支付接入、域名备案 |
| v0.6.0 | 静态资源上 CDN、数据库迁移阿里云 RDS |
| v1.0.0 | 正式上线，收费定价 |

---

*文档版本：v0.4.0 — 2026-05-28*
