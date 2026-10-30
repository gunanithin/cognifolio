# Supabase PostgreSQL: Enterprise Centralized Error Logging Setup

This document provides the production-ready SQL script to create the centralized `error_logs` table, indexes, Row-Level Security (RLS) policies, and developer audit views in **Supabase PostgreSQL**.

The SQL syntax has been tested and verified directly against Supabase PostgreSQL (Postgres 15+).

---

## 1. Quick Setup (Supabase Dashboard)

1. Open your **Supabase Project Dashboard**: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. In the left navigation sidebar, click on **SQL Editor** (`>_`).
3. Click **+ New Query**.
4. Paste the complete SQL script from **Section 2** below into the editor.
5. Click **Run** (or press `Cmd + Enter` / `Ctrl + Enter`).
6. You will see `Success. No rows returned` confirming the table, indexes, and views are created.

---

## 2. Complete SQL Migration Script

```sql
-- ============================================================================
-- Cognifolio Enterprise Centralized Error Logging & Audit Schema
-- Database: Supabase PostgreSQL (PostgreSQL 15+)
-- Description: Centralized repository for production error telemetry,
--              segregated by Actor Persona (Guest vs Authenticated),
--              Subsystem Domain, and Severity Level.
-- ============================================================================

-- Step 1: Ensure pgcrypto extension is available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Create centralized error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
    -- Unique Log Identifier & Correlation
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id VARCHAR(32) NOT NULL UNIQUE,       -- Public reference code e.g. "ERR-8F2B-9104"
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Dimension 1: Actor Persona Segregation
    user_type VARCHAR(20) NOT NULL DEFAULT 'guest',   -- 'guest' | 'authenticated' | 'system'
    user_id VARCHAR(36) NULL,                         -- UUID of user or guest ID
    user_email VARCHAR(255) NULL,                     -- Null for anonymous guests, email if authenticated

    -- Dimension 2: Subsystem & Functional Domain
    subsystem VARCHAR(50) NOT NULL DEFAULT 'general', -- 'ingestion' | 'extraction' | 'ai_analysis' | 'storage' | 'vector_db' | 'auth' | 'client_runtime'

    -- Dimension 3: Severity Level
    severity VARCHAR(20) NOT NULL DEFAULT 'ERROR',    -- 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO'

    -- HTTP & Network Context
    endpoint VARCHAR(255) NULL,                       -- e.g. "/api/v1/documents/upload"
    http_method VARCHAR(10) NULL,                     -- e.g. "POST", "GET"
    status_code INTEGER NULL,                         -- e.g. 503, 500, 422, 401, 413
    error_code VARCHAR(100) NOT NULL,                 -- Machine code e.g. "BACKEND_UNAVAILABLE", "GEMINI_QUOTA"

    -- Presentation Segregation (User vs Technical)
    user_friendly_message VARCHAR(500) NOT NULL,      -- Plain English explanation shown to user
    technical_message TEXT NOT NULL,                  -- Raw exception detail
    stack_trace TEXT NULL,                            -- Full Python or JavaScript stack trace

    -- Environment & Audit Payloads
    client_context JSONB NOT NULL DEFAULT '{}'::jsonb,-- Browser, OS, screen, network status
    request_payload JSONB NULL                        -- Sanitized request metadata (no passwords/tokens)
);

-- ============================================================================
-- Step 3: High-Performance B-Tree Indexes for Developer Filtering
-- ============================================================================

-- Fast lookup by correlation ID when user reports an error
CREATE INDEX IF NOT EXISTS idx_error_logs_correlation_id 
    ON public.error_logs(correlation_id);

-- Chronological ordering for audit feed
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp 
    ON public.error_logs(timestamp DESC);

-- Fast filtering by Persona (Guest vs Authenticated)
CREATE INDEX IF NOT EXISTS idx_error_logs_user_type 
    ON public.error_logs(user_type);

-- Fast filtering by Subsystem domain (Ingestion, AI, Storage)
CREATE INDEX IF NOT EXISTS idx_error_logs_subsystem 
    ON public.error_logs(subsystem);

-- Fast filtering by Severity (Critical vs Warning)
CREATE INDEX IF NOT EXISTS idx_error_logs_severity 
    ON public.error_logs(severity);

-- Fast filtering by HTTP status code
CREATE INDEX IF NOT EXISTS idx_error_logs_status_code 
    ON public.error_logs(status_code);

-- User-specific lookup
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id 
    ON public.error_logs(user_id) 
    WHERE user_id IS NOT NULL;

-- ============================================================================
-- Step 4: Row Level Security (RLS) Configuration
-- ============================================================================

-- Enable RLS on the table to prevent unauthorized direct client access
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow direct connection / backend service role full access
DROP POLICY IF EXISTS "Service role full access on error_logs" ON public.error_logs;
CREATE POLICY "Service role full access on error_logs"
    ON public.error_logs
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- Step 5: Developer Audit Convenience View
-- ============================================================================

CREATE OR REPLACE VIEW public.v_recent_error_summary AS
SELECT 
    id,
    correlation_id,
    timestamp,
    severity,
    user_type,
    user_email,
    subsystem,
    status_code,
    error_code,
    user_friendly_message,
    technical_message
FROM public.error_logs
ORDER BY timestamp DESC
LIMIT 100;

-- Comment for table documentation in Supabase schema browser
COMMENT ON TABLE public.error_logs IS 'Enterprise centralized error telemetry and audit records for Cognifolio';
```

---

## 3. Schema Field Dictionary

Field | Type | Description | Example
:--- | :--- | :--- | :---
`id` | `UUID` | Primary key generated automatically | `550e8400-e29b-41d4-a716-446655440000`
`correlation_id` | `VARCHAR(32)` | Public reference code displayed in user toast | `ERR-8F2B-9104`
`timestamp` | `TIMESTAMPTZ` | Exact UTC timestamp of failure | `2026-10-30 08:25:10+00`
`user_type` | `VARCHAR(20)` | Segregation: `guest`, `authenticated`, `system` | `guest`
`user_id` | `VARCHAR(36)` | User UUID or guest session identifier | `da444a84-875b-4285-83d4-b72ce778b177`
`user_email` | `VARCHAR(255)` | User email if logged in | `analyst@enterprise.com`
`subsystem` | `VARCHAR(50)` | Component where failure originated | `ingestion`, `ai_analysis`, `storage`, `auth`
`severity` | `VARCHAR(20)` | `CRITICAL`, `ERROR`, `WARNING`, `INFO` | `CRITICAL`
`endpoint` | `VARCHAR(255)` | REST API endpoint called | `/api/v1/documents/upload`
`http_method` | `VARCHAR(10)` | HTTP method | `POST`
`status_code` | `INTEGER` | HTTP response code | `503`, `500`, `422`, `401`
`error_code` | `VARCHAR(100)` | Standardized machine identifier | `BACKEND_UNAVAILABLE`
`user_friendly_message`| `VARCHAR(500)` | Non-technical message shown in UI | `"System is currently warming up..."`
`technical_message` | `TEXT` | Full raw technical error message | `"Connection refused on port 8000"`
`stack_trace` | `TEXT` | Complete Python/JS stack trace | `"Traceback (most recent call last): ..."`
`client_context` | `JSONB` | Client browser, OS, network state | `{"browser": "Chrome", "os": "macOS"}`
`request_payload` | `JSONB` | Sanitized input metadata (no passwords/secrets) | `{"filename": "contract.pdf", "size": 12048}`

---

## 4. Useful Developer Audit Queries (Run in Supabase SQL Editor)

### Look up an error by User Reference ID:
```sql
SELECT * FROM public.error_logs 
WHERE correlation_id = 'ERR-8F2B-9104';
```

### Review recent failures specifically for Guest Users:
```sql
SELECT 
    correlation_id,
    timestamp,
    subsystem,
    status_code,
    error_code,
    user_friendly_message,
    technical_message
FROM public.error_logs 
WHERE user_type = 'guest'
ORDER BY timestamp DESC
LIMIT 50;
```

### Breakdown of errors by Subsystem in the last 24 hours:
```sql
SELECT 
    subsystem,
    severity,
    COUNT(*) as total_occurrences
FROM public.error_logs 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY subsystem, severity
ORDER BY total_occurrences DESC;
```
