/* ── profile.js ───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;

  const token = Auth.getToken();

  // ── Logout ─────────────────────────────────────
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    SocketManager.disconnect();
    Auth.logout();
  });

  // Populate with cached data first (instant render)
  const cached = {
    name: Auth.getName() || "—",
    email: Auth.getEmail() || "—",
    phone: Auth.getPhone() || "—",
    role: Auth.getRole() || "rider",
  };
  renderProfile(cached);

  // Then fetch from server for authoritative role/id
  try {
    const data = await api.get("/auth/profile", token);
    const user = data.user; // { id, role, iat, exp }

    if (user?.role) {
      Auth.setRole(user.role);
      cached.role = user.role;
    }
    if (user?.id) cached.id = user.id;

    renderProfile(cached);
  } catch (err) {
    Toast.error("Could not refresh profile", err.message);
  }

  // ── Render ─────────────────────────────────────
  function renderProfile({ name, email, phone, role, id }) {
    const initial = (name || "U").charAt(0).toUpperCase();

    document.getElementById("avatarInitial").textContent = initial;
    document.getElementById("profileName").textContent = name;
    document.getElementById("infoName").textContent = name;
    document.getElementById("infoEmail").textContent = email;
    document.getElementById("infoPhone").textContent = phone;
    document.getElementById("infoId").textContent = id ? `#${id}` : "—";

    const badge = document.getElementById("roleBadge");
    if (role === "driver") {
      badge.className = "profile-role-badge role-driver";
      badge.innerHTML = '<i class="fa-solid fa-car"></i> Driver';
    } else {
      badge.className = "profile-role-badge role-rider";
      badge.innerHTML = '<i class="fa-solid fa-user"></i> Rider';
    }

    const actionBtn = document.getElementById("roleAction");
    if (actionBtn) {
      actionBtn.innerHTML =
        role === "driver"
          ? '<i class="fa-solid fa-car"></i> Go Online as Driver'
          : '<i class="fa-solid fa-location-dot"></i> Book a Ride';
      actionBtn.href = "./book-ride.html";
    }
  }
});
