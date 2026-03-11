const driverService = require("../services/driver.service");

exports.updateLocation = async (req, res) => {
  const { lat, lng } = req.body;

  try {
    console.log(
      `Updating location for driver ${req.user.id} to lat: ${lat}, lng: ${lng}`,
    );
    await driverService.upateDriverLocation(req.user.id, lat, lng);

    res.json({ message: "Location updated" });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};

exports.getNearbyDrivers = async (req, res) => {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  try {
    const drivers = await driverService.findNearbyDriversWithCoords(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 5,
    );
    res.json({ drivers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
