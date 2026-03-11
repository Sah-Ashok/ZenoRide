/* ── ZenoRide API Helper ──────────────────────────── */
const BASE_URL = "http://localhost:3000";

const api = {
  async post(endpoint, data, token = null) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error || json.message || "Request failed");
    }
    return json;
  },

  async get(endpoint, token = null) {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, { headers });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error || json.message || "Request failed");
    }
    return json;
  },
};
