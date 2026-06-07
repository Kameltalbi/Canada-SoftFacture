const STORAGE_KEY = 'softfacture_jwt';

export function getApiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL;
  if (!b?.trim()) {
    throw new Error('NEXT_PUBLIC_API_URL est requis (ex. http://localhost:4000/api)');
  }
  return b.replace(/\/$/, '');
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

export type ApiErrorBody = { error?: string; details?: unknown };

function formatApiError(text: string, status: number, statusText: string): string {
  if (text) {
    try {
      const data = JSON.parse(text) as ApiErrorBody;
      if (data.error) return String(data.error);
    } catch {
      const trimmed = text.trim();
      if (trimmed.startsWith('<')) {
        if (status === 502) {
          return 'Serveur indisponible (502). Réessayez dans quelques instants ou contactez le support.';
        }
        if (status === 503) {
          return 'Service temporairement indisponible (503).';
        }
        return `Erreur serveur (${status}).`;
      }
      if (trimmed.length <= 300) return trimmed;
      return `${trimmed.slice(0, 300)}…`;
    }
  }

  if (status === 502) {
    return 'Serveur indisponible (502). Réessayez dans quelques instants ou contactez le support.';
  }
  if (status === 503) {
    return 'Service temporairement indisponible (503).';
  }
  return statusText || `Erreur HTTP ${status}`;
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_API_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 700;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFetchError(error: unknown): boolean {
  return error instanceof TypeError;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, headers: initHeaders, ...rest } = init;
  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getApiBase()}${urlPath}`;

  const headers = new Headers(initHeaders);
  if (!headers.has('Content-Type') && rest.body != null && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!skipAuth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_API_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, { ...rest, headers });

      if (res.status === 204) {
        return undefined as T;
      }

      const text = await res.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text) as unknown;
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const error =
          data && typeof data === 'object' && data !== null && 'error' in data
            ? new Error(String((data as ApiErrorBody).error ?? res.statusText))
            : new Error(formatApiError(text, res.status, res.statusText));

        if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_API_RETRIES) {
          lastError = error;
          await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
          continue;
        }

        throw error;
      }

      return data as T;
    } catch (error: unknown) {
      if (attempt < MAX_API_RETRIES && isRetryableFetchError(error)) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('Serveur indisponible. Réessayez dans quelques instants.');
}

export async function downloadInvoicePdfFromApi(
  invoiceId: string,
  filename: string,
  options?: { unsigned?: boolean }
) {
  const q = options?.unsigned ? '?unsigned=1' : '';
  const url = `${getApiBase()}/invoices/${invoiceId}/pdf${q}`;
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(formatDownloadError(t, res.status, res.statusText));
  }
  const blob = await res.blob();
  triggerBlobDownload(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

function formatDownloadError(text: string, status: number, statusText: string): string {
  try {
    const data = JSON.parse(text) as ApiErrorBody;
    if (data.error) return String(data.error);
  } catch {
    /* plain text */
  }
  return formatApiError(text, status, statusText);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export async function downloadQuotePdfFromApi(quoteId: string, filename: string) {
  const url = `${getApiBase()}/quotes/${quoteId}/pdf`;
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(href);
}

export async function previewOtherDocumentPdf(): Promise<void> {
  const url = `${getApiBase()}/organizations/other-document/pdf`;
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  window.open(href, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

export async function uploadOrganizationLogo(file: File): Promise<{ logoUrl: string | null }> {
  const fd = new FormData();
  fd.append('logo', file);
  return apiFetch<{ logoUrl: string | null }>('/organizations/logo', {
    method: 'POST',
    body: fd,
  });
}

export async function deleteOrganizationLogo(): Promise<{ logoUrl: string | null }> {
  return apiFetch<{ logoUrl: string | null }>('/organizations/logo', {
    method: 'DELETE',
  });
}
