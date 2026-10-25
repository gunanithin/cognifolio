# Cognifolio Frontend Repository Rules & Engineering Guidelines

This document specifies the architectural conventions, design standards, testing mandates, and coding rules for the **Cognifolio** web application (`cognifolio`). All AI coding agents and engineers working in this repository must strictly adhere to these guidelines.

---

## 1. Architecture & Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev/) with Svelte 5 runes (`$state`, `$derived`, `$effect`) and backward-compatible Svelte component patterns.
- **Build Tool**: [Vite 5](https://vitejs.dev/) with `@sveltejs/vite-plugin-svelte`.
- **Test Framework**: [Vitest](https://vitest.dev/) with Node SSR component testing via `svelte/server`.
- **Styling**: Vanilla CSS with curated CSS variables and Tailwind utility integration. No arbitrary Tailwind utility bloat—always prioritize semantic, component-scoped CSS.
- **Document Rendering**: `pdfjs-dist` (v4 with web worker), custom Data Grid for spreadsheets, pan/zoom image viewport, and semantic DOM reader for Word/text.
- **Data Visualization**: `chart.js` for financial distributions and audit charts.

---

## 2. Luxury Editorial Design Standards

Cognifolio is an enterprise financial intelligence and legal audit platform. Its interface must exude premium quality, restraint, and visual excellence:

1. **Typography Hierarchy**:
   - **Headings & Display**: `Playfair Display`, Georgia, serif (`var(--font-heading)`). Editorial serif typography gives documents and dashboards an authoritative, bespoke appearance.
   - **Interface & Body**: `Inter`, system-ui, sans-serif (`var(--font-sans)`). High legibility and crisp vertical metrics.
   - **Financial Data & Code**: `JetBrains Mono`, monospace (`var(--font-mono)`). Used for amounts (`$12,400`), dates, transaction IDs, row numbering, and JSON attributes.
2. **Color Palette & Contrast**:
   - Primary Dark: Deep Charcoal `#111111` / Obsidian `#1a1a1a`.
   - Card Backgrounds: Clean stark white `#ffffff` or frosted translucent glass (`.glass-card`).
   - Page Canvas: Soft warm sand `#f6f6f6`.
   - Borders: Subtle hairline gray `#e5e5e5` (`1px solid #e5e5e5`).
   - Golden Accent / Highlights: Amber gold `#ca8a04` with soft halo `#fef08a` and glowing border `#fde047`.
   - Category Accents:
     - PDF: Rose/Wine (`bg-rose-50 text-rose-700 border-rose-200`)
     - Spreadsheets (XLSX, CSV): Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`)
     - Word Documents (DOCX): Indigo (`bg-indigo-50 text-indigo-700 border-indigo-200`)
     - Images (PNG, JPG, WEBP): Amber (`bg-amber-50 text-amber-700 border-amber-200`)
3. **No Placeholders or Generic MVPs**:
   - Never render raw unstyled text or generic blue links.
   - Interactive elements must have distinct `:hover`, `:active`, and `:focus-visible` styles with subtle micro-transitions (`transition: all 0.15s ease-out`).

---

## 3. UI Primitives (`src/lib/ui/`)

All reusable UI building blocks are encapsulated in `src/lib/ui/`. Components throughout the application must reuse these primitives rather than reinventing ad-hoc buttons or cards:

Component | Path | Purpose
:--- | :--- | :---
`CButton` | [`src/lib/ui/CButton.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CButton.svelte) | Primary, secondary, action, and chip buttons with built-in loading spinners.
`CCard` | [`src/lib/ui/CCard.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CCard.svelte) | Container with border, shadow, padding, and optional interactive hover.
`CBadge` | [`src/lib/ui/CBadge.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CBadge.svelte) | Status and entity tags with color variants (rose, emerald, indigo, amber, neutral).
`CTextBox` | [`src/lib/ui/CTextBox.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CTextBox.svelte) | Styled input with label, prefix icons, and error states.
`CSelect` | [`src/lib/ui/CSelect.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CSelect.svelte) | Standardized dropdown selector.
`CTabs` | [`src/lib/ui/CTabs.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CTabs.svelte) | Segmented control and editorial tab bars.
`CIcon` | [`src/lib/icons/CIcon.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/icons/CIcon.svelte) | Scalable vector icons and Canva graphic asset slots.
`CProgressBar` | [`src/lib/ui/CProgressBar.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CProgressBar.svelte) | Common progress bar for screen loads and long asynchronous calls.

---

## 4. Non-Negotiable Rules & Gotchas

### Rule 1: Snapshot Test Preservation in `CIcon.svelte`
- `src/lib/ui/__tests__/snapshots.test.js` contains snapshot tests for `CIcon.svelte` across `['document', 'lightning', 'building', 'shield', 'search']`.
- **CRITICAL**: Svelte 5 SSR renders comment anchors (`<!--[1--`, `<!--[2--`) corresponding to branch indices.
- **NEVER** reorder existing `{:else if name === '...'}` branches in `CIcon.svelte`.
- **ALWAYS** append new icons at the end of the chain, immediately before the final `{:else}` branch.

### Rule 2: Single Source of Truth for Progress Tracking
- Long network calls, file uploads, OCR processing, and document deletion operations must utilize the centralized store:
  ```javascript
  import { progress } from './lib/stores/progress.js';

  progress.start('Processing multi-format document...');
  try {
    await performOperation();
  } finally {
    progress.done();
  }
  ```
- `CProgressBar.svelte` is mounted once globally in `App.svelte` and reacts to the `progress` store. Never create duplicate ad-hoc progress bars in individual views.

### Rule 3: SSR & Node Test Environment Safety
- Unit and snapshot tests run in a Node.js SSR environment via `svelte/server`.
- Never access browser globals (`window`, `document`, `localStorage`, `sessionStorage`) at the top level of stores or modules without guards:
  ```javascript
  // Correct pattern:
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  ```
- Store functions like `setInterval` and `setTimeout` are standard across both Node and browser environments and do not require `typeof window` guards.

### Rule 4: Universal Multi-Format Document Viewer
- `PdfViewer.svelte` is a **universal document canvas**, not solely a PDF viewer.
- Must support 5 distinct categories dynamically:
  1. `pdf`: Visual PDF canvas rendered with `pdfjs-dist` + page navigation + real-time bounding boxes.
  2. `image` (`png`, `jpg`, `jpeg`, `webp`): High-resolution viewport with Zoom In (`+`), Zoom Out (`-`), Reset (`100%`), and OCR locator jump.
  3. `spreadsheet` (`xlsx`, `xls`, `csv`): Interactive data grid with sheet tab switching, row numbers (`#1`, `#2`), sticky headers, instant row filtering, and golden cell highlight matching `highlightQuery`.
  4. `docx` / `doc`: Editorial document reader with serif headings, formatted HTML tables, and bullet lists.
  5. `text` / `md`: Extracted text reader with focal line markers (`#focal-target-match`).
- Always support toggling between **Visual Mode** and **Extracted Text / OCR Mode** for every format.

### Rule 5: File Intake Whitelist
- The file input `accept` attribute in `App.svelte` must always include:
  ```html
  accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
  ```
- Never restrict the frontend dropzone to `.pdf` alone.

---

## 5. API Client & Authentication (`src/lib/api.js`)

- All requests are routed through `authFetch(endpoint, options)`.
- If a JWT is stored in `localStorage` under `cognifolio_access_token`, `authFetch` automatically injects the `Authorization: Bearer <token>` header.
- In development, `/api` calls are proxied by Vite (`vite.config.js`) to `http://localhost:8000`.
- If the backend is unreachable on port 8000, Vite responds with a `503 Service Unavailable` JSON payload rather than crashing with an opaque 500 HTML error.

---

## 6. Testing & Quality Verification

Run tests and verification before opening pull requests or pushing to main:

```bash
# 1. Run full Vitest test suite (SSR & component tests)
npm test -- --run

# 2. Run test suite with snapshot updates if UI primitives intentionally changed
npm run test:update

# 3. Verify production Vite build bundle
npm run build

# 4. Check code formatting
npm run format:check
```

---

## 7. Git Workflow & Mandatory Approval Rule

> [!CAUTION]
> ### Mandatory Developer Approval for Git Commits & Pushes
> **NEVER run `git commit`, `git push`, or alter remote git history without explicit developer approval and consent.**
> - AI agents and automated scripts must always propose changes, present diffs to the developer, and wait for explicit confirmation before executing `git commit` or `git push`.
> - Always summarize modified files and request developer authorization prior to committing or pushing code.

- **Branch**: Feature branches or `main`.
- **Commit Messages**: Follow Conventional Commits format:
  - `feat: ...` for new features or capabilities
  - `fix: ...` for bug fixes and defensive hardening
  - `test: ...` for test suite additions
  - `refactor: ...` for architecture improvements
