/* ── ZenoRide Toast Notifications ───────────────── */
const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement("div");
      this._container.className = "toast-container";
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message, type = "info", subtitle = "", duration = 4000) {
    const icons = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      info: "fa-circle-info",
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="toast-icon fa-solid ${icons[type] || icons.info}"></i>
      <div class="toast-body">
        <div class="toast-message">${message}</div>
        ${subtitle ? `<div class="toast-sub">${subtitle}</div>` : ""}
      </div>
    `;

    this._getContainer().appendChild(toast);

    setTimeout(() => {
      toast.classList.add("out");
      setTimeout(() => toast.remove(), 320);
    }, duration);
  },

  success(msg, sub = "") {
    this.show(msg, "success", sub);
  },
  error(msg, sub = "") {
    this.show(msg, "error", sub);
  },
  info(msg, sub = "") {
    this.show(msg, "info", sub);
  },
};
