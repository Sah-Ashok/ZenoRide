/* ── ZenoRide Socket.io Manager ─────────────────── */
let _socket = null;

const SocketManager = {
  connect() {
    const token = Auth.getToken();
    if (!token) return null;

    // Reuse existing live connection
    if (_socket && _socket.connected) return _socket;

    _socket = io("http://localhost:3000", {
      auth: { token },
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    _socket.on("connect", () => console.log("[Socket] Connected:", _socket.id));
    _socket.on("disconnect", (r) => console.log("[Socket] Disconnected:", r));
    _socket.on("connect_error", (e) =>
      console.error("[Socket] Error:", e.message),
    );

    return _socket;
  },

  get() {
    return _socket;
  },

  disconnect() {
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
  },
};
