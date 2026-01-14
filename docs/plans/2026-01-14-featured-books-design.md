# Featured Books Randomized Per Session

## Goal
Make the Home page “Featured Books” selection random per browser session while keeping the selection stable for the rest of the session.

## Scope
- Home page only (`src/pages/Index.tsx`).
- Use existing `useBooks()` data source without changing data files.
- Pick up to 3 unique SKUs.

## Behavior
- On first visit in a session, choose 3 random unique SKUs.
- Persist the selected `sku_id` list in `sessionStorage`.
- On subsequent renders within the same session, reuse the stored IDs.
- If stored IDs are missing/invalid (e.g., data changed), reselect and overwrite.
- If fewer than 3 SKUs exist, show all available.

## Data Flow
- Read `skus` from `useBooks()`.
- Resolve featured list via `sessionStorage`:
  - Read stored `sku_id` array.
  - Map IDs to SKU objects; validate count.
  - If invalid/missing, shuffle and store new IDs.
- Render the resolved list in the existing grid.

## Implementation Notes
- Use a stable key like `featuredSkus` in `sessionStorage`.
- Implement a simple in-place shuffle (Fisher–Yates) on a copy of `skus`.
- Guard access to `window/sessionStorage` with `typeof window !== 'undefined'`.
- Fallback to the first 3 items if storage fails (e.g., JSON parse error).

## Testing
- Manual: reload the page in the same tab and verify the featured list stays the same.
- Manual: open a new tab or incognito window and verify a new random selection appears.
