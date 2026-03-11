/* ── login.js ─────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Already logged in → redirect
  if (Auth.getToken()) {
    window.location.href = "./book-ride.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const alertEl = document.getElementById("loginAlert");
  const alertMsg = document.getElementById("alertMsg");
  const submitBtn = document.getElementById("submitBtn");
  const passInput = document.getElementById("password");
  const togglePass = document.getElementById("togglePass");

  // ── Toggle password visibility ─────────────────
  togglePass.addEventListener("click", () => {
    const show = passInput.type === "password";
    passInput.type = show ? "text" : "password";
    togglePass.innerHTML = `<i class="fa-solid ${show ? "fa-eye-slash" : "fa-eye"}"></i>`;
  });

  // ── Form submit ────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById("email").value.trim();
    const password = passInput.value;

    if (!email || !password) {
      showAlert("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.post("/auth/login", { email, password });
      const token = data.token;

      Auth.setToken(token);

      // Decode role from JWT
      const payload = Auth.decodeToken(token);
      if (payload?.role) Auth.setRole(payload.role);

      // Store email for profile display
      Auth.setEmail(email);

      // Fetch full profile to get name
      try {
        const profile = await api.get("/auth/profile", token);
        if (profile.user?.name) Auth.setName(profile.user.name);
      } catch (_) {
        /* non-critical */
      }

      Toast.success("Welcome back!", "Redirecting to your dashboard…");
      setTimeout(() => {
        window.location.href = "./book-ride.html";
      }, 900);
    } catch (err) {
      showAlert(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  });

  // ── Helpers ────────────────────────────────────
  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.innerHTML = on
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…'
      : '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
  }

  function showAlert(msg) {
    alertMsg.textContent = msg;
    alertEl.style.display = "flex";
  }

  function hideAlert() {
    alertEl.style.display = "none";
  }
});
