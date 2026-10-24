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
