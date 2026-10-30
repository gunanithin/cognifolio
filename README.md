# Cognifolio (`cognifolio`)

> **Luxury Editorial Document Intelligence Studio & Legal/Financial Audit Interface**  
> Built with **Svelte 5**, **Vite 5**, **PDF.js v4**, **Chart.js**, and an **Obsidian & Gold Glassmorphic Design System**.

---

## 1. Executive Overview & Design Philosophy

**Cognifolio** is an enterprise-grade document intelligence and legal/financial audit studio tailored for banking, private equity, corporate legal counsel, and risk compliance teams.

Most enterprise financial and legal software looks like dated, utilitarian database portals. Cognifolio redefines enterprise software by marrying **luxury editorial aesthetics** with **hardened, high-performance client engineering**:

- **Editorial Typography Hierarchy**: High-contrast typography pairing **Playfair Display** (authoritative editorial headings), **Inter** (crisp, high-legibility interface controls), and **JetBrains Mono** (monospaced numerical accuracy for financial currency amounts, transaction hashes, bounding coordinates, and timestamps).
- **Curated Color Spectrum**: Soft warm sand canvas (`#f6f6f6`), deep obsidian charcoal cards (`#111111` / `#1a1a1a`), hairline silver borders (`#e5e5e5`), and an amber-gold accent (`#ca8a04`) with glowing halos (`#fef08a`) that pulse upon spatial entity discovery.
- **Universal Multi-Format Ingestion**: One unified canvas seamlessly handles PDFs, high-res image scans, multi-sheet Excel spreadsheets (`.xlsx`), CSV ledgers, Microsoft Word documents (`.docx`), and Markdown records without third-party iframe embeds or proprietary browser plugins.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       COGNIFOLIO LUXURY STUDIO CANVAS                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  [Header: Cognifolio Editorial Studio] ── [Global Progress Meter] ── [SOC2 / GDPR Badge] ── [User Session: Active]
 ┌──────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┐
 │ 📁 DOCUMENT VAULT & INTAKE           │ 👁️ UNIVERSAL DOCUMENT VIEWER                                          │
 │ ├─ Invoices & Spreadsheets (.xlsx)   │ ┌────────────────────────────────────────────────────────────────────┐ │
 │ ├─ Service Agreements (.docx, .pdf)  │ │ [Visual Mode] [OCR Extracted Mode] | Zoom: [-] [100%] [+]          │ │
 │ └─ Visual Receipts & Scans (.png)    │ │                                                                    │ │
 │                                      │ │   ┌────────────────────────┐                                       │ │
 ├──────────────────────────────────────┤ │   │ 🔲 Golden Bounding Box │ ◄── [Pulsing Spatial Match on Leaf]   │ │
 │ 📊 EXECUTIVE INTELLIGENCE            │ │   └────────────────────────┘                                       │ │
 │ ├─ Key Takeaways & Summary           │ └────────────────────────────────────────────────────────────────────┘ │
 │ ├─ Identified Financial Entities     ├────────────────────────────────────────────────────────────────────────┤
 │ ├─ Risk & Penalty Clause Alerts      │ 💬 CONVERSATIONAL RAG & REDLINE DIFF                                   │
 │ └─ Granular Line-Item Tables         │ ├─ "What is the indemnification cap in Section 4.2?"                   │
 └──────────────────────────────────────┴─┴─ Verbatim Citation Pill ──► [Auto-scrolls & highlights canvas]       │
```

---

## 2. Catchy Highlights & Core Capabilities

### ⚡ 1. Universal Multi-Format Document Canvas

Unlike legacy viewers restricted to standard PDFs, Cognifolio’s canvas dynamically adapts across 5 distinct document architectures:

- **PDF Engine**: Client-side rendering via **PDF.js v4** web worker with responsive vector scaling, smooth scrolling, and dynamic multi-page coordinate normalization.
- **High-Resolution Visual Viewport**: Custom image reader supporting PNG, JPG, JPEG, and WebP scans with interactive Zoom In (`+`), Zoom Out (`-`), Reset (`100%`), and pan controls.
- **Financial Spreadsheet Grid**: Interactive data grid for `.xlsx`, `.xls`, and `.csv` files featuring instant sheet tab navigation, sticky column headers, monospaced row numbering (`#1`, `#2`), and instant cell filtering.
- **Editorial Word Reader**: Native DOM renderer for `.docx` and `.doc` files presenting styled serif headings, formatted HTML tables, and nested bullet clauses.
- **Source Text & OCR Reader**: Monospaced text viewport with instant target anchors (`#focal-target-match`) for deep lexical inspection.

### 🎯 2. Spatial Golden Locator (`box_2d`)

Cognifolio bridges generative AI extraction with physical spatial reality:

- Clicking any extracted entity (such as vendor tax IDs, total contract sums, effective dates, or risk penalties) triggers an instant viewport jump.
- The canvas smooth-scrolls to the exact page or pixel offset and illuminates the item with a **pulsing amber-gold bounding rectangle** (`box_2d` normalized coordinates on a 0–1000 scale).

### 💬 3. Grounded Conversational Document RAG

Interact naturally with complex agreements, audits, and statements:

- Context-aware multi-turn chat powered by Google Gemini.
- **Verbatim Citation Pills**: Every AI response cites precise evidentiary phrases. Clicking a citation pill scrolls the canvas directly to the supporting clause in the source document.
- **Suggested Follow-Ups**: Proactively proposes high-impact follow-up inquiries (e.g., _"Check Net-30 payment terms"_, _"Verify termination without cause requirements"_).

### ⚖️ 4. Side-by-Side Redline Contract Diff

Automated contract version auditing between two legal agreements (Base vs. Target):

- Automatically classifies clause differences by severity (**Critical Risk**, **Financial Impact**, **Standard Clause Modification**, **Administrative**).
- Computes overall legal similarity percentages and displays executive summaries of contractual liability changes.

### 🛡️ 5. Zero-Trust Privacy & Compliance Suite

Engineered for enterprise banking, healthcare (HIPAA), and international privacy (GDPR / SOC2):

- **Pre-AI Sanitization Transparency**: Visual breakdown of masked identifiers (Indian Aadhaar, PAN Cards, US SSNs, Credit Cards, Bank Accounts, Phone Numbers, Emails).
- **Automated Retention Lifecycle**: Visual indicator tracking 90-day automated TTL purging (GDPR Article 17 Right-to-Erasure compliance).
- **Cryptographic Audit Export**: Authenticated one-click download of the complete immutable event trail in CSV or JSON format.

### 🔐 6. Zero-Knowledge Client-Side Encrypted Authentication

Enterprise credential protection powered by the **W3C Web Crypto API**:

- **Pre-Transmission RSA-2048 Envelope Encryption**: Passwords and credentials never cross the wire in plaintext. The client fetches the backend’s RSA-2048 public key, generates an ephemeral AES-256-GCM symmetric session key, encrypts the payload, and wraps the key via RSA-OAEP.
- **Client Credential Derivation**: Domain-salted PBKDF2 credential derivation (100,000 iterations) producing deterministic `CF$...` tokens, preventing rainbow table attacks and credential snooping in transit.
- **Guest Session Continuity**: Seamlessly upgrades anonymous guest sessions into persistent encrypted vaults upon registration without losing uploaded documents.

### 📊 7. Developer Observability & Telemetry Audit Console

Integrated observability for enterprise site reliability and compliance engineers:

- **Role-Based Access Control (RBAC)**: Gated strictly to accounts with the `developer` or `admin` role.
- **Live Health Metrics**: 4 real-time KPI ribbon cards displaying Error Rate, P95 Latency, Total Events, and Active Incidents.
- **Correlation ID Tracking**: Every client-side or API exception issues an empathetic toast with an instant 1-click copyable Reference ID (`ERR-XXXX-XXXX`) linked directly to Supabase PostgreSQL audit logs.
- **Incident Investigation Drawer**: Searchable, filterable incident grid with deep inspection of stack traces, HTTP status codes, client environment context, and direct SQL forensic query hints.

### ☁️ 8. Cloud-Native GCS Document Streaming

Zero local device storage footprint for high-security enterprise environments:

- Documents are archived in **Google Cloud Storage (GCS)** (`gs://cognifolio-prod-storage/`) and streamed directly to the client canvas with dynamic MIME handling and `Content-Disposition: inline`.
- Supports viewing and switching between original documents and compliance-redacted copies with physically burned-in black-box masks.

---

## 3. Technology Stack & Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     FRONTEND ARCHITECTURE                                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
       UI LAYER                   REACTIVE STATE                     RENDERING & I/O
 ┌───────────────────┐        ┌──────────────────────┐        ┌────────────────────────────┐
 │  Svelte 5 Runes   │  ◄──►  │ Central Progress Bar │  ◄──►  │ PDF.js v4 Web Worker Canvas │
 │  Playfair / Inter │        │ Auth & User Store    │        │ High-Res Image Viewport    │
 └───────────────────┘        └──────────────────────┘        └────────────────────────────┘
          │                              │                                   │
          ▼                              ▼                                   ▼
 ┌───────────────────┐        ┌──────────────────────┐        ┌────────────────────────────┐
 │ Modular UI        │        │ authFetch Client     │        │ Chart.js Financial Visuals │
 │ Design Primitives │  ◄──►  │ (JWT Auto-Injection) │  ◄──►  │ Interactive Data Grid      │
 │ (src/lib/ui/)     │        │ Vite Proxy (/api)    │        │ (.xlsx / .csv Sheet Parser)│
 └───────────────────┘        └──────────────────────┘        └────────────────────────────┘
```

| Domain                 | Technology                                  | Version    | Purpose & Architectural Justification                                                                                                 |
| :--------------------- | :------------------------------------------ | :--------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| **Framework**          | [Svelte 5](https://svelte.dev/)             | `^5.0.0`   | Ultra-lean compiled reactive architecture with modern Svelte 5 runes (`$state`, `$derived`, `$effect`) for zero virtual DOM overhead. |
| **Build Tool**         | [Vite](https://vitejs.dev/)                 | `^5.4.0`   | Sub-millisecond Hot Module Replacement (HMR) and optimized Rollup production asset chunking.                                          |
| **Document Canvas**    | [PDF.js](https://mozilla.github.io/pdf.js/) | `^4.0.379` | Multi-threaded client-side visual PDF parsing using dedicated background Web Workers.                                                 |
| **Cryptography**       | [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) | Native W3C | RSA-OAEP (2048-bit), AES-256-GCM envelope encryption, and PBKDF2 credential derivation directly in the browser runtime.               |
| **Cloud Storage**      | [Google Cloud Storage (GCS)](https://cloud.google.com/storage) | API Stream | Direct inline streaming of original and redacted documents from `gs://cognifolio-prod-storage/` without local device storage footprint.|
| **Observability**      | Centralized Telemetry + Supabase PostgreSQL | `v1.0.0`   | Correlation ID tracking (`ERR-...`), client error logging, real-time KPI ribbon metrics, and developer audit console.               |
| **Data Visualization** | [Chart.js](https://www.chartjs.org/)        | `^4.4.0`   | Financial distribution donut charts and compliance audit trail line graphs.                                                           |
| **Typography**         | Google Fonts                                | Web        | Curated editorial pairing: `Playfair Display` (headings), `Inter` (UI body), `JetBrains Mono` (financial data/code).                  |
| **Styling**            | Vanilla CSS + Tokens                        | Native     | Zero CSS-in-JS runtime overhead; bespoke CSS custom properties with scoped micro-transitions.                                         |
| **Testing**            | [Vitest](https://vitest.dev/)               | `^2.1.0`   | Node.js SSR component unit and snapshot testing via `svelte/server`.                                                                  |

---

## 4. UI Design Primitives (`src/lib/ui/`)

All reusable interface controls are strictly encapsulated in `src/lib/ui/`. Components throughout the application consume these primitives to ensure consistent editorial styling and accessible keyboard navigation:

| Primitive      | Path                                                                                                                                   | Features & Variant System                                                                                                                                               |
| :------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CButton`      | [`src/lib/ui/CButton.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CButton.svelte)           | Variants: `primary` (obsidian charcoal), `secondary` (translucent frosted), `action` (golden amber), and `chip`. Built-in loading spinners and disabled state handling. |
| `CCard`        | [`src/lib/ui/CCard.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CCard.svelte)               | Architectural container with hairline border (`#e5e5e5`), soft shadow, rounded corners, and optional interactive hover elevation (`.glass-card`).                       |
| `CBadge`       | [`src/lib/ui/CBadge.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CBadge.svelte)             | Status and entity chips with color coding: `rose` (PDF), `emerald` (Spreadsheets), `indigo` (Word), `amber` (Images / Gold locator), and `neutral`.                     |
| `CTextBox`     | [`src/lib/ui/CTextBox.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CTextBox.svelte)         | Input field with floating label, prefix vector icons, clear buttons, and validated error feedback.                                                                      |
| `CSelect`      | [`src/lib/ui/CSelect.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CSelect.svelte)           | Standardized accessible dropdown with custom chevron and focus ring styling.                                                                                            |
| `CTabs`        | [`src/lib/ui/CTabs.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CTabs.svelte)               | Segmented control and editorial tab switcher with sliding underline active indicator.                                                                                   |
| `CIcon`        | [`src/lib/icons/CIcon.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/icons/CIcon.svelte)         | Scalable vector icon library. _Note: Chains must strictly preserve branch order to protect snapshot test anchors._                                                      |
| `CProgressBar` | [`src/lib/ui/CProgressBar.svelte`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio/src/lib/ui/CProgressBar.svelte) | Single global top-mounted progress meter hooked into the centralized progress store.                                                                                    |

---

## 5. Engineering Best Practices & Architecture Patterns

### 1. Single Source of Truth for Progress Tracking

All long-running network operations (multi-megabyte uploads, OCR vision processing, document deletions) route through the centralized store:

```javascript
import { progress } from './lib/stores/progress.js';

progress.start('Processing visual document scan with Gemini 3.5 Flash...');
try {
  await uploadDocument(file);
} finally {
  progress.done();
}
```

`CProgressBar.svelte` is mounted once globally in `App.svelte` and reacts to this store. Ad-hoc duplicate progress bars are prohibited.

### 2. Zero-Lag Optimistic Upload Completion

When `uploadDocument` completes, the client immediately prepends the returned document to the active list and switches directly to the viewer tab without artificial `setTimeout` freezes:

```javascript
const res = await uploadDocument(fileToUpload, retentionDays);
selectedDoc = res;
documents = [res, ...documents.filter((d) => d.id !== res.id)];
isUploading = false;
activeTab = 'viewer';
refreshAll().catch(() => {}); // Refresh stats asynchronously in background
```

### 3. Server-Side Rendering (SSR) & Test Safety

Snapshot and component tests run in a Node.js SSR runtime via `svelte/server`. Browser globals (`window`, `document`, `localStorage`, `sessionStorage`) must never be called at the root level of stores or modules without guards:

```javascript
// Correct pattern:
const token =
  typeof window !== 'undefined' ? localStorage.getItem('cognifolio_access_token') : null;
```

### 4. Resilient API Gateway Proxy (`src/lib/api.js`)

All communication with `cognifolio-api` is routed through `authFetch(endpoint, options)`:

- In development, requests to `/api` are automatically proxied by Vite (`vite.config.js`) to `http://localhost:8000`.
- Automatically injects `Authorization: Bearer <token>` when a session JWT exists.
- In the event of backend offline status, Vite responds with an informative `503 Service Unavailable` JSON envelope rather than an unhandled HTML crash.

### 5. Zero-Knowledge Client-Side Encryption (`src/lib/crypto/authCrypto.js`)

Cognifolio protects authentication credentials before network transmission using browser-native cryptography:

```javascript
import { createSecureAuthEnvelope, deriveClientCredential } from './lib/crypto/authCrypto.js';

// 1. Derive domain-salted deterministic client credential
const clientCredential = await deriveClientCredential(email, password);

// 2. Wrap credential into hybrid RSA-2048 + AES-256-GCM envelope
const envelope = await createSecureAuthEnvelope(
  { email, clientCredential, timestamp: Date.now() },
  serverRsaPublicKeyPem
);

// 3. Dispatch to secure endpoints (/api/v1/auth/secure-login or /secure-register)
await authFetch('/api/v1/auth/secure-login', {
  method: 'POST',
  body: JSON.stringify({ envelope })
});
```

- **Zero Plaintext Transmission**: Plaintext passwords never leave the client or enter network traces.
- **W3C Web Crypto Standard**: Executes in hardware-accelerated browser cryptographic modules without heavy external npm libraries.

### 6. Centralized Telemetry & Error Correlation (`src/lib/stores/telemetry.js`)

All system anomalies, network failures, and processing errors trigger the centralized telemetry engine:

- Generates unique correlation IDs formatted as `ERR-XXXX-XXXX`.
- Displays empathetic, plain-English notifications with a **1-click "Copy Ref ID"** action for instant developer reporting.
- Reports error details asynchronously to the backend telemetry router (`POST /api/v1/telemetry/errors`), recording subsystem, HTTP status, and client browser metadata in Supabase PostgreSQL.

### 7. Role-Based Developer Audit Console (`src/lib/components/DeveloperAuditModal.svelte`)

Enterprise observability designed specifically for platform engineers:

- **RBAC Security**: Only accessible to authenticated accounts with `developer` or `admin` roles; hidden from standard analysts.
- **Real-Time KPI Ribbon**: Tracks system health via 4 live metrics: Error Rate (%), P95 Latency (ms), Total Events, and Active Incidents.
- **Incident Inspection Drawer**: Interactive drawer with stack traces, client runtime context, payload previews, and direct Supabase SQL query references. Stays anchored during inspection and closes via outside clicks or the close button.
- **Forensic Export**: One-click JSON export of filtered audit logs for local developer debugging.

### 8. Cloud-Native GCS Streaming & Zero Local Footprint

Original files and burned-in redacted copies are streamed directly from **Google Cloud Storage (GCS)**:

- Client uses secure streaming endpoints (`/api/v1/documents/{id}/file` and `redacted-file`) with JWT authentication via headers or `?token=` parameters.
- Viewports dynamically render PDF, Word, Excel, and Image bytes directly from cloud storage streams without downloading files to local client disks.

### 9. Mandatory Default Error Handling Standard

In accordance with Cognifolio engineering guidelines, all new code, async operations, and user interactions **must** implement defensive error handling:

- **No Silent Swallowing**: Empty catch blocks (`catch (err) {}`) are strictly prohibited.
- **State Recovery in `finally`**: Progress bars (`progress.done()`) and loading flags (`isLoading = false`) must always be restored inside `finally` blocks so UI components never freeze upon failure.
- **Defensive Property Access**: Use optional chaining (`data?.items || []`) and sensible fallbacks across all API responses.

---

## 6. Getting Started & Development Workflow

### Prerequisites

- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **Package Manager**: `npm` (v9+) or `pnpm`
- **Backend Service**: [`cognifolio-api`](file:///Users/gunanithin/.gemini/antigravity-ide/scratch/cognifolio-api) running on `http://localhost:8000`

### 1. Installation

```bash
# Clone and enter the frontend repository
cd cognifolio

# Install clean dependencies
npm install
```

### 2. Start Local Development Server

```bash
npm run dev
```

The studio will be available at:

- **Local Studio URL**: `http://localhost:5173`
- **API Proxy Target**: `http://localhost:8000`

### 3. Verification & Quality Assurance Suite

Always verify tests and production builds before committing code:

```bash
# Run full Vitest test suite (SSR & component tests)
npm test -- --run

# Update snapshots if UI primitives were intentionally modified
npm run test:update

# Verify production Vite build bundle
npm run build

# Run code style formatting check
npm run format:check
```

---

## 7. Supported Document File Formats

Cognifolio features an open intake dropzone supporting 12+ enterprise formats:

| Category                   | File Extensions                  | Rendering Mode                                                                      |
| :------------------------- | :------------------------------- | :---------------------------------------------------------------------------------- |
| **Portable Documents**     | `.pdf`                           | PDF.js canvas with visual bounding box overlay & page controls                      |
| **High-Res Visual Scans**  | `.png`, `.jpg`, `.jpeg`, `.webp` | High-DPI viewport with pan, zoom (60% to 250%), and spatial leaf highlights         |
| **Financial Spreadsheets** | `.xlsx`, `.xls`, `.csv`          | Interactive data grid with sheet tabs, row counters, sticky headers & cell matching |
| **Word Processors**        | `.docx`, `.doc`                  | Formatted editorial reader with serif typography and HTML tables                    |
| **Plain Text & Code**      | `.txt`, `.md`                    | Monospaced reader with focal line jump markers (`#focal-target-match`)              |

---

## 8. Git Workflow & Mandatory Approval Rule

> [!CAUTION]
>
> ### Mandatory Developer Approval for Git Commits & Pushes
>
> **NEVER run `git commit`, `git push`, or alter remote git history without explicit developer approval and consent.**
>
> - Automated tools and AI agents must always propose changes, present diffs to the developer, and wait for explicit confirmation before executing `git commit` or `git push`.
> - Always summarize modified files and request developer authorization prior to committing or pushing code.

- **Branch**: `main` or feature branches.
- **Commit Format**: Conventional Commits (`feat: ...`, `fix: ...`, `test: ...`, `refactor: ...`).

---

## 9. License & Credits

Cognifolio Studio is proprietary software. All rights reserved.  
Built with pride for high-trust document intelligence, compliance audits, and financial risk governance.
