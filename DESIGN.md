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
- **No:** scroll-driven animations, entrance choreography, bouncy springs

## Interactive States (design tokens applied)

| Component | Default | Hover | Active/Focus | Disabled |
|-----------|---------|-------|--------------|----------|
| Primary button | bg: accent, text: white | bg: accent-hover | ring: accent @ 15% opacity | opacity: 40% |
| Secondary button | bg: surface-tertiary, text: text-primary, border: border | bg: border-light | ring: accent @ 15% | opacity: 40% |
| Ghost button | bg: transparent, text: text-secondary | bg: surface-tertiary | ring: accent @ 15% | opacity: 40% |
| Input | bg: surface, border: border | — | border: accent, ring: accent @ 15% | opacity: 40% |
| Nav item | text: text-secondary | bg: surface-tertiary | text: accent, bg: surface-tertiary (active) | — |

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-08 | Initial design system created | /design-consultation based on prior eng review + design review context |
| 2026-05-08 | Terracotta accent over blue | Career tools are saturated with blue; warm accent = distinctive + human |
| 2026-05-08 | Noto Serif SC for display/metrics | Signals editorial quality; resume as printed document, not web form |
| 2026-05-08 | Minimal decoration, compact density | "Serious help, not a toy" — decoration undermines trust |
| 2026-05-08 | PingFang SC over Inter/system-ui | Chinese-first product; system-ui is the "I gave up on typography" signal |
