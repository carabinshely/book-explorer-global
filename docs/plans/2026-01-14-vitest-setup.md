# Vitest Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a real test runner (Vitest) so `npm test` works and verifies a basic Home page render.

**Architecture:** Configure Vitest in `vite.config.ts` with `jsdom`, add a test setup file for `@testing-library/jest-dom`, and create a simple Home page test that renders the component with required providers.

**Tech Stack:** React, Vitest, Testing Library, jsdom.

---

### Task 1: Add testing dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add dev dependencies**

Add:
- `vitest`
- `jsdom`
- `@testing-library/react`
- `@testing-library/jest-dom`

**Step 2: Add npm scripts**

Add:
- `test`: `vitest run`
- `test:watch`: `vitest`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest testing dependencies"
```

---

### Task 2: Configure Vitest and setup file

**Files:**
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Configure Vitest**

Add `test` config in Vite:
- `environment: 'jsdom'`
- `setupFiles: './src/test/setup.ts'`

**Step 2: Add setup file**

`src/test/setup.ts` should include:
```ts
import '@testing-library/jest-dom';
```

**Step 3: Commit**

```bash
git add vite.config.ts src/test/setup.ts
git commit -m "chore: configure vitest"
```

---

### Task 3: Add a basic Home page render test

**Files:**
- Create: `src/pages/Index.test.tsx`

**Step 1: Write a basic test**

Render `Index` with required providers and assert the Featured heading appears.

**Step 2: Run tests**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/Index.test.tsx
git commit -m "test: add home page render test"
```
