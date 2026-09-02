const express = require("express");

const {
    createRideRequestController,
    getRideRequestsController,
    createOpenRideRequestController,
    approveRideRequestController,
    rejectRideRequestController,
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
    "/:id/request",
    authenticateToken,
    authorizeRoles("passenger"),
    createRideRequestController
);

router.get(
    "/:id/requests",
    authenticateToken,
    authorizeRoles("driver"),
    getRideRequestsController
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("passenger"),
    createOpenRideRequestController
);

router.patch(
    "/requests/:id/approve",
    authenticateToken,
    authorizeRoles("driver"),
    approveRideRequestController
);

router.patch(
    "/requests/:id/reject",
    authenticateToken,
    authorizeRoles("driver"),
    rejectRideRequestController
);

router.patch(
    "/requests/:id/cancel",
    authenticateToken,
    authorizeRoles("passenger"),
    cancelRideRequestController
);


module.exports = router;