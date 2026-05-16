# Design System — ResumeMatcher

## Product Context
- **What this is:** 面向国内求职者的简历优化与岗位匹配平台
- **Who it's for:** 应届生、转行者、跳槽者
- **Space/industry:** 在线招聘 / 职业工具
- **Project type:** web app (dashboard + editor + export)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian with editorial warmth
- **Decoration level:** minimal — typography does all the work
- **Mood:** "Serious help, not a toy." Calm, competent, professional. The resume is the hero, not the interface.
- **Memorable thing:** 专业工具，非玩具 — this is a serious career advisor, not a consumer app

## Typography
- **Display/Hero:** Noto Serif SC (思源宋体) — editorial, authoritative. Used for: match score, resume content headings, hero text
- **Body/UI:** `PingFang SC` (macOS) / `Microsoft YaHei` (Windows) / `Noto Sans SC` (fallback) — clean, legible, Chinese-optimized
- **Data/Tables:** same as body — `tabular-nums` via OpenType features where available
- **Code/Technical:** JetBrains Mono — for any code blocks or technical fields in resumes
- **Loading:** Google Fonts (`Noto Serif SC`, `Noto Sans SC`) + system fallbacks. Consider self-hosting for production.
- **Scale:**
  - xs: 12px / 1.5
  - sm: 13px / 1.5
  - base: 14px / 1.6
  - md: 16px / 1.5
  - lg: 20px / 1.4
  - xl: 24px / 1.3
  - 2xl: 32px / 1.2
  - score: 72px / 1.0

## Color
- **Approach:** restrained — one warm accent + neutral grays. Color is rare and meaningful.
- **Accent:** `#B75C3A` — terracotta/rust. Warm, human, distinctive in a sea of blue recruitment tools. Used for: primary CTAs, match score, active nav, focus rings
- **Accent hover:** `#9A4E31`
- **Neutrals (warm grays, warmest to coolest):**
  - Near-black: `#1A1A1A`
  - Text primary: `#2D2D2D`
  - Text secondary: `#6B6B6B`
  - Text muted: `#9E9E9E`
  - Border: `#D4D4D4`
  - Border light: `#EBEBEB`
  - Surface tertiary: `#F5F4F2`
  - Surface secondary: `#FAFAF9`
  - Surface: `#FFFFFF`
- **Semantic:**
  - success: `#5B8C5A` (bg: `#EDF5EC`)
  - warning: `#C7953A` (bg: `#FDF6EC`)
  - error: `#C75B5B` (bg: `#FBEDED`)
  - info: `#5B7F9E`
- **Dark mode:** Redesign surfaces — near-black becomes warm-white, surfaces invert. Accent desaturates 10%. Semantic backgrounds darken 60%.

## Spacing
- **Base unit:** 4px
- **Density:** compact — information-dense. Resumes are data, not marketing.
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** grid-disciplined (app) + editorial (resume template)
- **Desktop:** persistent left sidebar (200px) + main content area
- **Mobile:** bottom tab bar, content stacks vertically
- **Grid:** 12-column on desktop, single column on mobile
- **Max content width:** 960px for content panels, 1200px for dashboard
- **Border radius:** sm(4px) md(6px) lg(8px) — restrained, no bubbly radius

## Motion
- **Approach:** minimal-functional — only transitions that aid comprehension
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms)
- **Page transitions:** `slideUp` (300ms, ease-out) for page content; `fadeIn` (200ms, ease-out) for overlays/error states. Triggered per-route via `key={pathname}` on `<main>` wrapper to re-start animation on navigation.
- **Card interactions:** `hover:-translate-y-[1px]`, `hover:shadow-sm`, `active:scale-[0.995]` (cards); `active:scale-[0.97]` (buttons). These provide spatial feedback without bouncy springs.
- **Loading states:** Skeleton shimmer with staggered `animationDelay` (100ms increments) — no full-page spinners except for AI generation steps (which use a centered spinner + skeleton lines).
- **Toast:** `toastIn` keyframe (8px upward slide + scale, 0→1 opacity, 250ms ease-out) for temporary notifications.
- **Generating state:** Centered spinner + 3 skeleton lines (staggered 150ms delay) with animated widths `[70%, 50%, 60%]`.
- **No:** scroll-driven animations, entrance choreography, bouncy springs.

## Accessibility

- **Focus States:** All interactive elements (buttons, nav items, inputs, links) use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30 focus-visible:ring-offset-1`. Global `:focus-visible` reset sets `outline: none` and applies a 2px accent ring.
- **Reduced Motion:** `@media (prefers-reduced-motion: reduce)` globally zeroes `animation-duration`, `transition-duration`, and sets `scroll-behavior: auto` on all elements. All interactive feedback (hover/active transforms) is disabled in this mode.
- **Touch targets:** 44×44px minimum for mobile nav items and buttons; gap ≥8px between adjacent touch targets.
- **Color contrast:** All text/bg pairs meet WCAG AA (4.5:1). Design tokens are semantic (not raw hex) — accent, text-primary, text-secondary, etc.

## Navigation

- **Desktop sidebar:** Persistent 200px left sidebar. Active item uses `border-l-[3px] border-[#B75C3A]` with `pl-[9px]` (compensating for border). Inactive items use `border-l-[3px] border-transparent`. No background fill on active state — the border alone signals active.
- **Mobile bottom nav:** Fixed bottom bar with 5 items max. Active item uses `border-t-2 border-[#B75C3A] pt-[4px]`. Inactive items use `border-t-2 border-transparent`.
- **Login/Logout:** Placed at bottom of sidebar on desktop; inline in header on mobile. Active states follow the same border-based pattern.
- **Admin nav:** Admin users see a "管理" nav item with `ShieldAlert` icon. Points balance and recharge nav are hidden for admin.

## Pages

- **Login page (`/`):** Split-panel layout. Left panel (50%) — gradient background (`#B75C3A` → `#9A4E31`) with brand name, feature list (4 items with icons), and bottom tagline. Right panel (50%) — white background with login/register toggle tabs, phone/password inputs, submit button. On mobile, panels stack vertically (branding on top, form below). No sidebar or top nav shown on this page.
- **Admin page (`/admin`):** Tab-based layout (待审批 / 审批历史). Pending tab shows individual cards with user phone, amount, order number, and approve/reject buttons. History tab shows a table with columns: user, amount, points, order number, status badge, note, time. QR code management section at top with upload button and preview thumbnail.
- **Logout confirm:** Centered modal overlay with "确认退出" title, "确定要退出登录吗？" description, and two buttons (取消 / 确认退出). Uses `danger` button variant for confirm action.

## Interactive States (design tokens applied)

| Component | Default | Hover | Active/Focus | Disabled |
|-----------|---------|-------|--------------|----------|
| Primary button | bg: accent, text: white | brightness-110 | scale-[0.97], ring: accent 30% | opacity: 40%, no scale |
| Secondary button | bg: white, text: #2D2D2D, border: var(--color-border) | bg: #F5F4F2 | scale-[0.97], ring: accent 30% | opacity: 50% |
| Ghost button | bg: transparent, text: #6B6B6B | bg: #F5F4F2 | scale-[0.97] | opacity: 50% |
| Danger button | text: #C75B5B | bg: #FBEDED | scale-[0.97] | opacity: 50% |
| Input | bg: white, border: var(--color-border) | — | border: accent, ring: accent 30% | opacity: 40% |
| Nav item (sidebar) | text: var(--color-text-secondary), border: transparent 3px | bg: #F5F4F2 | text: accent, border: accent 3px | — |
| Nav item (bottom) | text: var(--color-text-secondary), border: transparent 2px | bg: #F5F4F2 | text: accent, border: accent 2px | — |
| Card/link | bg: white, border: var(--color-border-light) | translateY(-1px), shadow-sm, border: var(--color-border) | scale-[0.995] | — |

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-08 | Initial design system created | /design-consultation based on prior eng review + design review context |
| 2026-05-08 | Terracotta accent over blue | Career tools are saturated with blue; warm accent = distinctive + human |
| 2026-05-08 | Noto Serif SC for display/metrics | Signals editorial quality; resume as printed document, not web form |
| 2026-05-08 | Minimal decoration, compact density | "Serious help, not a toy" — decoration undermines trust |
| 2026-05-08 | PingFang SC over Inter/system-ui | Chinese-first product; system-ui is the "I gave up on typography" signal |
| 2026-05-10 | Focus-visible rings on all interactive elements | WCAG AA 2.4.7 focus indicator required; global :focus-visible reset prevents native dotted outline |
| 2026-05-10 | prefers-reduced-motion support | Accessibility — users with vestibular disorders must be able to disable all motion |
| 2026-05-10 | Nav active border instead of bg fill | Border-only active state is cleaner when there are multiple card-type items on the page; avoids confusing "which is the active section" |
| 2026-05-10 | Per-route page transition via key={pathname} | Prevents fade from re-triggering on unrelated re-renders while still animating on actual navigation |
| 2026-05-10 | scale-[0.97] active state on buttons | Micro-feedback for press without the complexity of lift effects on all interactive elements |
| 2026-05-16 | Login page as split-panel layout | Branding + features on left, compact auth form on right — separates identity from utility |
| 2026-05-16 | Route guard in layout for unauthenticated users | Prevents access to protected pages without login; checks isLoggedIn on each render |
| 2026-05-16 | Admin page with tab-based layout | Pending approvals need individual card layout (approve/reject per item), history works better as table |
| 2026-05-16 | Logout confirmation modal | Prevents accidental logout; uses danger variant for emphasis |
| 2026-05-16 | Gradient left panel (#B75C3A → #9A4E31) on login page | Warm gradient matches terracotta accent; creates visual separation between auth and branding |
