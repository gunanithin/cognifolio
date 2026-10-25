const API_BASE = '/api/v1';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

export async function uploadDocument(file, retentionDays = 90) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('retention_days', retentionDays);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Upload failed');
  }

  return await res.json();
}

export async function listDocuments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.doc_type) params.append('doc_type', filters.doc_type);
  if (filters.status) params.append('status', filters.status);

  const res = await fetch(`${API_BASE}/documents?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return await res.json();
}

export async function getDocument(id) {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error('Document not found');
  return await res.json();
}

export async function deleteDocument(id) {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return await res.json();
}

export async function semanticSearch(query, options = {}) {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      document_type: options.document_type || null,
      limit: options.limit || 10,
    }),
  });

  if (!res.ok) throw new Error('Search failed');
  return await res.json();
}

export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to load dashboard metrics');
  return await res.json();
}

export async function getComplianceStats() {
  const res = await fetch(`${API_BASE}/compliance/stats`);
  if (!res.ok) throw new Error('Failed to load compliance stats');
  return await res.json();
}

export async function getAuditLogs(params = {}) {
  const q = new URLSearchParams();
  if (params.action && params.action !== 'all') q.append('action', params.action);
  if (params.search) q.append('search', params.search);
  if (params.limit) q.append('limit', params.limit);
  if (params.offset) q.append('offset', params.offset);

  const res = await fetch(`${API_BASE}/compliance/audit-logs?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return await res.json();
}

export async function triggerDocumentRedaction(id) {
  const res = await fetch(`${API_BASE}/compliance/redact/${id}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to apply redaction');
  return await res.json();
}

export function getDocumentFileUrl(id) {
  return `${API_BASE}/documents/${id}/file`;
}

export function getRedactedFileUrl(id) {
  return `${API_BASE}/documents/${id}/redacted-file`;
}

export async function downloadAuditExport(format = 'csv') {
  const url = `${API_BASE}/compliance/export?format=${format}`;
  const res = await fetch(url);
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
  const res = await fetch(`${API_BASE}/documents/${docId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversation_history: conversationHistory,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to process document chat query');
  }
  return await res.json();
}
