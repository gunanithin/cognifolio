import { progress } from './stores/progress.js';
import {
  deriveClientCredential,
  createSecureAuthEnvelope,
  evaluatePasswordStrength,
} from './crypto/authCrypto.js';

const API_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  ''
).replace(/\/+$/, '');
const API_BASE = `${API_URL}/api/v1`;

export { progress, evaluatePasswordStrength };

const TOKEN_KEY = 'cognifolio_access_token';
const USER_KEY = 'cognifolio_user';

// ==========================================
// Authentication State Management
// ==========================================

export function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonStr;
    if (typeof atob === 'function') {
      jsonStr = atob(base64);
    } else if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    } else {
      return false;
    }
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return false;
    // 30-second leeway buffer prevents in-flight race condition on token expiration
    return Date.now() >= (payload.exp - 30) * 1000;
  } catch {
    return true;
  }
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearAuthSession();
    return null;
  }
  return token;
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  if (!getAuthToken()) {
    clearAuthSession();
    return null;
  }
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ==========================================
// Centralized Authenticated Fetch Client
// ==========================================

async function authFetch(endpoint, options = {}) {
  const { skipProgress = false, progressMessage = '', ...fetchOptions } = options;
  if (!skipProgress) {
    progress.start(progressMessage);
  }

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const token = getAuthToken();

    const headers = new Headers(fetchOptions.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (response.status === 401) {
      clearAuthSession();
    }

    return response;
  } catch (networkErr) {
    if (networkErr && !networkErr.status) {
      networkErr.status = 0;
      networkErr.endpoint = endpoint;
    }
    throw networkErr;
  } finally {
    if (!skipProgress) {
      progress.done();
    }
  }
}

function formatApiError(err, defaultMsg = 'Operation failed') {
  if (!err) return defaultMsg;
  if (typeof err === 'string') return err;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail) && err.detail.length > 0) {
    const first = err.detail[0];
    const field = first.loc ? first.loc[first.loc.length - 1] : '';
    if (field === 'email') {
      return 'Please enter a valid email address (e.g. name@company.io).';
    }
    if (field === 'password') {
      return 'Password does not meet required criteria.';
    }
    return first.msg || defaultMsg;
  }
  return err.message || defaultMsg;
}

// ==========================================
// Authentication Endpoints
// ==========================================

export async function registerUser(name, email, password) {
  try {
    const derivedCredential = await deriveClientCredential(password, email);
    const envelope = await createSecureAuthEnvelope(email, {
      name,
      credential: derivedCredential,
      raw_fallback: password,
    });

    const res = await authFetch('/auth/secure-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      progressMessage: 'Encrypting credentials & creating account...',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = formatApiError(err, 'Registration failed');
      const error = new Error(message);
      error.status = res.status;
      error.endpoint = '/auth/secure-register';
      error.correlation_id = err.correlation_id || res.headers.get('x-correlation-id');
      error.detail = err.detail;
      throw error;
    }

    const data = await res.json();
    setAuthSession(data.access_token, data.user);
    return data;
  } catch (err) {
    if (err.message && (err.message.includes('Web Cryptography') || err.message.includes('404'))) {
      const res = await authFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        progressMessage: 'Creating enterprise account...',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const message = formatApiError(errJson, 'Registration failed');
        const error = new Error(message);
        error.status = res.status;
        error.endpoint = '/auth/register';
        error.correlation_id = errJson.correlation_id || res.headers.get('x-correlation-id');
        error.detail = errJson.detail;
        throw error;
      }

      const data = await res.json();
      setAuthSession(data.access_token, data.user);
      return data;
    }
    throw err;
  }
}

export async function loginUser(email, password) {
  try {
    const derivedCredential = await deriveClientCredential(password, email);
    const envelope = await createSecureAuthEnvelope(email, {
      credential: derivedCredential,
      raw_fallback: password,
    });

    const res = await authFetch('/auth/secure-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      progressMessage: 'Encrypting session credentials...',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = formatApiError(err, 'Invalid email or password');
      const error = new Error(message);
      error.status = res.status;
      error.endpoint = '/auth/secure-login';
      error.correlation_id = err.correlation_id || res.headers.get('x-correlation-id');
      error.detail = err.detail;
      throw error;
    }

    const data = await res.json();
    setAuthSession(data.access_token, data.user);
    return data;
  } catch (err) {
    if (err.message && (err.message.includes('Web Cryptography') || err.message.includes('404'))) {
      const res = await authFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        progressMessage: 'Authenticating...',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const message = formatApiError(errJson, 'Invalid email or password');
        const error = new Error(message);
        error.status = res.status;
        error.endpoint = '/auth/login';
        error.correlation_id = errJson.correlation_id || res.headers.get('x-correlation-id');
        error.detail = errJson.detail;
        throw error;
      }

      const data = await res.json();
      setAuthSession(data.access_token, data.user);
      return data;
    }
    throw err;
  }
}

export async function startGuestSession() {
  const res = await authFetch('/auth/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    progressMessage: 'Initializing guest sandbox...',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to initialize guest playground session');
  }

  const data = await res.json();
  setAuthSession(data.access_token, data.user);
  return data;
}

export async function loginWithGoogle(idToken, email = null, name = null, avatarUrl = null) {
  const res = await authFetch('/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_token: idToken,
      email,
      name,
      avatar_url: avatarUrl,
    }),
    progressMessage: 'Verifying Google account...',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Google sign-in verification failed');
  }

  const data = await res.json();
  setAuthSession(data.access_token, data.user);
  return data;
}

export async function fetchUserProfile() {
  const res = await authFetch('/auth/me');
  if (!res.ok) {
    if (res.status === 401) {
      clearAuthSession();
    }
    return null;
  }
  const user = await res.json();
  setAuthSession(getAuthToken(), user);
  return user;
}

export function logout() {
  clearAuthSession();
}

// ==========================================
// Core Document & Intelligence Services
// ==========================================

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

export async function uploadDocument(file, retentionDays = 90) {
  // Pre-flight check: ensure an active authenticated session exists before payload dispatch
  if (!getAuthToken()) {
    await startGuestSession();
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('retention_days', retentionDays);

  let res = await authFetch('/documents/upload', {
    method: 'POST',
    body: formData,
    progressMessage: 'Uploading & extracting document intelligence...',
  });

  // Self-healing auto-recovery: if session token expired in flight or was revoked, refresh guest session and retry once
  if (res.status === 401) {
    const user = getCurrentUser();
    if (!user || user.is_guest || user.role === 'guest') {
      clearAuthSession();
      await startGuestSession();
      res = await authFetch('/documents/upload', {
        method: 'POST',
        body: formData,
        progressMessage: 'Uploading & extracting document intelligence (refreshed session)...',
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed');
  }

  return await res.json();
}

export async function listDocuments(filters = {}) {
  if (!getAuthToken()) {
    return { items: [], total: 0 };
  }
  const params = new URLSearchParams();
  if (filters.doc_type) params.append('doc_type', filters.doc_type);
  if (filters.status) params.append('status', filters.status);

  const res = await authFetch(`/documents?${params.toString()}`);
  if (!res.ok) {
    if (res.status === 401) {
      return { items: [], total: 0 };
    }
    throw new Error('Failed to fetch documents');
  }
  return await res.json();
}

export async function getDocument(id) {
  const res = await authFetch(`/documents/${id}`);
  if (!res.ok) throw new Error('Document not found');
  return await res.json();
}

export async function reanalyzeDocument(id) {
  const res = await authFetch(`/documents/${id}/reanalyze`, {
    method: 'POST',
    progressMessage: 'Re-analyzing document intelligence...',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to re-analyze document');
  }
  return await res.json();
}

export async function deleteDocument(id) {
  const res = await authFetch(`/documents/${id}`, {
    method: 'DELETE',
    progressMessage: 'Purging document & vector embeddings...',
  });
  if (!res.ok) {
    if (res.status === 404) {
      return { success: true, message: 'Document already deleted.' };
    }
    throw new Error('Failed to delete document');
  }
  return await res.json();
}

export async function semanticSearch(query, options = {}) {
  const res = await authFetch('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      document_type: options.document_type || null,
      limit: options.limit || 10,
    }),
    progressMessage: 'Searching neural vector embeddings...',
  });

  if (!res.ok) throw new Error('Search failed');
  return await res.json();
}

export async function getDashboardStats() {
  if (!getAuthToken()) {
    return {
      total_documents: 0,
      total_pages: 0,
      avg_confidence: 0,
      compliance_score: 100,
      status_breakdown: {},
      type_breakdown: {},
    };
  }
  const res = await authFetch('/dashboard/stats');
  if (!res.ok) {
    if (res.status === 401) {
      return {
        total_documents: 0,
        total_pages: 0,
        avg_confidence: 0,
        compliance_score: 100,
        status_breakdown: {},
        type_breakdown: {},
      };
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to load dashboard metrics');
  }
  return await res.json();
}

export async function getComplianceStats() {
  if (!getAuthToken()) {
    return null;
  }
  const res = await authFetch('/compliance/stats');
  if (!res.ok) {
    if (res.status === 401) return null;
    throw new Error('Failed to load compliance stats');
  }
  return await res.json();
}

export async function getAuditLogs(params = {}) {
  if (!getAuthToken()) {
    return { items: [], total: 0 };
  }
  const q = new URLSearchParams();
  if (params.action && params.action !== 'all') q.append('action', params.action);
  if (params.search) q.append('search', params.search);
  if (params.limit) q.append('limit', params.limit);
  if (params.offset) q.append('offset', params.offset);

  const res = await authFetch(`/compliance/audit-logs?${q.toString()}`);
  if (!res.ok) {
    if (res.status === 401) return { items: [], total: 0 };
    throw new Error('Failed to fetch audit logs');
  }
  return await res.json();
}

export async function triggerDocumentRedaction(id) {
  const res = await authFetch(`/compliance/redact/${id}`, {
    method: 'POST',
    progressMessage: 'Sanitizing PDF & applying physical redactions...',
  });
  if (!res.ok) throw new Error('Failed to apply redaction');
  return await res.json();
}

export function getDocumentFileUrl(id) {
  const token = getAuthToken();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE}/documents/${id}/file${tokenQuery}`;
}

export function getRedactedFileUrl(id) {
  const token = getAuthToken();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE}/documents/${id}/redacted-file${tokenQuery}`;
}

export async function downloadAuditExport(format = 'csv') {
  const res = await authFetch(`/compliance/export?format=${format}`, {
    progressMessage: `Exporting audit trail (${format.toUpperCase()})...`,
  });
  if (!res.ok) throw new Error('Failed to export audit logs');

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `cognifolio_audit_trail_${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export async function chatWithDocument(docId, message, conversationHistory = []) {
  const res = await authFetch(`/documents/${docId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversation_history: conversationHistory,
    }),
    progressMessage: 'Querying document intelligence...',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to process document chat query');
  }
  return await res.json();
}

export async function compareDocuments(baseDocumentId, targetDocumentId, focusAspects = null) {
  const payload = {
    base_document_id: baseDocumentId,
    target_document_id: targetDocumentId,
    ...(focusAspects && focusAspects.length ? { focus_aspects: focusAspects } : {}),
  };
  const res = await authFetch('/documents/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    progressMessage: 'Analyzing document diffs with AI...',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to compare documents');
  }
  return await res.json();
}

// ==========================================
// Developer Telemetry & Supabase Error Audit
// ==========================================

export async function fetchDeveloperTelemetryLogs(filters = {}, developerToken = null) {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.user_type) params.append('user_type', filters.user_type);
  if (filters.subsystem) params.append('subsystem', filters.subsystem);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.status_code) params.append('status_code', String(filters.status_code));
  if (filters.search) params.append('search', filters.search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const headers = {};
  if (developerToken) {
    headers['Authorization'] = `Bearer ${developerToken}`;
  }

  const res = await authFetch(`/telemetry/errors${qs}`, {
    method: 'GET',
    headers,
    skipProgress: true,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch telemetry audit logs');
  }

  return await res.json();
}

export async function fetchDeveloperTelemetryStats(developerToken = null) {
  const headers = {};
  if (developerToken) {
    headers['Authorization'] = `Bearer ${developerToken}`;
  }

  const res = await authFetch('/telemetry/stats', {
    method: 'GET',
    headers,
    skipProgress: true,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch telemetry metrics');
  }

  return await res.json();
}

export async function fetchTelemetryLogDetail(correlationId, developerToken = null) {
  const headers = {};
  if (developerToken) {
    headers['Authorization'] = `Bearer ${developerToken}`;
  }

  const res = await authFetch(`/telemetry/errors/${encodeURIComponent(correlationId)}`, {
    method: 'GET',
    headers,
    skipProgress: true,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch telemetry log for ${correlationId}`);
  }

  return await res.json();
}
