/**
 * TRUSTRANK FRONTEND API CLIENT
 * Connects React Frontend to Express REST API Gateway (http://localhost:5000/api)
 * Fallbacks gracefully to in-memory mode if Express server is offline.
 */

const API_BASE_URL = 'http://localhost:5000/api';

export const apiClient = {
  // Execute Search Query
  async executeQuery(queryText, weights) {
    try {
      const params = new URLSearchParams({
        q: queryText || '',
        auth: weights.auth,
        sent: weights.sent,
        ver: weights.ver,
        rich: weights.rich,
        rec: weights.rec,
        rate: weights.rate
      });

      const res = await fetch(`${API_BASE_URL}/search?${params}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data;
    } catch (err) {
      console.warn(`⚠️ Express API Offline, executing in-memory search fallback: ${err.message}`);
      return null;
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
