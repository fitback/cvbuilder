# Ngrok Tunnel 外网访问 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose local dev services (frontend :3000, backend :3001) to external users via ngrok tunnels.

**Architecture:** ngrok tunnels both ports via a single yaml config. Frontend API calls use `NEXT_PUBLIC_API_URL` env var (defaults to localhost:3001) managed centrally in `lib/auth.ts`. Backend CORS allows ngrok-free.app origins.

**Tech Stack:** ngrok CLI (brew), Next.js env, NestJS CORS

---

### Task 1: Install ngrok and create config

**Files:**
- Create: `~/.ngrok2/ngrok.yml`

- [ ] **Step 1: Install ngrok**

```bash
brew install ngrok
```

- [ ] **Step 2: Create ngrok config**

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

- [ ] **Step 3: Verify ngrok starts**

```bash
ngrok start --all
```

Expected: Console shows two forwarding URLs (e.g. `https://abc123.ngrok-free.app` → localhost:3000, `https://xyz789.ngrok-free.app` → localhost:3001).

- [ ] **Step 4: Commit**

Not applicable — config file is outside repo (`~/.ngrok2/ngrok.yml`). No commit needed.

---

### Task 2: Centralize API base URL in lib/auth.ts

**Files:**
- Modify: `packages/frontend/lib/auth.ts`

- [ ] **Step 1: Add API_BASE export**

Add after the existing `apiFetch` function (line 35):

```typescript
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
```

Full file after edit:

```typescript
const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => headers[k] = v);
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => headers[k] = v);
    } else {
      Object.assign(headers, options.headers);
    }
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(url, { ...options, headers });
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/lib/auth.ts
git commit -m "feat: add centralized API_BASE export for configurable backend URL"
```

---

### Task 3: Replace hardcoded localhost:3001 with API_BASE in all 11 files

**Files:**
- Modify: `packages/frontend/app/layout.tsx`
- Modify: `packages/frontend/app/dashboard/page.tsx`
- Modify: `packages/frontend/app/analyze/[resumeId]/page.tsx`
- Modify: `packages/frontend/app/upload/page.tsx`
- Modify: `packages/frontend/app/jobs/page.tsx`
- Modify: `packages/frontend/app/recharge/page.tsx`
- Modify: `packages/frontend/app/recharge/history/page.tsx`
- Modify: `packages/frontend/components/PointsBalance.tsx`
- Modify: `packages/frontend/components/PointsModal.tsx`
- Modify: `packages/frontend/components/AuthModal.tsx`
- Modify: `packages/frontend/components/RechargeApproval.tsx`

For each file, two edits:
1. Add `API_BASE` to the existing `import { ... } from "...lib/auth"` line
2. Replace `const API = "http://localhost:3001";` with nothing (remove it)
3. Replace every `${API}` usage with `${API_BASE}`

---

- [ ] **Step 1: Update app/layout.tsx**

```diff
-import { isLoggedIn, clearToken, apiFetch } from "../lib/auth";
+import { isLoggedIn, clearToken, apiFetch, API_BASE } from "../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 2: Update app/dashboard/page.tsx**

```diff
-import { apiFetch } from "../../lib/auth";
+import { apiFetch, API_BASE } from "../../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 3: Update app/analyze/[resumeId]/page.tsx**

```diff
-import { apiFetch } from "../../../lib/auth";
+import { apiFetch, API_BASE } from "../../../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 4: Update app/upload/page.tsx**

```diff
-import { apiFetch } from "../../lib/auth";
+import { apiFetch, API_BASE } from "../../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 5: Update app/jobs/page.tsx**

```diff
-import { apiFetch } from "../../lib/auth";
+import { apiFetch, API_BASE } from "../../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 6: Update app/recharge/page.tsx**

```diff
-import { apiFetch } from "../../lib/auth";
+import { apiFetch, API_BASE } from "../../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 7: Update app/recharge/history/page.tsx**

```diff
-import { apiFetch } from "../../../lib/auth";
+import { apiFetch, API_BASE } from "../../../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 8: Update components/PointsBalance.tsx**

```diff
-import { apiFetch } from "../lib/auth";
+import { apiFetch, API_BASE } from "../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 9: Update components/PointsModal.tsx**

```diff
-import { apiFetch } from "../lib/auth";
+import { apiFetch, API_BASE } from "../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 10: Update components/AuthModal.tsx**

```diff
-import { setToken } from "../lib/auth";
+import { setToken, API_BASE } from "../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 11: Update components/RechargeApproval.tsx**

```diff
-import { apiFetch } from "../lib/auth";
+import { apiFetch, API_BASE } from "../lib/auth";

-const API = "http://localhost:3001";
```

Replace `${API}` → `${API_BASE}` in all fetch calls within this file.

- [ ] **Step 12: Commit**

```bash
git add packages/frontend/app/ packages/frontend/components/
git commit -m "refactor: replace hardcoded localhost:3001 with centralized API_BASE in all 11 components"
```

---

### Task 4: Update CORS to allow ngrok origins

**Files:**
- Modify: `packages/backend/src/main.ts:25`

- [ ] **Step 1: Change CORS origin from single string to regex array**

Current line 25:
```typescript
app.enableCors({ origin: "http://localhost:3000", credentials: true });
```

Replace with:
```typescript
app.enableCors({
  origin: ["http://localhost:3000", /^https:\/\/.*\.ngrok-free\.app$/],
  credentials: true,
});
```

- [ ] **Step 2: Rebuild and verify backend starts**

```bash
npm run dev:backend
```

Expected: Backend starts normally, listen on :3001.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/main.ts
git commit -m "feat: add CORS support for ngrok tunnel origins"
```

---

### Smoke Test (after all tasks)

1. Start all services: docker compose, backend, frontend, worker
2. Start ngrok: `ngrok start --all`
3. Get backend ngrok URL from console (e.g. `https://xyz.ngrok-free.app`)
4. Create `packages/frontend/.env.local` with `NEXT_PUBLIC_API_URL=https://xyz.ngrok-free.app`
5. Restart frontend
6. Open frontend ngrok URL in a browser
7. Verify: login works, dashboard loads, analysis runs — all through ngrok URLs
