const express = require("express");

const {
    createRideRequestController
} = require("../controllers/rideRequestController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/:id/request",
    authenticateToken,
    authorizeRoles("passenger"),
    createRideRequestController
);

module.exports = router;