# ResumeMatcher 项目进展

> 最后更新：2026-09-08
> 当前版本：v0.9.0

---

## 一、项目状态总览

| 维度 | 状态 |
|------|------|
| 核心功能 | ✅ 可用 |
| 生产构建 | ✅ 三包通过 |
| 部署方案 | ✅ CI/CD 完成，服务器已关联 |
| 安全加固 | ✅ 已完成（v0.5.2 缓存 + 防爬虫 + 防 DDoS） |
| UI/UX 体验 | 🟡 持续优化中（v0.6.0） |
| 新用户引导 | ✅ 仪表盘 3 步流程 |
| 分析页交互 | ✅ 信息层级重组 + 可操作清单 |
| 编辑器体验 | ✅ 分屏、自动保存、预览导出 |
| 支付集成 | ✅ 支付宝电脑网站支付已集成并实测通过 |
| 域名 + HTTPS | ✅ `cvbuilder.ltd` + Let's Encrypt 证书 |
| 测试覆盖 | ✅ 35 个单元测试（v0.8.0） |
| 上线准备 | ✅ 核心功能已上线可用 |

---

## 二、版本变更记录

| 版本 | 日期 | 内容 |
|------|------|------|
| v0.1.0 | 2026-05-09 | 项目初始化，Docker 本地部署，认证/简历/JD CRUD |
| v0.2.0 | 2026-05-16 | AI 分析/生成流程、积分系统上线 |
| v0.3.0 | 2026-05-23 | 首页改版、登录流程优化、管理员后台 |
| v0.4.0 | 2026-05-28 | DOCX 导出、解析/编辑流、积分规则调整、部署方案 |
| v0.4.1 | 2026-06-02 | 安全加固、健康检查、UI/UX 全面优化 |
| v0.4.2 | 2026-06-06 | CI/CD 流水线、GitHub Actions 手动部署、服务器 git 同步 |
| v0.5.0 | 2026-06-15 | 支付宝电脑网站支付、域名备案、HTTPS 全站部署 |
| v0.5.1 | 2026-06-25 | 修复严重安全漏洞（未登录可访问受保护页面）+ CORS 多源支持 |
| v0.5.2 | 2026-07-29 | 安全加固：缓存体系 + 防爬虫（Turnstile）+ 防 DDoS（nginx 限流/helmet/ValidationPipe） |
| v0.6.0 | 2026-07-29 | UI/UX 全面优化 + 安全加固冲刺 P0/P1 |
| v0.6.1 | 2026-08-13 | 生产修复：HTTPS 恢复、备案号上线、部署流水线加固、会话过期处理 |
| v0.7.0 | 2026-08-20 | 本地 UI/UX 后续优化、管理员注册用户记录、开发构建缓存隔离 |
| v0.7.1 | 2026-08-21 | 移除手动付款码上传、部署超时加固；充值保持电脑网站支付（page.pay，当面付为实体店场景不适用） |
| v0.8.0 | 2026-09-08 | 简历版本系统（20 条快照/恢复/跨用户隔离）+ 编辑器易用性重构（折叠/标签技能/完整度/时间规范化/sticky 保存栏）+ 经历排序 bug 修复（解析层+展示层双重排序，最新在前）+ 35 个单元测试（支付幂等/积分扣减/缓存/限流/版本快照）+ JWT 弱密钥启动校验 + pending 充值 24h 自动过期 + 复合索引 + optimizePackageImports ✅ 已上线 |
| v0.9.0 | 2026-09-08 | 可观测性：Pino 结构化 JSON 日志（dev 用 pino-pretty，prod JSON）+ requestId 串联每请求 + /metrics Prometheus 端点（process 指标 + 业务 gauge：resume/analysis/recharge/user 计数 + BullMQ 队列深度）+ AllExceptionsFilter 全局异常结构化日志（warn 业务错误 / error 未捕获异常，含 requestId/method/url/userId） |

### v0.6.0 详细变更

**安全加固冲刺**
- CacheService `KEYS` → `SCAN` 非阻塞迭代器重写
- main.ts 启动时检查 `TURNSTILE_SECRET_KEY` 环境变量
- `.gitignore` + `git rm --cached` 清理 `.claude-flow/`
- 全局 `as any` 类型清理（backend 18 处 + frontend 2 处全部消除）
- 日志脱敏：`maskPhone()` 统一脱敏 phone 字段
- Puppeteer 持久化：单浏览器实例 + 错误恢复 + `onApplicationShutdown` 关闭

**UI/UX 优化批次 1（P0）**
- Dashboard + Jobs 删除按钮移动端常显
- Toast 定位移动端 `top-4` 避开底部导航
- 全局键盘快捷键：`Ctrl+S` 保存、`Ctrl+Enter` 分析/生成
- Admin 充值记录表移动端 `<768px` 卡片化
- Dashboard 概览统计卡片（简历/岗位/生成数，可点击跳转）

**UI/UX 优化批次 2（P1）**
- 简历编辑分屏实时预览：左表单右 A4 渲染，点击「分屏」切换
- 分析页 Sticky 分数栏 + 建议进度条（百分比 + 动画） + 排雷按风险分组 + 生成按钮渐入动画

**UI/UX 优化批次 3（P1）**
- 建议追踪持久化：`localStorage` 读写作废刷新保持状态
- 解析中骨架细化：6-8 条模拟骨架表单（基本信息/工作经历/项目经历/教育背景/专业技能）+ 旋转加载指示

**UI/UX 优化批次 4（P2）**
- 导航 badge：仪表盘红点 30s 轮询解析中状态
- 触控优化：iOS 输入框 `font-size: 16px` 防 zoom + 按钮 44px 最小触控区域
- 上传页拖拽反馈：文件类型图标、即时校验、breathe 呼吸动画

**UI/UX 优化批次 5（P3）**
- 动效系统：staggerIn 列表入场动画、backdrop-blur-sm 弹窗模糊、AnimatedNumber 数字过渡
- 空状态优化：Jobs/Dashboard Generated/Admin 空状态 SVG 插画 + 更紧密引导文案
- 全局保存状态指示器：sidebar 底部保存状态栏，通过 custom event 联动编辑页

**UI/UX 优化批次 6（P3）**
- 暗色模式：Tailwind v4 `@custom-variant dark`，class-based 切换，prefers-color-scheme 默认跟随系统
- 侧栏+底栏暗色切换按钮，localStorage 持久化偏好

### v0.6.1 详细变更

**HTTPS 事故修复（2026-08-13）**
- 根因：443 SSL server 块从未提交进 git（仅存在于 6 月运行的 nginx 容器内），容器重建后丢失，HTTPS 静默中断
- 修复：`nginx/nginx.conf` 补 443 server 块（Let's Encrypt 证书、TLS1.2/1.3、HTTP/2）+ 80 端口 HTTP→HTTPS 重定向；`/api/health` 保留 HTTP 可达（CI 健康检查依赖）
- 部署流水线加固（3 项，均在 `cvbuilder2.0` main）：
  - SSH 命令超时 10m→30m、job 超时 25m→45m（后端镜像构建重，10 分钟超时导致部署失败 + 孤儿构建拖垮服务器）
  - **先停全部容器再构建**（小配置 ECS 构建时资源争抢导致整站卡死；构建完成自动全部拉起）
  - 健康检查重试 12→24 次（容忍冷启动）
- 备案号上线：首页底部「沪ICP备2026028917号-1」+ 链接 beian.miit.gov.cn
- 前端修复：
  - `apiFetch` 全局 401 处理：token 过期自动清除 + `auth-expired` 事件跳转登录页（此前过期会话控制台刷 401）
  - `getErrorMessage` 具体信息优先（注册已存在手机号正确显示「该手机号已注册」而非笼统提示）
  - 新增 `app/icon.svg` favicon（此前每次页面加载 404）
- 积分不足流程修复：QUOTA_EXCEEDED 分支补 step 复位——取消充值弹窗后回到分析结果页/选 JD 页，不再卡在「AI 正在生成简历」假状态
- 登录状态修复（双重根因）：
  - nginx：`/api/auth/me` 移出登录防爆破限流桶（3r/m 误伤了每次页面加载都调用的 me 查询，503 后侧边栏退化为「登录/注册」），改用通用限流 + 5s 按用户缓存
  - 前端：侧边栏导航（桌面 + 移动端）`<a>` → `<Link>` 客户端导航，不再整页刷新（也消除了登录状态闪烁）
- 登录跳转修复（08-14）：`<Link>` 预取把未登录时的 307 重定向缓存进 Next.js 路由缓存，导致登录后 `router.push("/dashboard")` 命中缓存留在首页（需刷新才跳转）；修复：侧边栏 Link 加 `prefetch={false}` + 中间件重定向响应加 `Cache-Control: no-store` 双保险
- 退出登录修复（08-14）：积分显示板挂载条件补 `loggedIn` 检查——此前退出后 `userRole` 重置为 `""` 仍满足 `!== "admin"`，积分板残留旧余额直到刷新（同时消除登录页的 401 控制台噪音）

### v0.4.1 详细变更

**安全与工程质量**
- 请求限流（全局 60/分，登录注册 5/分，分析/生成/上传 10/分）
- 上传 Magic bytes 校验 + 空文件/扩展名伪造检测
- 管理员种子从环境变量读取（ADMIN_PHONE/ADMIN_PASSWORD）
- 环境变量密钥审计，确认不进仓库
- `npm run check:mvp` 发布检查命令
- E2E 冒烟脚本 `scripts/smoke-test.sh`（17 个检查点）
- 废弃代码清理（RechargeApproval 组件、旧 DTO、审批接口）
- 统一错误码中文提示（`lib/error-codes.ts`）

**新用户引导**
- 仪表盘空状态改为 3 步流程入口：上传简历 → 创建岗位 → 开始分析
- 根据状态自动切换主按钮：无简历时「上传第一份简历」、有简历无 JD 时「创建目标岗位」、两者都有时「开始分析」
- 步骤指示器：完成打勾、当前高亮、待办灰色

**分析页信息层级重组**
- 顶部栏：简历名 + 目标岗位 + 历史分析按钮
- 没有结果时：JD 选择 + 分析按钮居中突出
- 有结果时：匹配度分数（左分数右说明）→ 岗位要求 → 优化操作清单 → 排雷清单 → 生成按钮
- 历史面板点按钮才展开，不抢占主区域

**优化建议 → 可操作清单**
- 每条建议有状态：待处理 / 已应用 / 忽略
- 每条建议有操作按钮：复制示例、标记已应用、忽略、重置
- 顶部显示进度（已应用 X/Y）
- 排雷清单标风险等级：高风险（必须改）、中风险
- 新增/修改/删除用颜色编码（绿/橙/红）+ 序号优先级

**编辑器体验强化**
- 移动端按钮折叠：小屏「确认」+「更多」下拉菜单
- 自动保存三态指示：保存中（橙色旋转）/ 已保存（绿色）/ 保存失败（红色）
- 桌面端分屏模式：左 Markdown 编辑 + 右 A4 实时预览
- 导出先预览：点「预览导出」→ 预览弹窗 → 确认后下载 PDF/DOCX
- 分析依据入口：「分析依据」按钮一键返回分析结果页

**安全确认**
- 删除简历/删除 JD 增加确认弹窗（不可撤销）
- 编辑器离开前未保存提示（弹窗 + 浏览器关闭拦截）
- 解析失败简历提供错误原因，引导重新上传或删除

**其他改进**
- 分析页生成区域支持收起/展开（不丢内容）
- 分析页生成区域新增 DOCX 导出按钮
- 系统健康页 `/health`（检查 DB、Redis、DeepSeek、Puppeteer、Alipay、Prompts、付款码）
- 管理后台服务状态面板
- 上传页格式提示改善（Word 最佳、PDF 需文字型、5MB、200 字）
- 分析依据入口：编辑器可一键返回分析结果页

---

## 三、当前架构

```
前端 Next.js (:3000) → /api/* 同源代理 → 后端 NestJS (:3001)
                                            ├── PostgreSQL 16 (Docker)
                                            ├── Redis 7 (Docker, BullMQ)
                                            ├── DeepSeek API
                                            └── 支付宝 API (待配置)

Worker (BullMQ) → 简历解析队列
```

---

## 四、已修复的 Bug

| 日期 | 问题 | 修复 |
|------|------|------|
| 05/28 | 支付二维码不显示 | ApiResponseInterceptor 把 PNG 包成 JSON |
| 05/29 | ngrok 公网访问网络错误 | NEXT_PUBLIC_API_URL 策略 + CORS 白名单 |
| 05/31 | 积分余额侧边栏不刷新 | points-updated 自定义事件 |
| 06/01 | 充值接口二次包裹响应 | 去掉 `{ data: result }` 一层 |
| 06/02 | 生产构建 8 个 TS 错误 | tsconfig 加 noImplicitAny: false |
| 06/02 | Docker 镜像遗漏 prompts | COPY prompts 到运行时镜像 |
| 06/02 | .next 缓存冲突导致 500 | build 后清 .next 再 dev |
| 06/02 | 前端页面 500（Cannot find module） | 同 .next 缓存问题 |
| 06/25 | 未登录可访问上传/分析页面（重大安全漏洞） | Next.js middleware 服务端路由保护 + cookie 鉴权 |
| 06/25 | CORS 报错导致登录失败 | 修复 CORS 逗号分隔多源匹配 + 添加 IP 访问白名单 |
| 08/13 | 域名打不开（HTTPS 443 无监听） | 443 server 块从未进 git，容器重建后丢失；补配置 + HTTP→HTTPS 重定向 |
| 08/13 | 部署超时失败 + 孤儿构建拖垮服务器 | SSH 命令超时 10m→30m；先停容器再构建；健康检查重试 24 次 |
| 08/13 | 会话过期后控制台刷 401 | apiFetch 全局 401 处理：清 token + auth-expired 事件跳登录 |
| 08/13 | 注册已存在手机号提示笼统 | getErrorMessage 改为后端具体信息优先 |
| 08/13 | favicon.ico 404 | 新增 app/icon.svg |
| 08/13 | 积分不足取消充值后卡在「AI 正在生成简历」 | QUOTA_EXCEEDED 分支补 step 复位（analyze→idle / generate→done） |
| 08/13 | 页面跳转后登录状态变「登录/注册」 | /auth/me 移出登录限流桶（3r/m→通用+5s缓存）+ 导航改 Link 客户端跳转 |
| 08/14 | 登录点击后页面不跳转，需刷新 | Link 预取把未登录 307 重定向缓存进路由缓存；prefetch={false} + 中间件重定向 no-store |
| 08/14 | 退出登录后积分显示板不消失 | PointsBalance 挂载条件补 loggedIn 检查 |
| 08/20 | 管理页看不到已上传的付款码 | /data/payment-qr 未挂载卷，容器重建即销毁；新增 payment_qr_data 命名卷持久化（原图已无法找回，需重新上传） |
| 08/20 | v0.7.0 部署 CI 失败（11 个 TS7006） | strict 模式下 ci.yml 构建 backend 先于 prisma generate，查询类型退化 any；步骤重排 |
| 08/20 | Docker 构建失败（同因） | 两个 Dockerfile 同样顺序问题；db:generate 移到 build 之前 |
| 08/20 | 后端启动即崩（Prisma 引擎不匹配） | 镜像生成 openssl-1.1 引擎、bookworm 运行时需 3.0；schema 显式声明 binaryTargets 双目标 |
| 08/21 | 部署 30 分钟超时 + 孤儿构建拖垮服务器（通宵宕机） | 小服务器构建超限：超时上限提至 60m/75m；恢复流程：杀孤儿构建 + 后端/worker 镜像已由孤儿构建完成 |
| 08/21 | 当面付下单返回 ACQ.ACCESS_FORBIDDEN | 商户账号未开通「当面付」产品；业务决策：网站支付用电脑网站支付（page.pay）而非当面付（实体店场景），已恢复原方案 |

---

## 五、等待完善

### 上线前必须完成

| 优先级 | 事项 | 状态 |
|--------|------|------|
| P0 | 购买阿里云服务器 | ✅ 已完成 |
| P0 | 域名备案 | ✅ 已完成（2026-06-15） |
| P0 | 支付宝商户号申请与配置 | ✅ 已完成（2026-06-13） |
| P0 | 生产环境 HTTPS + Nginx 部署 | ✅ 已完成（2026-06-15） |
| P0 | 数据库生产密码修改 | 🔴 |
| P0 | v0.5.2 安全加固上线 | ✅ 已随 v0.7.0 上线（2026-08-20；Turnstile 除外——已移除，未配密钥） |

### 功能待完善

| 优先级 | 事项 | 说明 |
|--------|------|------|
| P1 | 密码找回 | 先做管理员重置，后接入短信 |
| P1 | Docker 生产环境实际部署测试 | ✅ 已实测（2026-08-13 起多次生产部署） |
| P2 | 微信支付 | 当前只做了支付宝 |
| P2 | 简历模板市场 | 多模板可选 |
| P2 | B 端企业功能 | 企业发 JD，匹配候选人 |
| P3 | 简历多语言支持 | 英文简历 |
| P3 | 单元测试 | 目前只有冒烟脚本 |

### 技术债务

| 事项 | 说明 | 状态 |
|------|------|------|
| 日志脱敏 | phone 统一脱敏 | ✅ v0.6.0 |
| Puppeteer 浏览器池化 | 单实例 + 错误恢复 + shutdown 清理 | ✅ v0.6.0 |
| 全局 `as any` 类型清理 | backend 18 处 + frontend 2 处消 | ✅ v0.6.0 |
| DeepSeek API 调用统一封装 | analyze、generate、parse.worker 各有独立实现 | 🔴 |
| 前后端共享类型完善 | 部分接口仍可用 optional 字段优化 | 🟡 |
| WebSocket 实时解析状态推送 | 当前靠前端轮询 | 🔴 |

---

## 六、上次工作到的位置

**刚完成**（2026-09-08）：v0.9.0 可观测性三件套
- **Pino 结构化日志**：nestjs-pino + pino-http，dev 用 pino-pretty 美化，prod 输出 JSON；每请求自动生成 `requestId`（uuid 或 `x-request-id` header），授权/cookie 字段自动 redact
- **Prometheus metrics**：`/metrics` 端点暴露 process 指标（CPU/内存/event loop/GC）+ 6 个业务 gauge（resume_total 按 parseStatus 分组、generated_resume_total、analysis_total、recharge_total 按 status 分组、user_total、parse_queue_depth 按 state 分组：waiting/active/completed/failed/delayed），每次 scrape 自动刷新
- **AllExceptionsFilter**：catch-all 全局异常过滤器，业务错误（4xx）记 warn、未捕获异常（Error/TypeError 等）记 error + 完整 stack，每条都带 requestId/method/url/userId，可 grep / 可接 Sentry
- ⏳ **待办**：业务功能扩展（待定方向）；线上 nginx 需放行 `/metrics` 端点（或限制源 IP）；GitHub secrets 配置后才能用 Actions 部署

**此前完成**（2026-09-08）：v0.8.0 简历版本系统 + 编辑器易用性 + 测试覆盖 + 排序 bug 修复
- 简历版本系统：`ResumeVersion` / `GeneratedResumeVersion` 模型，20 条快照上限、跨用户隔离、恢复前写 `before_restore` 快照（spec 完整实现）
- 编辑器易用性 P0：Section 可折叠 + ArrayCard 标题显示实际内容 + 底部 sticky 保存栏 + 标签式技能输入 + 自动保存状态可视化 + 描述字段折叠
- 编辑器易用性 P1：宽屏默认分屏预览 + 完整度进度条（8 项检查，hover 显示缺失）+ 时间字段失焦自动规范化 `YYYY.MM`
- 测试覆盖：35 个单元测试（支付回调幂等 / 积分扣减退款 / 缓存命中穿透失效 / Throttler 用户IP分流 / 版本快照恢复淘汰），CI 加 `npm test` step
- 排序 bug 修复：解析层 + 展示层双重排序（最新在前），兼容 `2022.03 - 至今`、`2019年3月` 等格式
- 安全：JWT 弱密钥启动校验（生产抛错）+ CSP 清理已下线的 Turnstile
- 数据清理：`RechargesService.expireStalePending` 每小时过期 24h+ pending 充值 + 前端 expired 状态适配 + `(status, createdAt)` 复合索引
- 性能：`next.config.js` 启用 `optimizePackageImports`（md-editor / react-markdown / lucide-react）
- 文档：AGENTS.md 加版本系统/充值过期/分析计费说明；TECH-DESIGN.md 加 v0.8.0 附录；TODOS.md 路线图
- ⏳ **待办**：可观测性（结构化日志 / Prometheus metrics / 错误聚合）；GitHub secrets 配置后触发部署；支付宝私钥移到 KMS

**此前完成**（2026-08-21）：v0.7.1 支付方案定型 + 清理
- 业务决策：网站支付保留**电脑网站支付（page.pay）**；当面付（precreate）为实体店场景，商户账号亦未开通（ACQ.ACCESS_FORBIDDEN），已恢复原方案
- 移除手动付款码上传（后端接口/管理页区块/health 检查/卷）——静态收款码无业务用途，决定不变
- 部署超时上限 30m/45m → 60m/75m（小服务器构建超时事故）
- ⏳ **待办：10 元真实支付实测**（page.pay 链路曾实测通过，改动后建议复测一次）

**此前完成**（2026-08-20）：v0.7.0 成功上线
- Turnstile 移除（未配密钥，本版不上线；commit `524ac6a`，可 revert 恢复）
- 部署链路三处潜伏 bug 修复：ci.yml / 两个 Dockerfile 的 Prisma 生成顺序、schema binaryTargets 引擎目标（openssl 3.0）
- 浏览器实测：登录直达 dashboard、无 Turnstile 控件、备案号/favicon 无回归

**更早完成**（2026-08-13）：v0.6.1 生产修复批次全部上线
- HTTPS 事故恢复 + nginx 443 配置进 git（永久生效）
- 备案号（沪ICP备2026028917号-1）上线
- 部署流水线加固：先停容器再构建 + 超时 30m/45m + 健康检查 24 次重试
- 前端：会话过期自动跳登录、错误提示具体信息优先、favicon
- 积分不足取消充值后正确回到原页面（step 复位）
- 登录状态修复：/auth/me 移出登录限流 + 导航改 Link 客户端跳转
- 登录点击后直接跳转（Link 预取缓存污染修复：prefetch={false} + no-store）
- 退出登录后积分显示板即时消失（PointsBalance 补 loggedIn 条件）
- 服务器与 `cvbuilder2.0` main 一致；nginx 限流/缓存层已随部署上线

### 下一阶段

- ~~**P0：v0.5.2 安全加固上线**~~ ← ✅ 2026-08-20 已随 v0.7.0 上线（Turnstile 已移除；后续要重新启用时先配密钥）
- 密码找回、支付测试
- **UI/UX 后续渐进式优化**：详见 [2026-08-19-ui-ux-follow-up-optimization.md](docs/superpowers/plans/2026-08-19-ui-ux-follow-up-optimization.md)。当前先处理 P0 入口纠偏和 P1 分析页交互，全部本地验收后再考虑推送。

### v0.6.0 下一阶段

- v0.6.0 基础 UI 优化已完成；后续纠偏、移动端和无障碍事项转入独立实施计划，避免与历史版本记录混在一起。

### v0.5.0 详细变更

**支付系统**
- 支付宝商户号申请与配置（APP_ID: 2021006161672426）
- 从当面付（precreate）切换到电脑网站支付（page.pay）
- 手动 RSA-SHA256 签名构建支付 URL（alipay-sdk pageExec 的 biz_content 问题）
- 前端从扫码展示改为跳转支付宝支付页面
- 本地调试环境就绪，支持本地测试后再部署

**域名 + HTTPS**
- 域名 `cvbuilder.ltd` 备案通过
- Let's Encrypt 免费 SSL 证书部署
- Nginx 配置 HTTPS + HTTP→HTTPS 重定向
- 证书自动续期（每日 02:00 crontab）
- 阿里云安全组开放 443 端口

**修复**
- 支付宝签名密钥三次重生成与配对验证
- CORS 配置更新为 HTTPS 域名
- DeepSeek API Key 从占位符恢复
- 服务器多次重建后 DB 密码恢复

### CI/CD 详情（v0.4.2）

- **GitHub Actions**：两个 workflow 文件
  - `ci.yml`：推送到非 main 分支时自动类型检查 + Docker 构建验证
  - `deploy.yml`：手动触发（workflow_dispatch），SSH 到 ECS 执行 `git fetch + reset --hard origin/main` → **先停全部容器** → `docker compose up -d --build` → 健康检查（SSH 命令超时 30m、job 45m、健康检查重试 24 次；构建期间站点停机）
- **服务器**：阿里云 ECS (Ubuntu 22.04)，IP `8.160.123.149`
  - 代码路径 `/opt/cvbuilder`，已初始化为 git 仓库，关联 `github.com:fitback/cvbuilder2.0`
  - SSH 部署密钥已配置（`~/.ssh/github-deploy` → GitHub Deploy Key）
  - GitHub Actions SSH 密钥已配置（`~/.ssh/cvbuilder-deploy` → GitHub Secrets `ECS_SSH_KEY`）
- **部署方式**：手动触发（去 GitHub Actions → Deploy → Run workflow），不做自动部署
- **环境变量**：`.env.prod` 已在服务器上配置，已加入 `.gitignore` 不进仓库

### v0.8.0 部署记录（2026-09-08）

- 部署链路：本地 main（`fde376a`）→ push 生产仓库 `fitback/cvbuilder2.0`（`c125452..fde376a`，5 提交）→ Deploy run #34225061340 → 部署 job 成功 + 健康检查通过（CI 的 Docker 构建验证步骤被取消，不影响部署）
- **DB migration 基线化**：v0.8.0 首次引入 `prisma/migrations`（2 个 migration，第一个是全量基线，含全部 9 张表）。此前 prod 一直由 entrypoint 的 `db push` 同步 schema（无 `_prisma_migrations` 历史），直接 `migrate deploy` 会因 `CREATE TABLE "User"` 撞表报错。本次部署后（db push 已自动建好 2 张新表 + 复合索引）在 backend 容器执行 `prisma migrate resolve --applied` ×2 建立基线，`migrate status` = up to date
- **⚠️ 下次发版建议**：entrypoint（`scripts/entrypoint-backend.sh`）从 `db push` 改为 `migrate deploy`。基线已建立，之后新增 migration 走 migrate deploy 流程；继续用 db push 会导致 migrations 与 DB 历史脱节
- **⚠️ 部署前置**：生产仓库是 `cvbuilder2.0`（服务器 origin 指向它），本地开发仓库是 `fitback/cvbuilder`。触发 Deploy 前必须先把 main push 到 cvbuilder2.0，否则服务器拉到的是旧代码

### 服务器关键路径

| 路径 | 用途 |
|------|------|
| `/opt/cvbuilder` | 项目代码 |
| `/data/resumes` | 简历文件存储 |
| `/data/backups` | 数据库备份 |
| `/data/payment-qr` | 支付宝付款码 |

---

## 七、Prompt 版本记录

### analyze-master.md（简历分析大师）

当前版本：v2 — 详细评分+证据链+字段约束版（2026-06-02）
文件位置：`packages/backend/prompts/analyze-master.md`

**v2 主要特性**：
- 评分规则细化为 5 个维度（硬性要求 40 分 + 核心职责 25 分 + 行业相关性 15 分 + 成果表达 10 分 + 风险项 10 分）
- 分数区间含义（85-100 高度匹配、70-84 较匹配、55-69 部分匹配、0-54 需重构）
- 证据链要求（JD 要求 - 简历证据 - 缺口/风险 - 修改方向）
- 输出数量控制（jdCoreDecoding 3-6、optimizationSuggestions 3-5、detailChecklist 3-8）
- detail 字段格式：优先级+原因+修改方式
- example 字段约束：不得虚构，需补充数据时写"建议补充真实数据：..."
- 6 条专业判断原则

**v1 原始版**（2026-05-09）：
```
# 简历分析大师 — System Prompt
你是一位资深HR和简历优化专家，拥有10年以上招聘经验。
你的任务是深度分析候选人的简历与目标岗位的匹配程度，提供可操作的优化建议。

## 分析维度
1. 核心需求匹配：逐条对比JD硬性要求与简历覆盖情况
2. 隐性需求挖掘：识别JD中未明写但实际考察的能力
3. 竞争力评估：候选人在同类竞争者中的相对优势与短板
4. 细节排雷：简历中的低级错误、格式问题、表述歧义

## 原则
- 诚实但有建设性、具体而非笼统、优先级排序、尊重原文、中文输出
- 输出 JSON 格式：matchScore、matchSummary、jdCoreDecoding、
  optimizationSuggestions（target/action/detail/example）、
  detailChecklist（type/location/content）
```

### generate-master.md（简历生成大师）

当前版本：v2 — 详细生成规则+事实边界版（2026-06-02）
文件位置：`packages/backend/prompts/generate-master.md`

**v2 主要特性**：
- 核心原则 4 条：真实可信、目标岗位导向、面试可追问、国内简历语境
- 内容取舍规则 6 条（按优先级：保留强化 → 补强缺口 → 删除排雷 → 改写 → 压缩无关 → 省略空模块）
- 表达规则：bullet 用"动作-方法-范围-结果"结构，缺数据不编造
- "建议补充真实数据"最多 2 次
- Markdown 格式约束：只用 h1/h2/h3 + 无序列表 + 加粗，不用表格/引用/图片
- 生成质量要求 10 条（真实姓名、联系方式、求职意向、时间排序、去重、A4 适配等）
- 事实边界 + 正误示例（不得将"参与"写成"主导"、不得编造数据）

**v1 原始版**（2026-05-09）：
```
# 简历生成大师 — System Prompt
你是一位专业的简历撰写专家，擅长根据分析结果重构简历。
## 任务
根据分析大师的输出结论和候选人原始简历数据，生成一份高度匹配目标岗位的全新简历。
## 原则
- 基于事实优化，不做虚假包装
- 突出匹配项，弱化无关项
- 量化成果，关键词对齐
- 专业排版意识，30 秒内抓住重点
- 输出 Markdown 格式（姓名/个人优势/工作经历/项目经历/教育背景/专业技能）
```

---

**下一步建议**：
1. ~~推进部署上线（买服务器、备案、配置生产环境）~~ ← 已完成
2. ~~安全加固：缓存 + 防爬虫 + 防 DDoS（v0.5.2）~~ ← ✅ 已完成
3. 继续完善功能（密码找回、支付测试）
4. UI/UX 全面优化（v0.6.0）← 当前工作

---

## 八、安全加固：缓存 + 防爬虫 + 防 DDoS

> 设计文档：[docs/superpowers/specs/2026-07-29-security-hardening-design.md](docs/superpowers/specs/2026-07-29-security-hardening-design.md)
> 启动日期：2026-07-29
> 策略：小项目低成本方案（nginx + 应用层自建，无外部付费服务）
> 三层防线：nginx（限流/缓存/连接控制）→ NestJS 全局（安全头/校验/用户维度限流）→ 路由级（Turnstile/Redis 缓存/BullMQ 限流）

### 实施清单

| 序号 | 批次 | 模块 | 事项 | 状态 |
|------|------|------|------|------|
| 1.1 | 1 | nginx | limit_req + limit_conn + body/client 超时 | ✅ |
| 1.2 | 1 | nginx | proxy_cache GET 请求 5s 缓存 | ✅ |
| 1.3 | 1 | nginx | /api/auth/ 单独限流 (3r/m) | ✅ |
| 2.1 | 1 | 应用层 | helmet 安全头 | ✅ |
| 2.2 | 1 | 应用层 | 全局 ValidationPipe | ✅ |
| 2.3 | 2 | 应用层 | 补 DTO 校验（LoginDto, AnalyzeDto, GenerateDto, ExportDto, CreateJobDto, RechargeOrderDto） | ✅ |
| 3.1 | 2 | 限流 | UserAwareThrottlerGuard（登录用户按 userId 限流） | ✅ |
| 3.2 | 2 | 限流 | 未限流接口补 @Throttle（export/pdf, DELETE 等） | ✅ |
| 4.1 | 3 | 缓存 | Redis CacheService（getOrSet + del） | ✅ |
| 4.2 | 3 | 缓存 | 热点接口接入缓存（jobs, analyze/saved, points/balance, resumes） | ✅ |
| 5.1 | 3 | 防爬虫 | Cloudflare Turnstile 前端接入（登录 + 注册） | ❌ 已移除（2026-08-20，未配密钥） |
| 5.2 | 3 | 防爬虫 | Turnstile 后端验证逻辑 | ❌ 已移除（2026-08-20，未配密钥） |
| 6.1 | 2 | 队列 | BullMQ limiter（max: 5/min） | ✅ |

### 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-29 | 全部 13 项实施完成 |
| 2026-07-29 | 修复 proxy_no_cache 导致的所有缓存失效 Bug |
| 2026-07-29 | 修复 analyze.service.ts 中 cache.del 在 try/catch 内导致的积分误退 Bug |
| 2026-08-13 | ⚠️ 部署状态：nginx 层（限流/缓存）已随 HTTPS 修复上线；**应用层（helmet/ValidationPipe/Throttle/Turnstile/Redis 缓存）仍在本地 main 未推送**，上线前需服务器配置 `TURNSTILE_SECRET_KEY` |
| 2026-08-20 | Turnstile（5.1/5.2）整体移除：未配置密钥会阻断登录注册，本版不上线；commit `524ac6a`，后续可 revert 重新启用（需先配密钥）。其余安全加固随 v0.7.0 部署 |
| 2026-08-20 | 管理后台新增注册用户记录：管理员可查看完整手机号、角色、积分和注册时间；接口仅管理员可访问，未推送部署 |

---

## 九、UI/UX 全面优化方案（v0.6.0）

> 启动日期：2026-07-29
> 基于全量页面审计（9 页面 + 8 组件 + DESIGN.md + globals.css），按批次排序

### 实施清单

| 序号 | 批次 | 优先级 | 模块 | 事项 | 状态 |
|------|------|--------|------|------|------|
| 1 | 批次 1 | P0 | Dashboard | 删除按钮移动端常显 | ✅ |
| 2 | 批次 1 | P0 | Toast | 定位规避移动端底部导航：移动端 `top-4` | ✅ |
| 3 | 批次 1 | P0 | 全局 | 键盘快捷键：`Ctrl+S` 保存、`Ctrl+Enter` 分析/生成 | ✅ |
| 4 | 批次 1 | P0 | Admin | 表格响应式：充值记录表在 `<768px` 转为卡片布局 | ✅ |
| 5 | 批次 2 | P1 | Dashboard | 概览统计卡片：简历总数、可分析数、生成数三卡，可点击跳转 | ✅ |
| 6 | 批次 2 | P1 | 简历编辑 | 分屏实时预览：左表单右 A4 渲染，借鉴 generated 编辑页模式 | ✅ |
| 7 | 批次 2 | P1 | 分析页 | 信息层级优化：Sticky 分数栏 + 建议进度条 + 排雷按风险分组 + 生成按钮渐入 | ✅ |
| 8 | 批次 3 | P1 | 分析页 | 建议追踪持久化：`suggestionStatus` 写入 `localStorage` 或后端持久化 | ✅ |
| 9 | 批次 3 | P1 | 简历编辑 | 解析中骨架细化：parsing 状态展示 6-8 条模拟骨架表单 | ✅ |
| 10 | 批次 4 | P2 | 导航 | 底部导航 badge：解析中的简历→仪表盘红点，上传中→旋转指示 | ✅ |
| 11 | 批次 4 | P2 | 表单 | 触控优化：移动端 `font-size: 16px` 防 iOS zoom；≥44px 触控区域 | ✅ |
| 12 | 批次 4 | P2 | 上传 | 拖拽手势反馈：文件类型图标 + 即时校验 + 放手呼吸动画 | ✅ |
| 13 | 批次 5 | P3 | 全局 | 动效系统：列表入场 stagger、弹窗 backdrop blur、数字 transition | ✅ |
| 14 | 批次 5 | P3 | 全局 | 空状态优化：Dashboard/JD/Generated 空状态加插画与更紧密引导 | ✅ |
| 15 | 批次 5 | P3 | 全局 | 保存状态指示器：sidebar 底部全局保存状态栏 | ✅ |
| 16 | 批次 6 | P3 | 全局 | 暗色模式：Tailwind v4 class-based，跟随系统，sidebar 切换按钮 | ✅ |

---

## 十、部署与验收 SOP（复用模板）

> 用法：每次准备上线时，先复制「部署口令模板」发给 Agent 执行；上线完成后按「验收报告模板」回填归档。

### 模板 A：部署口令模板

```
【开始部署】
项目：ResumeMatcher
分支：main
目标版本：vX.Y.Z
部署方式：GitHub Actions 手动触发 Deploy（workflow_dispatch）
要求：先做本地验证，再触发部署，部署完成后输出验收报告

【本地验证清单】
1. 安装与依赖检查通过
2. shared 构建通过
3. backend 构建通过
4. frontend 构建通过
5. Prisma schema validate 通过（使用 backend 环境变量）
6. 如涉及支付/登录/管理员能力，做最小人工冒烟并记录结果

【触发部署步骤】
1. 推送 main 与 tag（如有版本发布）
2. 触发 GitHub Actions 的 Deploy 工作流
3. 监控日志直到健康检查完成
4. 若失败，先给出根因分类（构建、镜像、环境变量、网络、健康检查）再修复

【部署后强制验收】
1. 首页与登录流程可用
2. dashboard 可进入，关键接口无 401/500 异常
3. 管理员页可访问，注册用户记录可见（手机号明文显示）
4. 支付链路按当前方案可用（电脑网站支付）
5. 输出结构化验收报告并回写进度文档

【回写文档】
- 更新 PROGRESS.md 的版本、变更、已知问题、下一步
- 如涉及部署流程变化，同步更新 docs/superpowers/plans 对应计划文档
```

### 模板 B：部署后验收报告模板

```
【验收报告】
项目：ResumeMatcher
版本：vX.Y.Z
分支与提交：main / COMMIT_SHA
部署时间：YYYY-MM-DD HH:mm
验收人：NAME

一、部署执行结果
1. Deploy workflow：成功/失败
2. 总耗时：XX 分钟
3. 服务器健康检查：通过/失败
4. 关键日志摘要：
- 构建阶段：正常/异常（简述）
- 启动阶段：正常/异常（简述）
- 健康检查：正常/异常（简述）

二、功能验收结果
1. 登录注册：通过/失败（说明）
2. 仪表盘与导航：通过/失败（说明）
3. 简历上传与解析：通过/失败（说明）
4. 分析与生成：通过/失败（说明）
5. 管理员页注册用户记录：通过/失败（说明）
6. 支付流程（电脑网站支付）：通过/失败（说明）

三、接口与稳定性检查
1. /api/health：通过/失败
2. 关键接口抽检（列 3-5 个）：通过/失败
3. 前端控制台错误：无/有（说明）
4. 后端错误日志：无/有（说明）

四、变更与风险
1. 本次实际生效变更：
- 变更 1
- 变更 2
2. 未完成项或已知风险：
- 风险 1（影响范围）
- 风险 2（临时方案）

五、回滚与结论
1. 是否需要回滚：否/是
2. 若回滚，目标版本：vA.B.C
3. 最终结论：可继续运行/需紧急修复

六、文档同步
1. PROGRESS 已更新：是/否
2. 计划/设计文档已同步：是/否
3. 后续待办：
- 待办 1
- 待办 2
```
