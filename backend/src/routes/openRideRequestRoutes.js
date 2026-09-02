const express = require("express");

const {
    createOpenRideRequestController,
    getOpenRideRequestsController,
    acceptOpenRideRequestController,
    cancelRideRequestController
} = require("../controllers/rideRequestController");

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
    authorizeRoles("passenger"),
    createOpenRideRequestController
);

router.get(
    "/",
    authenticateToken,
    authorizeRoles("driver"),
    getOpenRideRequestsController
);

router.patch(
    "/:id/accept",
    authenticateToken,
    authorizeRoles("driver"),
    acceptOpenRideRequestController
);

router.patch(
    "/:id/cancel",
    authenticateToken,
    authorizeRoles("passenger"),
    cancelRideRequestController
);

module.exports = router;