const express = require("express");
const router = express.Router();

const driverController = require("../controllers/driver.controller");
const authMiddleware = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
router.post(
  "/location",
  authMiddleware,
  authorizeRoles("driver"),
  driverController.updateLocation,
);

router.get("/nearby", authMiddleware, driverController.getNearbyDrivers);

module.exports = router;
