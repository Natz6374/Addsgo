const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

export const BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  API_BASE_URL.replace(/\/api$/i, '')
).replace(/\/+$/, '');

// Authentication must be tab-scoped. localStorage is shared by every tab on the
// same origin, so testing/signing into buyer and seller accounts in two tabs can
// silently make both tabs send requests as whichever user logged in last.
const clearLegacySharedSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('user');
};

const ensureTabSession = () => {
  if (typeof window === 'undefined') return;

  const tabStorage = window.sessionStorage;
  const hasTabSession = Boolean(tabStorage.getItem('token') || tabStorage.getItem('user'));
  const legacyToken = window.localStorage.getItem('token');
  const legacyUser = window.localStorage.getItem('user');

  // Migrate a pre-fix session into this tab only. Remove the shared copy immediately
  // so another tab cannot accidentally inherit the same account on its next request.
  if (!hasTabSession && legacyToken && legacyUser) {
    tabStorage.setItem('token', legacyToken);
    tabStorage.setItem('user', legacyUser);
  }
  clearLegacySharedSession();
};

const storeTabSession = (data) => {
  if (typeof window === 'undefined') return;
  if (data?.token) window.sessionStorage.setItem('token', data.token);
  if (data?.user) window.sessionStorage.setItem('user', JSON.stringify(data.user));
  clearLegacySharedSession();
};

const getToken = () => {
  if (typeof window === 'undefined') return null;
  ensureTabSession();
  return window.sessionStorage.getItem('token');
};

async function fetchAPI(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) headers.Authorization = `Bearer ${token}`;

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      cache: options.cache || 'no-store',
    });
  } catch (error) {
    throw new Error(
      `Could not connect to the Addsgo API at ${API_BASE_URL}. Check that the backend is running and NEXT_PUBLIC_API_BASE_URL is correct.`
    );
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep a predictable error message if the server returned an empty/non-JSON response.
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      // Keep the token so the login page can display a useful message.
    }
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

export const api = {
  // Auth
  login: async (email, password) => {
    const data = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) storeTabSession(data);
    return data;
  },

  register: async (email, password, fullName, phone) => {
    const data = await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, phone }),
    });
    if (data.token) storeTabSession(data);
    return data;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('token');
      window.sessionStorage.removeItem('user');
      clearLegacySharedSession();
    }
  },

  getCurrentUser: () => {
    if (typeof window === 'undefined') return null;
    ensureTabSession();
    const storedUser = window.sessionStorage.getItem('user');
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      window.sessionStorage.removeItem('user');
      window.sessionStorage.removeItem('token');
      return null;
    }
  },

  setCurrentUser: (user) => {
    if (typeof window !== 'undefined' && user) {
      ensureTabSession();
      window.sessionStorage.setItem('user', JSON.stringify(user));
    }
  },

  getMe: async () => fetchAPI('/auth/me'),

  upgradeSubscription: async () => fetchAPI('/auth/upgrade', { method: 'PUT' }),

  // Categories
  getCategories: async () => {
    const data = await fetchAPI('/categories');
    return data.categories || [];
  },

  // Listings
  getListings: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value != null && value !== '')
    ).toString();
    const data = await fetchAPI(`/listings${queryString ? `?${queryString}` : ''}`);
    return data.listings || [];
  },

  getListingById: async (id) => {
    const data = await fetchAPI(`/listings/${encodeURIComponent(id)}`);
    return data.listing;
  },

  // Backwards-compatible alias used by the chat redirect flow.
  getListing: async (id) => {
    const data = await fetchAPI(`/listings/${encodeURIComponent(id)}`);
    return data.listing;
  },

  createListing: async (formData) => fetchAPI('/listings', {
    method: 'POST',
    body: formData,
  }),

  deleteListing: async (id) => fetchAPI(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Messages. Return the actual message object so the UI can append it safely.
  getChats: async () => {
    const data = await fetchAPI('/messages/chats');
    return data.chats || [];
  },

  getMessages: async (listingId, otherUserId) => {
    const data = await fetchAPI(
      `/messages/${encodeURIComponent(listingId)}/${encodeURIComponent(otherUserId)}`
    );
    return data.messages || [];
  },

  sendMessage: async (listingId, receiverId, content) => {
    const data = await fetchAPI('/messages', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: listingId,
        receiver_id: receiverId,
        content,
      }),
    });
    return data.message;
  },

  // Admin
  getPendingListings: async () => {
    const data = await fetchAPI('/admin/listings/pending');
    return data.listings || [];
  },

  approveListing: async (id) => fetchAPI(`/admin/listings/${encodeURIComponent(id)}/approve`, { method: 'PATCH' }),

  rejectListing: async (id, reason) => fetchAPI(`/admin/listings/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  }),

  getUsers: async () => {
    const data = await fetchAPI('/admin/users');
    return data.users || [];
  },

  // Backwards-compatible names used by the existing Admin Portal.
  getAdminUsers: async () => {
    const data = await fetchAPI('/admin/users');
    return data.users || [];
  },

  toggleUserBan: async (id) => fetchAPI(`/admin/users/${encodeURIComponent(id)}/toggle-ban`, { method: 'PATCH' }),
  toggleBanUser: async (id) => fetchAPI(`/admin/users/${encodeURIComponent(id)}/toggle-ban`, { method: 'PATCH' }),

  takedownListing: async (id) => fetchAPI(`/admin/listings/${encodeURIComponent(id)}/takedown`, { method: 'DELETE' }),
};
