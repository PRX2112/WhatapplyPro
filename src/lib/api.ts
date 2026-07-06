/**
 * Typed API client for Whatapply frontend.
 * Auto-injects JWT Authorization header from localStorage.
 */

const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("wa_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  noAuth?: boolean
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const token = getToken();
  if (token && !noAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data as T;
}

const get = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body: unknown) => request<T>("POST", path, body);
const put = <T>(path: string, body: unknown) => request<T>("PUT", path, body);
const del = <T>(path: string) => request<T>("DELETE", path);

// ─── Auth ─────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (data: {
      businessName: string;
      businessType: string;
      name: string;
      email: string;
      password: string;
      businessUpiId?: string;
    }) => post<{ token: string; user: any; business: any }>("/auth/register", data),

    login: (data: { email: string; password: string }) =>
      post<{ token: string; user: any; business: any }>("/auth/login", data),

    me: () => get<{ user: any; business: any }>("/auth/me"),
    seenGuide: () => post<{ success: boolean }>("/auth/seen-guide", {}),
  },

  // ─── Business ───────────────────────────────────────────────
  business: {
    get: () => get<any>("/business"),
    update: (data: any) => put<any>("/business", data),
    stats: () => get<any>("/business/stats"),
  },

  // ─── Customers ──────────────────────────────────────────────
  customers: {
    list: (params?: { q?: string; tag?: string }) => {
      const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
      return get<any[]>(`/customers${qs}`);
    },
    get: (id: string) => get<any>(`/customers/${id}`),
    save: (data: any) => post<any>("/customers", data),
    delete: (id: string) => del<any>(`/customers/${id}`),
  },

  // ─── Services ───────────────────────────────────────────────
  services: {
    list: () => get<any[]>("/services"),
    save: (data: any) => post<any>("/services", data),
    delete: (id: string) => del<any>(`/services/${id}`),
  },

  // ─── Bookings ───────────────────────────────────────────────
  bookings: {
    list: (params?: { status?: string; from?: string; to?: string }) => {
      const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
      return get<any[]>(`/bookings${qs}`);
    },
    save: (data: any) => post<any>("/bookings", data),
    updateStatus: (id: string, status: string) =>
      post<any>(`/bookings/${id}/status`, { status }),
    delete: (id: string) => del<any>(`/bookings/${id}`),
  },

  // ─── Ledger ─────────────────────────────────────────────────
  ledger: {
    list: (params?: { customerId?: string }) => {
      const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
      return get<any[]>(`/ledger${qs}`);
    },
    summary: () => get<any[]>("/ledger/summary"),
    add: (data: { customerId: string; type: "debit" | "credit"; amount: number; description?: string }) =>
      post<any>("/ledger", data),
    remind: (data: { customerId: string; templateId?: string }) =>
      post<any>("/ledger/remind", data),
    delete: (id: string) => del<any>(`/ledger/${id}`),
  },

  // ─── Templates ──────────────────────────────────────────────
  templates: {
    list: () => get<any[]>("/templates"),
    save: (data: any) => post<any>("/templates", data),
    delete: (id: string) => del<any>(`/templates/${id}`),
  },

  // ─── Campaigns ──────────────────────────────────────────────
  campaigns: {
    list: () => get<any[]>("/campaigns"),
    send: (data: { templateId: string; name: string; targetGroup: string; minBalance?: number }) =>
      post<any>("/campaigns/send", data),
    delete: (id: string) => del<any>(`/campaigns/${id}`),
  },

  // ─── Sandbox ────────────────────────────────────────────────
  sandbox: {
    messages: () => get<any[]>("/sandbox/messages"),
    incoming: (data: { phone: string; text: string }) =>
      post<any>("/sandbox/incoming", data),
    clear: () => post<any>("/sandbox/clear", {}),
  },

  // ─── AI ─────────────────────────────────────────────────────
  ai: {
    status: () => get<{ geminiLive: boolean }>("/ai/status"),
    generateTemplate: (data: { prompt: string; businessType?: string; category?: string }) =>
      post<any>("/ai/generate-template", data),
  },

  // ─── Public Microsite ───────────────────────────────────────
  public: {
    getBusiness: (slug: string) => get<any>(`/public/business/${slug}`),
    createBooking: (slug: string, data: { customerName: string; customerPhone: string; serviceId: string; dateTime: string; notes?: string }) =>
      post<any>(`/public/bookings/${slug}`, data),
  },
};

export default api;
