# Move Repo Content Into `public/` Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all repo content into a top-level `public/` directory while keeping hidden folders (e.g., `.git`, `.github`) at the root; allow existing `public/` to become `public/public/`.

**Architecture:** Physical file move only. Root retains hidden folders; everything else is moved under `public/`. Scripts and tooling will need to run from `public/` afterward.

**Tech Stack:** Git, shell, Vite, Node.

---

### Task 1: Inventory what will move

**Files:**
- Read: repo root

**Step 1: List root entries**

Run:
```bash
ls -a
```

Expected:
- Hidden folders stay at root (e.g., `.git`, `.github`)
- Everything else will move under `public/`

**Step 2: Confirm existing `public/`**

Note that `public/` already exists and will become `public/public/` after the move.

---

### Task 2: Move all non-hidden content into `public/`

**Files:**
- Move: all non-hidden entries from repo root into `public/`
- Move: hidden *files* from repo root into `public/` (hidden folders stay)

**Step 1: Create target folder**

Ensure `public/` exists.

**Step 2: Move non-hidden entries**

Move every root item that does not start with `.` into `public/`, excluding the `public/` folder itself.

**Step 3: Move hidden files**

Move hidden files (e.g., `.gitignore`, `.nvmrc`) into `public/`. Do **not** move hidden folders like `.git` or `.github`.

**Step 4: Validate layout**

Root should contain only hidden folders and the new `public/` directory.

---

### Task 3: Update usage notes (optional)

**Files:**
- Modify: `public/README.md` (if needed)

**Step 1: Add a short note**

Explain that commands should be run from `public/` going forward.

---

### Task 4: Verify and commit

**Step 1: Run tests (from new location)**

Run:
```bash
cd public
npm test
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: move repo contents into public folder"
```
