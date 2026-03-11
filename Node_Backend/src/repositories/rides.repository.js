const pool = require("../config/db");

exports.createRide = async (ride) => {
  const query = `INSERT INTO rides (rider_id,
  pickup_lat, pickup_lng, drop_lat, drop_lng,
  status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;

  const values = [
    ride.rider_id,
    ride.pickup_lat,
    ride.pickup_lng,
    ride.drop_lat,
    ride.drop_lng,
    ride.status,
  ];

  const resutl = await pool.query(query, values);

  return resutl.rows[0];
};

exports.updateRideDriver = async (rideId, driverId) => {
  const query = `UPDATE rides SET driver_id = $1, status = 'accepted' WHERE id = $2 RETURNING *`;

  const result = await pool.query(query, [driverId, rideId]);

  return result.rows[0];
};

exports.findRideById = async (rideId) => {
  const query = `SELECT * FROM rides WHERE id = $1`;

  const result = await pool.query(query, [rideId]);

  return result.rows[0];
};

exports.cancelRide = async (rideId) => {
  const query = `UPDATE rides SET status = 'cancelled' WHERE id = $1 AND status = 'requested' RETURNING *`;
  const result = await pool.query(query, [rideId]);
  return result.rows[0];
};
