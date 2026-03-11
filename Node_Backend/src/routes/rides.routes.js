const express = require("express");
const router = express.Router();
authMiddleware = require("../middleware/auth.middleware");
const ridesController = require("../controllers/rides.controller");
const authorizeRoles = require("../middleware/role.middleware");
router.post(
  "/request",
  authMiddleware,
  authorizeRoles("rider"),
  ridesController.requestRide,
);

router.post(
  "/rides/:rideId/accept",
  authMiddleware,
  authorizeRoles("driver"),
  ridesController.acceptRide,
);

router.post(
  "/rides/:rideId/cancel",
  authMiddleware,
  authorizeRoles("rider"),
  ridesController.cancelRide,
);

module.exports = router;
