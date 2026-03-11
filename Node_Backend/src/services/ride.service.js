const rideRepository = require("../repositories/rides.repository");
const driverService = require("./driver.service");
const { driverSockets } = require("../sockets/driver.socket");
const { getIO } = require("../sockets/io");
const AppError = require("../utils/AppError");

exports.notifyDrivers = async (ride) => {
  const io = getIO();
  console.log("[notifyDrivers] called for ride:", ride.id);
  console.log("[notifyDrivers] io available:", !!io);
  console.log("[notifyDrivers] driverSockets size:", driverSockets.size);
  console.log(
    "[notifyDrivers] driverSockets entries:",
    [...driverSockets.entries()].map(([uid, s]) => [uid, s.id, s.connected]),
  );

  if (!io) {
    console.error("[notifyDrivers] io is null — cannot notify");
    return;
  }

  let notified = 0;

  try {
    const drivers = await driverService.findNearbyDrivers(
      ride.pickup_lat,
      ride.pickup_lng,
    );
    console.log("[notifyDrivers] nearby drivers from Redis:", drivers);

    drivers.forEach((driverId) => {
      const driverSocket = driverSockets.get(String(driverId));
      console.log(
        `[notifyDrivers] driver ${driverId} → socket connected: ${driverSocket?.connected}, id: ${driverSocket?.id}`,
      );
      if (driverSocket && driverSocket.connected) {
        driverSocket.emit("ride:requested", ride);
        notified++;
      }
    });
  } catch (err) {
    console.error("[notifyDrivers] Redis search failed:", err.message);
  }

  console.log("[notifyDrivers] notified via direct emit:", notified);

  if (notified === 0 && driverSockets.size > 0) {
    console.log(
      "[notifyDrivers] FALLBACK — broadcasting to all",
      driverSockets.size,
      "online drivers",
    );
    driverSockets.forEach((driverSocket, driverId) => {
      if (driverSocket && driverSocket.connected) {
        console.log(
          `[notifyDrivers] fallback emit to driver ${driverId} → socket ${driverSocket.id}`,
        );
        driverSocket.emit("ride:requested", ride);
      }
    });
  } else if (notified === 0 && driverSockets.size === 0) {
    console.log("[notifyDrivers] NO online drivers at all — no one to notify");
  }
};

exports.requestRide = async (userId, data) => {
  const { pickup_lat, pickup_lng, drop_lat, drop_lng } = data;

  const ride = await rideRepository.createRide({
    rider_id: userId,
    pickup_lat,
    pickup_lng,
    drop_lat,
    drop_lng,
    status: "requested",
  });

  await exports.notifyDrivers(ride);

  return ride;
};

exports.acceptRide = async (rideId, driverId) => {
  const rideStatus = await rideRepository.findRideById(rideId);

  if (!rideStatus) {
    throw new AppError("Ride not found", 404);
  }

  if (rideStatus.status !== "requested") {
    throw new AppError("Ride is already accepted", 409);
  }

  const ride = await rideRepository.updateRideDriver(rideId, driverId);

  return ride;
};

exports.cancelRide = async (rideId, riderId) => {
  const ride = await rideRepository.findRideById(rideId);

  if (!ride) {
    throw new AppError("Ride not found", 404);
  }

  if (String(ride.rider_id) !== String(riderId)) {
    throw new AppError("Not authorized to cancel this ride", 403);
  }

  if (ride.status !== "requested") {
    throw new AppError("Only requested rides can be cancelled", 400);
  }

  const cancelled = await rideRepository.cancelRide(rideId);
  return cancelled;
};
