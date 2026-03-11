const driverService = require("../services/driver.service");

const driverSockets = new Map(); // key: String(userId), value: socket object

function registerDriverSocket(io, socket) {
  if (socket.user.role === "driver") {
    driverSockets.set(String(socket.user.id), socket);
    console.log(`Driver ${socket.user.id} registered → socket ${socket.id}`);
  }

  // Riders join a room so we can broadcast driver positions to them
  if (socket.user.role === "rider") {
    socket.join("riders");
  }

  socket.on("driver:location", async ({ lat, lng }) => {
    if (socket.user.role !== "driver") return;

    try {
      await driverService.upateDriverLocation(socket.user.id, lat, lng);

      // Broadcast to all riders so they see nearby drivers on the map
      io.to("riders").emit("driver:locationUpdate", {
        driverId: socket.user.id,
        lat,
        lng,
      });
    } catch (err) {
      socket.emit("driver:error", { message: "Failed to update location." });
    }
  });
}

function unregisterDriverSocket(userId) {
  driverSockets.delete(String(userId));
}

module.exports = {
  driverSockets,
  registerDriverSocket,
  unregisterDriverSocket,
};
