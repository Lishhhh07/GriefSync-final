const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("griefsync_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem("griefsync_token");
    localStorage.removeItem("griefsync_user");
    throw new Error("Session expired. Please login again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// --- Auth ---

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ token: string; user: { id: number; name: string; email: string } }>(res);
}

export async function apiRegister(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse<{ token: string; user: { id: number; name: string; email: string } }>(res);
}

export async function apiGetMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
  return handleResponse<{ user: { id: number; name: string; email: string } }>(res);
}

// --- Score ---

export async function apiGetScore() {
  const res = await fetch(`${API_BASE}/api/score`, { headers: authHeaders() });
  return handleResponse<{ score: number; breakdown: Record<string, number> }>(res);
}

export async function apiGetScoreHistory() {
  const res = await fetch(`${API_BASE}/api/score/history`, { headers: authHeaders() });
  return handleResponse<{ history: Array<{ score: number; recorded_at: string; breakdown_json?: string }> }>(res);
}

// --- Gaps ---

export async function apiGetGaps() {
  const res = await fetch(`${API_BASE}/api/onboarding/gaps`, { headers: authHeaders() });
  return handleResponse<{ gaps: string[] }>(res);
}

// --- Check-in ---

export async function apiCheckin() {
  const res = await fetch(`${API_BASE}/api/checkin`, { method: "POST", headers: authHeaders() });
  return handleResponse<{ status: string; timestamp: string }>(res);
}

// --- Vault ---

export async function apiGetAssets() {
  const res = await fetch(`${API_BASE}/api/vault/assets`, { headers: authHeaders() });
  return handleResponse<{ assets: Array<Record<string, unknown>> }>(res);
}

export async function apiUploadPdf(file: File) {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/vault/upload`, { method: "POST", headers, body: form });
  return handleResponse<{ status: string; message: string }>(res);
}

export async function apiManualAsset(asset: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/vault/manual`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(asset),
  });
  return handleResponse<{ asset_id: number; warnings: string[] }>(res);
}

export async function apiDeleteAsset(assetId: number) {
  const res = await fetch(`${API_BASE}/api/vault/assets/${assetId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<{ status: string; asset_id: number }>(res);
}

// --- Will ---

export async function apiWillAnalyze() {
  const res = await fetch(`${API_BASE}/api/will/analyze`, { method: "POST", headers: authHeaders() });
  return handleResponse<{ analysis: string; asset_count: number; grounding_used: boolean }>(res);
}

export function getWillPdfUrl() {
  return `${API_BASE}/api/will/pdf`;
}

export async function apiGenerateWillPdf(analysis: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/will/pdf`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ analysis }),
  });
  if (!res.ok) throw new Error("PDF generation failed");
  return res.blob();
}

// --- AI Q&A ---

export async function apiAsk(question: string, conversationHistory: Array<{ role: string; content: string }> = []) {
  const res = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ question, conversation_history: conversationHistory }),
  });
  return handleResponse<{ answer: string; suggested_follow_ups: string[] }>(res);
}

// --- Lifeline ---

export async function apiGetLifelineStatus() {
  const res = await fetch(`${API_BASE}/api/lifeline/status`, { headers: authHeaders() });
  return handleResponse<{
    current_day: number;
    days_overdue: number;
    days_since_checkin: number;
    next_action: string;
    trusted_contacts: number;
  }>(res);
}

export async function apiGetContacts() {
  const res = await fetch(`${API_BASE}/api/lifeline/contacts`, { headers: authHeaders() });
  return handleResponse<{ contacts: Array<{ id: number; name: string; email: string; phone?: string; confirmed?: boolean; notified_at?: string }> }>(res);
}

export async function apiSaveContacts(contacts: Array<{ name: string; email: string; phone?: string }>) {
  const res = await fetch(`${API_BASE}/api/lifeline/contacts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(contacts),
  });
  return handleResponse<{ status: string; count: number }>(res);
}

// --- Obituary ---

export async function apiGetObituary() {
  const res = await fetch(`${API_BASE}/api/obituary`, { headers: authHeaders() });
  return handleResponse<{ draft: string | null; draft_approved: boolean; id?: number }>(res);
}

export async function apiDraftObituary() {
  const res = await fetch(`${API_BASE}/api/obituary/draft`, { method: "POST", headers: authHeaders() });
  return handleResponse<{ status: string; preview?: string; message?: string }>(res);
}

export async function apiApproveObituary() {
  const res = await fetch(`${API_BASE}/api/obituary/approve`, { method: "POST", headers: authHeaders() });
  return handleResponse<{ status: string }>(res);
}

// --- Monitor ---

export async function apiGetMonitorLogs() {
  const res = await fetch(`${API_BASE}/api/monitor/log`, { headers: authHeaders() });
  return handleResponse<{ logs: Array<Record<string, unknown>> }>(res);
}

export async function apiGetQueueStatus() {
  const res = await fetch(`${API_BASE}/api/queue/status`, { headers: authHeaders() });
  return handleResponse<{ pending: number; done_last_hour: number; failed: number }>(res);
}

export async function apiDrainQueue() {
  const res = await fetch(`${API_BASE}/api/queue/drain`, { method: "POST", headers: authHeaders() });
  return handleResponse<{ status: string }>(res);
}

// --- Trace / Observability ---

export async function apiGetTraceLog() {
  const res = await fetch(`${API_BASE}/api/trace/log`, { headers: authHeaders() });
  return handleResponse<{ entries: Array<Record<string, unknown>> }>(res);
}

export async function apiGetTraceStats() {
  const res = await fetch(`${API_BASE}/api/trace/stats`, { headers: authHeaders() });
  return handleResponse<{
    total_spans: number;
    errors: number;
    successes: number;
    error_rate: number;
    omium_active: boolean;
    agents: Record<string, { total: number; errors: number; avg_ms: number }>;
  }>(res);
}

// --- Conflicts ---

export async function apiAnalyzeConflicts() {
  const res = await fetch(`${API_BASE}/api/conflicts/analyze`, { method: "POST", headers: authHeaders() });
  return handleResponse<{
    conflicts: Array<{
      id: string;
      severity: string;
      type: string;
      asset: string;
      description: string;
      legal_basis: string;
      recommendations: Array<{ id: string; action: string; description: string; impact: string }>;
    }>;
    summary: string;
  }>(res);
}

// --- Will Edit ---

export async function apiWillEdit(question: string) {
  const res = await fetch(`${API_BASE}/api/will/edit`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ question, conversation_history: [] }),
  });
  return handleResponse<{ answer: string; suggested_follow_ups: string[] }>(res);
}
