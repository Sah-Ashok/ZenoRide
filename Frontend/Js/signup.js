/* ── signup.js ────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Already logged in → redirect
  if (Auth.getToken()) {
    window.location.href = "./book-ride.html";
    return;
  }

  // Pre-select role from ?role=driver query param
  const params = new URLSearchParams(window.location.search);
  const preRole = params.get("role");
  if (preRole === "driver") {
    const driverRadio = document.getElementById("roleDriver");
    if (driverRadio) driverRadio.checked = true;
  }

  const form = document.getElementById("signupForm");
  const alertEl = document.getElementById("signupAlert");
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

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = passInput.value;
    const role = document.querySelector('input[name="role"]:checked')?.value;

    if (!name || !email || !phone || !password || !role) {
      showAlert("Please fill in all fields and choose a role.");
      return;
    }
    if (password.length < 6) {
      showAlert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.post("/auth/signup", {
        name,
        email,
        phone,
        password,
        role,
      });

      // Save user info for profile display (backend doesn't return token on signup)
      Auth.saveUserInfo({ name, email, phone, role });

      Toast.success("Account created!", "Please sign in to continue.");
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 1000);
    } catch (err) {
      showAlert(err.message || "Sign up failed. Please try again.");
      setLoading(false);
    }
  });

  // ── Helpers ────────────────────────────────────
  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.innerHTML = on
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Creating account…'
      : '<i class="fa-solid fa-user-plus"></i> Create Account';
  }

  function showAlert(msg) {
    alertMsg.textContent = msg;
    alertEl.style.display = "flex";
  }

  function hideAlert() {
    alertEl.style.display = "none";
  }
});
