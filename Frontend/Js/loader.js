/* ── ZenoRide Loader Overlay ─────────────────────── */
const Loader = {
  show(title = "Please wait…", subtitle = "") {
    const overlay = document.getElementById("loaderOverlay");
    if (!overlay) return;

    const titleEl = document.getElementById("loaderTitle");
    const subtitleEl = document.getElementById("loaderSub");
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    overlay.classList.add("active");
  },

  hide() {
    const overlay = document.getElementById("loaderOverlay");
    if (overlay) overlay.classList.remove("active");
  },

  isVisible() {
    const overlay = document.getElementById("loaderOverlay");
    return overlay ? overlay.classList.contains("active") : false;
  },
};
