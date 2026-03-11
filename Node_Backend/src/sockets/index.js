const { verifyToken } = require("../utils/jwt.util");
const { setIO } = require("./io");
const {
  driverSockets,
  registerDriverSocket,
  unregisterDriverSocket,
} = require("./driver.socket");
const { registerRideSocket } = require("./ride.socket");

function registerSocket(io) {
  setIO(io);

  io.on("connection", (socket) => {
    try {
      const token = socket.handshake.auth.token;
      const user = verifyToken(token);
      socket.user = user;
    } catch (err) {
      console.log("Socket auth failed — disconnecting");
      socket.disconnect();
      return;
    }

    console.log(`User ${socket.user.id} (${socket.user.role}) connected`);

    registerDriverSocket(io, socket);
    registerRideSocket(io, socket);

    socket.on("disconnect", () => {
      unregisterDriverSocket(socket.user.id);
      console.log(`User ${socket.user.id} disconnected`);
    });
  });
}

module.exports = { registerSocket, driverSockets };
