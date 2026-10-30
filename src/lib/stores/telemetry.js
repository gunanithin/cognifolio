import { writable } from 'svelte/store';
import { getCurrentUser } from '../api.js';

// Base API endpoint for telemetry beaconing
const API_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  ''
).replace(/\/+$/, '');
const TELEMETRY_URL = `${API_URL}/api/v1/telemetry/errors`;

/**
 * Generates an unambiguous, human-readable Correlation / Reference ID.
 * Excludes easily confused characters (0, O, 1, I).
 * Example output: "ERR-7F2B-9104"
 */
export function generateCorrelationId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return `ERR-${p1}-${p2}`;
}

/**
 * Normalizes any caught error, HTTP response, or exception into:
 * 1. Empathetic, plain-English user explanation
 * 2. Enterprise audit telemetry record with subsystem, severity, and technical stack trace
 */
export function normalizeError(err, context = {}) {
  const correlationId = context.correlation_id || generateCorrelationId();
  const rawMsg =
    err?.message || (typeof err === 'string' ? err : 'An unexpected exception occurred');
  const statusCode = context.status_code || err?.status || err?.statusCode || null;
  const endpoint = context.endpoint || null;
  const method = context.method || 'POST';

  let category = 'general';
  let subsystem = context.subsystem || 'general';
  let severity = 'ERROR';
  let errorCode = context.error_code || 'UNEXPECTED_ERROR';
  let title = 'Attention Required';
  let userMessage = 'We encountered an unexpected condition while processing your request.';
  let actionLabel = 'Dismiss';
  let actionHandler = context.actionHandler || null;

  // 1. Connection & Gateway Errors
  if (
    rawMsg.includes('Failed to fetch') ||
    rawMsg.includes('NetworkError') ||
    rawMsg.includes('Network request failed') ||
    statusCode === 0
  ) {
    category = 'network';
    subsystem = subsystem === 'general' ? 'ingestion' : subsystem;
    severity = 'ERROR';
    errorCode = 'NETWORK_DISCONNECTED';
    title = 'Connection Interrupted';
    userMessage =
      'Unable to reach Cognifolio Cloud. Please check your internet connection and try again.';
    actionLabel = 'Check Connection';
  } else if (
    statusCode === 503 ||
    rawMsg.includes('503') ||
    rawMsg.includes('BACKEND_UNAVAILABLE') ||
    rawMsg.includes('not reachable on port 8000')
  ) {
    category = 'gateway';
    subsystem = 'server';
    severity = 'WARNING';
    errorCode = 'SERVICE_WARMING_UP';
    title = 'System Warming Up';
    userMessage =
      'Our processing engine is currently initializing or completing background tasks. Please retry in a few moments.';
    actionLabel = 'Retry Now';
  }

  // 2. Authentication & Session Errors
  else if (
    subsystem === 'auth' ||
    endpoint?.includes('/auth/') ||
    statusCode === 401 ||
    rawMsg.includes('401') ||
    rawMsg.includes('Signature has expired') ||
    rawMsg.includes('Invalid or expired authentication') ||
    rawMsg.includes('Invalid email or password') ||
    rawMsg.includes('credentials')
  ) {
    category = 'auth';
    subsystem = 'auth';
    actionLabel = 'Dismiss';

    if (rawMsg.includes('Invalid email or password') || rawMsg.includes('credentials')) {
      severity = 'WARNING';
      errorCode = 'INVALID_CREDENTIALS';
      title = 'Authentication Failed';
      userMessage =
        'The email or password you entered is incorrect. Please verify your credentials and try again.';
      actionLabel = 'Try Again';
    } else if (
      statusCode === 429 ||
      rawMsg.includes('Too many') ||
      rawMsg.includes('locked') ||
      rawMsg.includes('Lockout')
    ) {
      severity = 'ERROR';
      errorCode = 'ACCOUNT_LOCKED';
      title = 'Security Shield Activated';
      userMessage =
        'Multiple failed attempts detected. For your security, this account is temporarily protected. Please wait a minute and retry.';
      actionLabel = 'Wait & Retry';
    } else if (
      statusCode === 409 ||
      rawMsg.includes('already registered') ||
      rawMsg.includes('exists')
    ) {
      severity = 'WARNING';
      errorCode = 'ACCOUNT_ALREADY_EXISTS';
      title = 'Account Already Exists';
      userMessage =
        'An enterprise account with this email address already exists. Please sign in instead.';
      actionLabel = 'Sign In';
    } else if (
      statusCode === 422 ||
      rawMsg.includes('422') ||
      rawMsg.toLowerCase().includes('email') ||
      rawMsg.toLowerCase().includes('password')
    ) {
      severity = 'WARNING';
      errorCode = 'AUTH_VALIDATION_ERROR';
      title = 'Validation Notice';
      if (rawMsg.toLowerCase().includes('email')) {
        userMessage = 'Please provide a valid work email address (e.g. name@company.io).';
      } else if (rawMsg.toLowerCase().includes('password')) {
        userMessage =
          'Password must be at least 8 characters with sufficient cryptographic complexity.';
      } else {
        userMessage = rawMsg || 'Please review your input fields and try again.';
      }
      actionLabel = 'Review Credentials';
    } else if (
      statusCode === 401 ||
      rawMsg.includes('Signature has expired') ||
      rawMsg.includes('expired')
    ) {
      severity = 'WARNING';
      errorCode = 'SESSION_EXPIRED';
      title = 'Session Refreshed';
      userMessage =
        'Your secure session credentials expired and have been renewed. You can continue working safely.';
      actionLabel = 'Continue';
    } else {
      severity = 'ERROR';
      errorCode = 'AUTH_FAILED';
      title = 'Authentication Notice';
      userMessage = rawMsg;
    }
  } else if (statusCode === 403 || rawMsg.includes('403') || rawMsg.includes('Access denied')) {
    category = 'auth';
    subsystem = 'auth';
    severity = 'ERROR';
    errorCode = 'ACCESS_RESTRICTED';
    title = 'Access Restricted';
    userMessage = 'You do not have the required permissions to view or modify this resource.';
    actionLabel = 'Switch Account';
  }

  // 3. Document Intake & Payload Ceiling Errors
  else if (
    statusCode === 413 ||
    rawMsg.includes('413') ||
    rawMsg.includes('maximum allowed upload size') ||
    rawMsg.includes('exceeds maximum limit of 50MB')
  ) {
    category = 'document';
    subsystem = 'ingestion';
    severity = 'WARNING';
    errorCode = 'FILE_EXCEEDS_50MB';
    title = 'File Exceeds 50MB Limit';
    userMessage =
      'The selected document exceeds our 50MB single-upload capacity. Please compress or split the document and retry.';
    actionLabel = 'Select Smaller File';
  } else if (rawMsg.includes('Unsupported file format') || rawMsg.includes('file format')) {
    category = 'document';
    subsystem = 'ingestion';
    severity = 'WARNING';
    errorCode = 'UNSUPPORTED_FORMAT';
    title = 'Unsupported Format';
    userMessage =
      'Please upload a supported format: PDF, Word document (DOCX), Excel spreadsheet (XLSX, CSV), or Scan Image (PNG, JPG).';
    actionLabel = 'Supported Formats';
  }

  // 4. Schema & Request Validation Errors
  else if (statusCode === 422 || rawMsg.includes('422') || rawMsg.includes('Unprocessable')) {
    category = 'validation';
    subsystem = 'ingestion';
    severity = 'ERROR';
    errorCode = 'INVALID_PARAMETERS';
    title = 'Invalid Document Parameters';
    userMessage =
      'The server could not process the provided document attributes. Please verify the file settings and retry.';
    actionLabel = 'Review Settings';
  }

  // 5. AI Extraction & Server Processing Anomalies
  else if (statusCode === 500 || rawMsg.includes('500') || rawMsg.includes('Internal Server')) {
    category = 'server';
    subsystem = subsystem === 'general' ? 'ai_analysis' : subsystem;
    severity = 'CRITICAL';
    errorCode = 'INTERNAL_PROCESSING_ANOMALY';
    title = 'Processing Anomaly';
    userMessage =
      'An unexpected analysis condition occurred while evaluating document intelligence. Raw document text has been preserved.';
    actionLabel = 'Retry Analysis';
  } else if (statusCode === 404 || rawMsg.includes('404') || rawMsg.includes('not found')) {
    category = 'document';
    subsystem = 'storage';
    severity = 'WARNING';
    errorCode = 'DOCUMENT_NOT_FOUND';
    title = 'Document Not Found';
    userMessage =
      'The requested document could not be located in your vault or was already removed.';
    actionLabel = 'Return to Vault';
  } else {
    userMessage = rawMsg;
  }

  // Override with custom user title/message if provided
  if (context.title) title = context.title;
  if (context.userMessage) userMessage = context.userMessage;

  return {
    id: correlationId,
    correlationId,
    timestamp: new Date().toISOString(),
    category,
    subsystem,
    severity,
    statusCode,
    endpoint,
    httpMethod: method,
    errorCode,
    title,
    userMessage,
    technicalMessage: rawMsg,
    stackTrace: err?.stack || null,
    actionLabel,
    actionHandler,
    context: context.metadata || {},
  };
}

/**
 * Asynchronously beacons error telemetry to the centralized Supabase database.
 * Non-blocking fire-and-forget. Zero client-side storage retention.
 */
async function beaconToCentralizedDatabase(errorRecord) {
  if (typeof window === 'undefined') return;

  try {
    const user = getCurrentUser();
    const payload = {
      correlation_id: errorRecord.correlationId,
      user_type: user ? (user.is_guest ? 'guest' : 'authenticated') : 'guest',
      user_id: user?.id ? String(user.id) : null,
      user_email: user?.email || null,
      subsystem: errorRecord.subsystem,
      severity: errorRecord.severity,
      endpoint: errorRecord.endpoint,
      http_method: errorRecord.httpMethod,
      status_code: errorRecord.statusCode,
      error_code: errorRecord.errorCode,
      user_friendly_message: errorRecord.userMessage,
      technical_message: errorRecord.technicalMessage,
      stack_trace: errorRecord.stackTrace,
      client_context: {
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        url: window.location.href,
      },
      request_payload: errorRecord.context,
    };

    // Non-blocking asynchronous dispatch
    fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Suppress network telemetry errors to prevent recursive failure loops
    });
  } catch {
    // Suppress telemetry failures safely
  }
}

/**
 * Creates the reactive Telemetry Store
 */
function createTelemetryStore() {
  const activeAlert = writable(null);
  let dismissTimer = null;

  function dismiss() {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    activeAlert.set(null);
  }

  function showAlert(alertObj, autoDismissMs = 7000) {
    if (dismissTimer) clearTimeout(dismissTimer);
    activeAlert.set(alertObj);

    if (autoDismissMs > 0 && typeof window !== 'undefined') {
      dismissTimer = setTimeout(() => {
        dismiss();
      }, autoDismissMs);
    }
  }

  return {
    subscribe: activeAlert.subscribe,

    /**
     * Captures an error, normalizes it, sends it to Supabase, and displays luxury user toast.
     */
    captureError(err, context = {}) {
      const record = normalizeError(err, context);

      // 1. Structured DevTools Console Output (collapsed group for clean inspection)
      if (typeof console !== 'undefined' && console.groupCollapsed) {
        const severityColor =
          record.severity === 'CRITICAL'
            ? '#ef4444'
            : record.severity === 'WARNING'
              ? '#f59e0b'
              : '#dc2626';
        console.groupCollapsed(
          `%c[Cognifolio Reference: ${record.correlationId}] ${record.title} (${record.errorCode})`,
          `color: ${severityColor}; font-weight: bold; font-family: monospace;`,
        );
        console.warn('User Notice:', record.userMessage);
        console.error('Technical Exception:', record.technicalMessage);
        if (record.endpoint)
          console.info(
            'Endpoint:',
            record.httpMethod,
            record.endpoint,
            '| Status:',
            record.statusCode,
          );
        if (record.stackTrace) console.info('Stack Trace:\n', record.stackTrace);
        console.groupEnd();
      }

      // 2. Asynchronously stream to centralized Supabase database
      beaconToCentralizedDatabase(record);

      // 3. Render User Toast with Reference ID and Action Handler
      showAlert(
        {
          type: 'error',
          id: record.correlationId,
          title: record.title,
          message: record.userMessage,
          actionLabel: record.actionLabel,
          actionHandler: record.actionHandler,
          technicalMessage: record.technicalMessage,
        },
        context.duration || 8500,
      );

      return record;
    },

    /**
     * Renders a success workspace notification
     */
    showSuccess(message, duration = 4500) {
      showAlert(
        {
          type: 'success',
          title: 'WORKSPACE NOTICE',
          message,
        },
        duration,
      );
    },

    dismiss,
  };
}

export const telemetry = createTelemetryStore();
