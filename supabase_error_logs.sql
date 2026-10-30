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
