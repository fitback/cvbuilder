# 阿里云部署操作指南

> 适用版本：v0.4.1+ | 更新时间：2026-06-03 | 备案前 IP 直连方案

---

## 前置准备

| 事项 | 说明 |
|------|------|
| ECS 实例 | 2C4G，Ubuntu 22.04，40GB ESSD 系统盘 |
| 安全组规则 | 入方向放行：22 (SSH)、80 (HTTP)、443 (HTTPS，备案后用) |
| 本地环境 | 已安装 git，能 SSH 到服务器 |

---

## 第一步：服务器初始化（约 20 分钟）

### 1.1 SSH 登录

```bash
ssh root@<公网IP>
```

### 1.2 安装 Docker

```bash
# 官方一键安装
curl -fsSL https://get.docker.com | bash

# 安装 docker compose 插件
apt install -y docker-compose-plugin

# 验证
docker --version
docker compose version
```

### 1.3 创建目录结构

```bash
mkdir -p /opt/cvbuilder /data/resumes /data/backups /data/payment-qr
```

---

## 第二步：推送代码到服务器（二选一）

### 方式 A：Git 拉取（推荐）

```bash
cd /opt
git clone https://github.com/fitback/cvbuilder2.0 cvbuilder
cd cvbuilder
```

### 方式 B：本地 rsync 推送

```bash
# 在本地执行（排除 node_modules / .next / .git）
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  -e "ssh" /Users/billchen/projects/cvbuilder/ root@<公网IP>:/opt/cvbuilder/
```

---

## 第三步：配置环境变量

在服务器上创建 `/opt/cvbuilder/.env.prod`：

```bash
cat > /opt/cvbuilder/.env.prod << 'EOF'
# ── 数据库（务必修改密码）──
DB_PASSWORD=<生成强密码，至少 16 位>

# ── DeepSeek AI ──
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com

# ── JWT 密钥（用 openssl rand -hex 32 生成）──
JWT_SECRET=<生成随机密钥>

# ── CORS（备案前用 IP，备案后换成域名）──
CORS_ORIGIN=http://<公网IP>

# ── 支付宝（可先留空，上线支付时再填）──
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_NOTIFY_URL=
EOF
```

生成密钥和密码：

```bash
# JWT 密钥
openssl rand -hex 32

# 数据库密码（生成随机 20 位字符串）
openssl rand -base64 20
```

### 3.1 适配 IP 直连的 Nginx 配置

现有配置已经兼容（`server_name _` 匹配所有来源），无需修改。稍后备案完成只需把 `server_name` 换成域名即可。

---

## 第四步：构建并启动（约 10 分钟）

```bash
cd /opt/cvbuilder

# 构建所有镜像（首次较慢，后续 --build 只重建变更层）
docker compose -f docker-compose.prod.yml build

# 后台启动
docker compose -f docker-compose.prod.yml up -d
```

### 4.1 首次启动：初始化管理员

```bash
# 进 backend 容器执行 seed 脚本
docker compose -f docker-compose.prod.yml exec backend \
  npx ts-node packages/backend/seed.ts
```

默认管理员：`13800000000` / `admin123`（上线后务必修改）。

### 4.2 上传付款二维码（可选，支付功能用）

```bash
# 把本地图片传到服务器的支付码目录
scp /path/to/qr-code.png root@<公网IP>:/data/payment-qr/qr-code.png
```

---

## 第五步：验证部署

### 5.1 检查容器状态

```bash
docker compose -f docker-compose.prod.yml ps
```

期望 6 个容器全部 `Up`（healthy）：

| 容器 | 用途 | 端口 |
|------|------|------|
| nginx | 反向代理 | 80 → frontend:3000, backend:3001 |
| frontend | Next.js 前端 | 3000（内网） |
| backend | NestJS API | 3001（内网） |
| worker | 简历解析 | 无 |
| postgres | 数据库 | 5432（内网） |
| redis | 缓存/队列 | 6379（内网） |

### 5.2 浏览器验证

打开 `http://<公网IP>`，确认：
- [ ] 登录页面正常显示（左品牌 + 右表单）
- [ ] 能注册新账号并获得 50 积分
- [ ] 能登录并跳转到仪表盘
- [ ] 健康检查：`http://<公网IP>/api/health`

### 5.3 运行冒烟测试

```bash
# 在服务器上
cd /opt/cvbuilder

# 注意：冒烟脚本默认测试 localhost:3001，需要指定后端地址
SMOKE_URL=http://<公网IP> npm run smoke
```

---

## 第六步：日常运维

### 常用命令

```bash
# 查看所有容器日志
docker compose -f docker-compose.prod.yml logs -f --tail=50

# 查看单个服务日志
docker compose -f docker-compose.prod.yml logs -f --tail=50 backend

# 重启单个服务（例如改完 .env.prod 后）
docker compose -f docker-compose.prod.yml up -d --force-recreate backend

# 更新代码后重新部署
cd /opt/cvbuilder
git pull
docker compose -f docker-compose.prod.yml up -d --build

# 清理旧镜像（节约磁盘）
docker image prune -a -f
```

### 数据库备份

```bash
# 手动备份
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U resume resume_matcher > /data/backups/db_$(date +%Y%m%d).sql

# 定时任务（crontab -e，每天凌晨 3 点）
0 3 * * * cd /opt/cvbuilder && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U resume resume_matcher > /data/backups/db_$(date +\%Y\%m\%d).sql

# 保留最近 7 天（每天 4 点清理）
0 4 * * * find /data/backups -name "db_*.sql" -mtime +7 -delete
```

### 阿里云快照（推荐）

在阿里云控制台开启自动快照策略：每天一次，保留 7 天。万一系统盘故障可回滚。

---

## 备案完成后的切换清单

备案拿到 ICP 号后，做以下 3 步切到域名：

| 步骤 | 操作 |
|------|------|
| 1. DNS 解析 | 添加 A 记录，把域名指向服务器公网 IP |
| 2. 修改 `.env.prod` | `CORS_ORIGIN` 改为 `https://your-domain.com`，重建容器 |
| 3. Nginx + HTTPS | 用 Certbot 获取免费 SSL 证书，Nginx 加 443 配置（见下方） |

### HTTPS 配置参考

```bash
# 安装 certbot
apt install -y certbot python3-certbot-nginx

# 获取证书（Certbot 会自动修改 nginx 配置）
certbot --nginx -d your-domain.com
```

日后证书自动续期：

```bash
# certbot 自带定时任务，手动测试一下
certbot renew --dry-run
```

---

## 故障排查

| 现象 | 检查 |
|------|------|
| 502 Bad Gateway | `docker compose logs backend` 看是否启动失败 |
| 页面空白 | 浏览器 F12 → Network，看 API 请求是否 404。检查 `NEXT_PUBLIC_API_URL=""` 是否正确 |
| AI 分析报错 | `docker compose logs backend` 搜 "DeepSeek"，通常是 API Key 问题 |
| 解析失败 | `docker compose logs worker` 看队列消费状态 |
| 磁盘满了 | `df -h`，清理 Docker 垃圾：`docker system prune -a` |
