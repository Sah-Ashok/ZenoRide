const rideService = require("../services/ride.service");

function registerRideSocket(io, socket) {
  socket.on("ride:accept", async ({ rideId }) => {
    if (socket.user.role !== "driver") {
      return socket.emit("ride:error", {
        message: "Only drivers can accept rides.",
      });
    }

    try {
      const ride = await rideService.acceptRide(rideId, socket.user.id);
      io.emit("ride:accepted", ride);
      console.log(`Ride ${rideId} accepted by driver ${socket.user.id}`);
    } catch (err) {
      socket.emit("ride:error", { message: err.message });
    }
  });
}

module.exports = { registerRideSocket };
