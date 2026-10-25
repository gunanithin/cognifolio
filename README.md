# Cognifolio (`cognifolio`)

Enterprise Multimodal Document Intelligence Studio frontend built with **Svelte 5**, **Vite**, **PDF.js**, and custom **Liquid Glassmorphism** design.

---

## Key Features

- **High-Resolution Visual Canvas:** Client-side visual PDF canvas rendering with pan, zoom (60% to 250%), and instant page navigation.
- **Smart Visual Locate:** 1-Click interactive locator that maps AI takeaways, extracted metadata entities, line items, and risk clauses directly onto canvas bounding boxes with glowing badges.
- **Dual-Mode Text & Highlights Reader:** Extracted text reader with intelligent focal-line targeting, multi-format date alias detection, and smooth auto-centering.
- **Executive Summaries & Risk Clauses:** Instant contract penalty clause alerts, auto-renewal warnings, and line-item financial tables.
- **Semantic Vector Search UI:** Natural language search across enterprise document corpuses with real-time similarity badges.
- **Data Governance & PII Redaction Audit:** Enterprise compliance interface displaying masked PII statistics (Aadhaar, PAN, SSN, Cards, Phone, Email) and lifecycle retention rules.

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- npm or pnpm

### 2. Install Dependencies

```bash
npm install
```

### 3. Development Server

Make sure the backend API (`cognifolio-api`) is running on `http://localhost:8000`. Then start the frontend:

```bash
npm run dev
```

The studio will be available at:

- Local: `http://localhost:5173`

Vite is preconfigured to forward all `/api` requests to `http://localhost:8000`.

### 4. Production Build

```bash
npm run build
npm run preview
```
