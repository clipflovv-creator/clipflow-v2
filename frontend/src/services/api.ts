/**
 * Centralized API Client for ClipFlow Frontend.
 *
 * All network calls, backend endpoints, and proxy URL generators must be defined here.
 * The backend base URL is dynamically read from Vite environment variables (VITE_BACKEND_URL).
 */

export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string) ||
  (typeof window !== 'undefined' && window.location.port !== '5173'
    ? window.location.origin
    : 'http://localhost:3001');

// ── Auth APIs ───────────────────────────────────────────────────────────────
export const authApi = {
  async getMe() {
    return fetch(`${BACKEND_URL}/api/auth/me`, {
      credentials: 'include',
    });
  },

  async login(email: string, password: string) {
    return fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(data: { email: string; password: string; name?: string; plan?: string }) {
    return fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
  },

  async logout() {
    return fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async verifyEmail(token: string) {
    return fetch(`${BACKEND_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
  },

  async verifyEmailWithCode(code: string, email: string) {
    return fetch(`${BACKEND_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code, email }),
    });
  },


  async resendVerification(email: string) {
    return fetch(`${BACKEND_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
  },

  async forgotPassword(email: string) {
    return fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return fetch(`${BACKEND_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async selectPlan(plan: string) {
    return fetch(`${BACKEND_URL}/api/auth/select-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ plan }),
    });
  },

  async updateProfile(data: { name?: string; email?: string }) {
    return fetch(`${BACKEND_URL}/api/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
  },
};

// ── Google Drive Auth Integration ───────────────────────────────────────────
export const googleApi = {
  getConnectUrl(): string {
    return `${BACKEND_URL}/api/google/connect`;
  },

  async getConnectUrlJson() {
    return fetch(`${BACKEND_URL}/api/google/connect?format=json`, {
      credentials: 'include',
    });
  },

  async disconnect() {
    return fetch(`${BACKEND_URL}/api/google/disconnect`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};

// ── Video metadata (via the ClipFlow extension, from the user's own IP) ──────
// The server does no video work; without the extension there is nothing to resolve links with.
export const videoApi = {
  async getMetadata(url: string, _signal?: AbortSignal) {
    const { extensionBridge } = await import('./extensionBridge');
    if (!(await extensionBridge.detect())) {
      return jsonResponse({ error: 'Install the ClipFlow browser extension to open videos.' }, 412);
    }
    try {
      const meta = await extensionBridge.getEditorMetadata(url);
      if (!meta) return jsonResponse({ error: 'This link is not supported by your ClipFlow extension.' }, 422);
      return jsonResponse(meta, 200);
    } catch (err: any) {
      console.error('[api] extension metadata failed:', err);
      return jsonResponse({ error: err?.message || 'Could not read this video' }, 502);
    }
  },
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// ── Download history (the user's library; logged by the extension bridge) ───
export interface DownloadHistoryItem {
  jobId: string;
  platform: 'youtube' | 'instagram' | 'twitter' | 'twitch';
  kind?: string;
  url: string;
  title?: string;
  quality?: string;
  sizeBytes?: number;
  durationSec?: number;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  createdAt: string;
}

export const downloadsApi = {
  async history(limit = 50, before?: string) {
    const q = new URLSearchParams({ limit: String(limit), ...(before ? { before } : {}) });
    return fetch(`${BACKEND_URL}/api/downloads/history?${q}`, { credentials: 'include' });
  },

  async remove(jobId: string) {
    return fetch(`${BACKEND_URL}/api/downloads/${encodeURIComponent(jobId)}`, { method: 'DELETE', credentials: 'include' });
  },
};

// ── App Requests / Waitlist ─────────────────────────────────────────────────
export const appRequestsApi = {
  async submit(data: { email: string }) {
    return fetch(`${BACKEND_URL}/api/app-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
};

// ── Unified API Export ──────────────────────────────────────────────────────
export const api = {
  auth: authApi,
  google: googleApi,
  video: videoApi,
  downloads: downloadsApi,
  appRequests: appRequestsApi,
};

export default api;

