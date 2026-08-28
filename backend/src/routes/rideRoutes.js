const express = require("express");

const {
    createRideController
} = require("../controllers/rideController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/",
    authenticateToken,
    authorizeRoles("driver"),
    createRideController
);

module.exports = router;