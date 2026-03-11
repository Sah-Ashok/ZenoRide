const rideService = require("../services/ride.service");
const { getIO } = require("../sockets/io");
const AppError = require("../utils/AppError");

exports.requestRide = async (req, res, next) => {
  try {
    console.log("Requesting ride with data: ", req.body);

    const ride = await rideService.requestRide(req.user.id, req.body);

    if (!ride) {
      throw new AppError("Failed to request ride", 500);
    }

    res.status(201).json({
      message: "Ride requested",
      ride,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRide = async (req, res, next) => {
  try {
    const ride = await rideService.acceptRide(
      req.params.rideId, // rideId first
      req.user.id, // driverId second
    );

    // Notify all clients (especially the rider) that the ride was accepted
    const io = getIO();
    if (io) io.emit("ride:accepted", ride);

    res.status(200).json({
      message: "Ride accepted",
      ride,
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelRide = async (req, res, next) => {
  try {
    const ride = await rideService.cancelRide(req.params.rideId, req.user.id);

    // Notify all drivers that this ride was cancelled
    const io = getIO();
    if (io) io.emit("ride:cancelled", { rideId: ride.id });

    res.status(200).json({ message: "Ride cancelled", ride });
  } catch (error) {
    next(error);
  }
};
