# Featured Books (Random Per Session) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Randomize the Home page Featured Books per browser session and keep the selection stable within that session.

**Architecture:** Read SKU list from `useBooks()`, then resolve a 3-item featured list using `sessionStorage` in `Index.tsx`. If stored IDs are valid, use them; otherwise shuffle and persist new IDs.

**Tech Stack:** React, TypeScript, Vite, sessionStorage.

---

### Task 1: Add session-stable featured selection logic

**Files:**
- Modify: `src/pages/Index.tsx`

**Step 1: (Test) Identify test coverage**

No existing test runner is configured in `package.json`. Proceed with implementation and rely on manual verification.

**Step 2: Implement session-stable random selection**

Update the featured selection logic to:
- Guard against `window` being undefined.
- Read stored `sku_id` list from `sessionStorage`.
- Map IDs to SKUs and validate the count.
- If invalid/missing, shuffle and store new IDs.
- Return up to 3 SKUs (or all if fewer).

**Step 3: Manual verification**

Run:
- `npm run dev -- --port 5173`

Verify:
- Featured books stay the same on refresh within the same tab.
- Opening a new tab yields a different random selection (with high likelihood).

**Step 4: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: randomize featured books per session"
```
