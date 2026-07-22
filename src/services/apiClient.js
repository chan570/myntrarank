/**
 * TRUSTRANK FRONTEND API CLIENT
 * Connects React Frontend to Express REST API Gateway (http://localhost:5000/api)
 * Fallbacks gracefully to in-memory mode if Express server is offline.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = {
  // Execute Search Query (Backend API)
  async executeQuery(queryText, options = {}) {
    try {
      const params = new URLSearchParams({
        q: queryText || '',
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

      const res = await fetch(`${API_BASE_URL}/search?${params}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data;
    } catch (err) {
      console.error(`Backend Express API Search Error: ${err.message}`);
      return { results: [], totalMatches: 0, executionTimeMs: 0 };
    }
  },

  // Submit Review (Write Path)
  async submitReview(reviewPayload) {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload)
      });
      return await res.json();
    } catch (err) {
      console.warn(`API Write Notice: ${err.message}`);
      return null;
    }
  },

  // Trigger Spark Audit Job
  async triggerSparkAudit() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/audit`, { method: 'POST' });
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // Inject Bot Attack
  async injectBotAttack(productId) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/inject-bot-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // Get Telemetry Status
  async getSystemStats() {
    try {
      const res = await fetch(`${API_BASE_URL}/stats`);
      return await res.json();
    } catch (err) {
      return null;
    }
  }
};
/*apiClient.js is a service layer that abstracts all communication between the React frontend and the Express backend. Instead of calling fetch() throughout the application, every HTTP request is centralized here. It exposes methods for searching products, submitting reviews, triggering the audit pipeline, simulating bot attacks, and retrieving system statistics. Each method handles network requests, parses JSON responses, and gracefully handles failures so the frontend can switch to offline behavior when the backend is unavailable. */
