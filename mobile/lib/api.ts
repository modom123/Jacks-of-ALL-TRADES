const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }
  return data as T;
}

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string;
  image_emoji: string | null;
  active: boolean;
};

export const api = {
  submitApplication: (data: {
    full_name: string;
    email: string;
    phone?: string;
    trade_interest: string;
    background?: string;
  }) => apiFetch('/api/applications', { method: 'POST', body: data }),

  submitContact: (data: {
    full_name: string;
    email: string;
    subject?: string;
    message: string;
    type?: string;
  }) => apiFetch('/api/contacts', { method: 'POST', body: data }),

  submitVolunteer: (data: {
    full_name: string;
    email: string;
    trade_skill?: string;
    role?: string;
  }) => apiFetch('/api/volunteers', { method: 'POST', body: data }),

  createDonationSession: (data: {
    donor_name?: string;
    donor_email?: string;
    amount_cents: number;
    type?: string;
  }) =>
    apiFetch<{ url: string; session_id: string }>('/api/donations/checkout', {
      method: 'POST',
      body: data,
    }),

  createShopSession: (cart: {
    items: { product_id: string; quantity: number }[];
    customer_email?: string;
  }) =>
    apiFetch<{ url: string; session_id: string }>('/api/shop/checkout', {
      method: 'POST',
      body: cart,
    }),

  getProducts: () => apiFetch<{ products: Product[] }>('/api/shop/products'),

  admin: {
    getStats: (token: string) =>
      apiFetch<{
        pending_applications: number;
        total_donations_dollars: string;
        volunteer_count: number;
        unread_messages: number;
      }>('/api/admin/stats', { token }),

    getApplications: (
      token: string,
      params: { status?: string; page?: number } = {}
    ) => {
      const qs = new URLSearchParams();
      if (params.status) qs.set('status', params.status);
      if (params.page) qs.set('page', String(params.page));
      return apiFetch<{
        applications: {
          id: string;
          full_name: string;
          email: string;
          trade_interest: string | null;
          status: string;
          created_at: string;
        }[];
        total: number;
      }>(`/api/admin/applications?${qs}`, { token });
    },

    updateApplication: (token: string, id: string, data: { status: string }) =>
      apiFetch(`/api/admin/applications/${id}`, { method: 'PATCH', body: data, token }),
  },
};
