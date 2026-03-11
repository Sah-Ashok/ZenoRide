const redis = require("../config/redis");

exports.upateDriverLocation = async (driverId, lat, lng) => {
  await redis.geoAdd("drivers", {
    longitude: lng,
    latitude: lat,
    member: driverId.toString(),
  });
};

exports.findNearbyDrivers = async (lat, lng, radius = 5) => {
  const drivers = await redis.geoSearch(
    "drivers",
    {
      longitude: lng,
      latitude: lat,
    },
    {
      radius: radius,
      unit: "km",
    },
  );
  return drivers;
};

exports.findNearbyDriversWithCoords = async (lat, lng, radius = 5) => {
  const driverIds = await exports.findNearbyDrivers(lat, lng, radius);
  if (!driverIds || driverIds.length === 0) return [];

  const results = [];
  for (const id of driverIds) {
    const pos = await redis.geoPos("drivers", id);
    if (pos && pos[0]) {
      results.push({
        driverId: id,
        lng: parseFloat(pos[0].longitude),
        lat: parseFloat(pos[0].latitude),
      });
    }
  }
  return results;
};
