/* ── ZenoRide Auth Utilities ─────────────────────── */
const Auth = {
  TOKEN_KEY: "zeno_token",
  ROLE_KEY: "zeno_role",
  NAME_KEY: "zeno_name",
  EMAIL_KEY: "zeno_email",
  PHONE_KEY: "zeno_phone",

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },
  setToken(t) {
    localStorage.setItem(this.TOKEN_KEY, t);
  },

  getRole() {
    return localStorage.getItem(this.ROLE_KEY);
  },
  setRole(r) {
    localStorage.setItem(this.ROLE_KEY, r);
  },

  getName() {
    return localStorage.getItem(this.NAME_KEY);
  },
  setName(n) {
    localStorage.setItem(this.NAME_KEY, n);
  },

  getEmail() {
    return localStorage.getItem(this.EMAIL_KEY);
  },
  setEmail(e) {
    localStorage.setItem(this.EMAIL_KEY, e);
  },

  getPhone() {
    return localStorage.getItem(this.PHONE_KEY);
  },
  setPhone(p) {
    localStorage.setItem(this.PHONE_KEY, p);
  },

  /** Decode JWT payload (no crypto validation – display only) */
  decodeToken(token) {
    try {
      const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  },

  /** Save full user record after signup */
  saveUserInfo({ name, email, phone, role }) {
    if (name) this.setName(name);
    if (email) this.setEmail(email);
    if (phone) this.setPhone(phone);
    if (role) this.setRole(role);
  },

  logout() {
    [
      this.TOKEN_KEY,
      this.ROLE_KEY,
      this.NAME_KEY,
      this.EMAIL_KEY,
      this.PHONE_KEY,
    ].forEach((k) => localStorage.removeItem(k));
    window.location.href = "./login.html";
  },

  /** Redirect to login if no token; return false to stop the caller */
  requireAuth() {
    if (!this.getToken()) {
      window.location.href = "./login.html";
      return false;
    }
    return true;
  },
};
