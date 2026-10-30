import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { generateCorrelationId, normalizeError, telemetry } from '../telemetry.js';

describe('Centralized Telemetry Store & Observability', () => {
  beforeEach(() => {
    telemetry.dismiss();
    vi.restoreAllMocks();
  });

  describe('generateCorrelationId()', () => {
    it('generates standard ERR-XXXX-XXXX format', () => {
      const cid = generateCorrelationId();
      expect(cid).toMatch(
        /^ERR-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/,
      );
    });

    it('generates unique IDs across calls', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('normalizeError()', () => {
    it('normalizes network disconnect into plain-English explanation', () => {
      const err = new TypeError('Failed to fetch');
      const record = normalizeError(err, { endpoint: '/api/v1/documents' });

      expect(record.category).toBe('network');
      expect(record.subsystem).toBe('ingestion');
      expect(record.severity).toBe('ERROR');
      expect(record.errorCode).toBe('NETWORK_DISCONNECTED');
      expect(record.title).toBe('Connection Interrupted');
      expect(record.userMessage).toContain('Unable to reach Cognifolio Cloud');
      expect(record.actionLabel).toBe('Check Connection');
      expect(record.correlationId).toMatch(/^ERR-/);
    });

    it('normalizes 503 gateway warming state', () => {
      const err = { message: 'Server backend not reachable on port 8000', status: 503 };
      const record = normalizeError(err);

      expect(record.category).toBe('gateway');
      expect(record.subsystem).toBe('server');
      expect(record.severity).toBe('WARNING');
      expect(record.errorCode).toBe('SERVICE_WARMING_UP');
      expect(record.title).toBe('System Warming Up');
      expect(record.userMessage).toContain('initializing or completing background tasks');
      expect(record.actionLabel).toBe('Retry Now');
    });

    it('normalizes 413 file ceiling into actionable guidance', () => {
      const err = new Error('File size exceeds maximum limit of 50MB');
      const record = normalizeError(err, { status_code: 413 });

      expect(record.category).toBe('document');
      expect(record.subsystem).toBe('ingestion');
      expect(record.severity).toBe('WARNING');
      expect(record.errorCode).toBe('FILE_EXCEEDS_50MB');
      expect(record.title).toBe('File Exceeds 50MB Limit');
      expect(record.userMessage).toContain('exceeds our 50MB single-upload capacity');
      expect(record.actionLabel).toBe('Select Smaller File');
    });

    it('normalizes 500 internal processing anomaly with critical severity', () => {
      const err = new Error('Database connection failed in Gemini extraction pipeline');
      const record = normalizeError(err, { status_code: 500, subsystem: 'ai_analysis' });

      expect(record.category).toBe('server');
      expect(record.subsystem).toBe('ai_analysis');
      expect(record.severity).toBe('CRITICAL');
      expect(record.errorCode).toBe('INTERNAL_PROCESSING_ANOMALY');
      expect(record.title).toBe('Processing Anomaly');
      expect(record.userMessage).toContain('unexpected analysis condition occurred');
    });
  });

  describe('telemetry reactive store', () => {
    it('sets and clears active alert via captureError and dismiss', () => {
      expect(get(telemetry)).toBeNull();

      const record = telemetry.captureError(new Error('Test runtime failure'), {
        title: 'Custom Title',
        duration: 0,
      });

      const current = get(telemetry);
      expect(current).not.toBeNull();
      expect(current.type).toBe('error');
      expect(current.id).toBe(record.correlationId);
      expect(current.title).toBe('Custom Title');

      telemetry.dismiss();
      expect(get(telemetry)).toBeNull();
    });

    it('displays success workspace notice via showSuccess', () => {
      telemetry.showSuccess('Document analyzed successfully', 0);

      const current = get(telemetry);
      expect(current).not.toBeNull();
      expect(current.type).toBe('success');
      expect(current.title).toBe('WORKSPACE NOTICE');
      expect(current.message).toBe('Document analyzed successfully');
    });
  });
});
