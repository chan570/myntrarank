/**
 * TRUSTRANK FRONTEND API CLIENT
 * Connects React Frontend to Express REST API Gateway (http://localhost:5000/api)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const CLOTHING_SINGULARS = {
  dress: 'dresses', top: 'tops', jacket: 'jackets', blouse: 'blouses',
  skirt: 'skirts', sweater: 'sweaters', jean: 'jeans', pant: 'pants',
  short: 'shorts', coat: 'coats', intimate: 'intimates',
};

function normalizeClothingSearch(query) {
  return query.trim().split(/\s+/).map((word) => CLOTHING_SINGULARS[word.toLowerCase()] || word).join(' ');
}

export const apiClient = {
  // Execute Search Query (Backend API)
  async executeQuery(queryText, options = {}) {
    try {
      const params = new URLSearchParams({
        q: normalizeClothingSearch(queryText || ''),
        auth: options.weightAuthenticity ?? options.auth ?? 0.35,
        sent: options.weightSentiment ?? options.sent ?? 0.20,
        ver: options.weightVerified ?? options.ver ?? 0.15,
        rich: options.weightRichness ?? options.rich ?? 0.10,
        rec: options.weightRecency ?? options.rec ?? 0.10,
        rate: options.weightRating ?? options.rate ?? 0.10,
        removeSuspicious: String(Boolean(options.removeSuspicious)),
        filterLowReviews: String(Boolean(options.filterLowReviews)),
        minRating: String(options.minRating || 0),
        category: options.categoryFilter || options.category || 'All'
      });

      const res = await fetch(`${API_BASE_URL}/search?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data;
    } catch (err) {
      throw new Error(`Backend Express API Search Error: ${err.message}`, { cause: err });
    }
  },

  // Submit Review (Write Path)
  async submitReview(reviewPayload) {
    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': reviewPayload.requestId
      },
      credentials: 'include',
      body: JSON.stringify(reviewPayload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || json?.message || `HTTP error ${res.status}`);
    return json;
  },

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.error?.message || 'Could not load account.');
    return json.user || null;
  },

  async registerAccount(payload) {
    return this.sendAuth('/auth/register', payload);
  },

  async login(payload) {
    return this.sendAuth('/auth/login', payload);
  },

  async logout() {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.error?.message || 'Could not sign out.');
  },

  async sendAuth(path, payload) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.error?.message || 'Account request failed.');
    return json.user;
  },
};
