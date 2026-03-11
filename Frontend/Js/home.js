/* ── home.js ─────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.getElementById("navLinks");
  const navToggle = document.getElementById("navToggle");

  // ── Swap nav buttons if already logged in ──────
  const token = Auth.getToken();
  if (token && navLinks) {
    const name = Auth.getName() || "User";
    const initial = name.charAt(0).toUpperCase();
    const role = Auth.getRole();

    navLinks.innerHTML = `
      <a href="book-ride.html" class="btn btn-ghost">
        <i class="fa-solid fa-location-dot"></i> Book Ride
      </a>
      <a href="profile.html" class="nav-user-info" style="text-decoration:none">
        <div class="nav-avatar">${initial}</div>
        <span class="nav-user-name">${name}</span>
      </a>
    `;

    // Redirect hero CTA to book-ride
    document.querySelectorAll(".hero-cta-book").forEach((el) => {
      el.href = "book-ride.html";
    });
    // If driver, update drive CTA
    if (role === "driver") {
      document.querySelectorAll(".hero-cta-drive").forEach((el) => {
        el.href = "book-ride.html";
        el.innerHTML = '<i class="fa-solid fa-car"></i> Driver Dashboard';
      });
    }
  }

  // ── Mobile nav toggle ──────────────────────────
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () =>
      navLinks.classList.toggle("open"),
    );
  }
});
