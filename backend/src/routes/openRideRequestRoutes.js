const express = require("express");

const {
    createOpenRideRequestController,
    getOpenRideRequestsController,
    acceptOpenRideRequestController
} = require("../controllers/rideRequestController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();


// ============================================================
// PASSENGER CREATES OPEN RIDE REQUEST
// POST /api/open-ride-requests
// ============================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("passenger"),
    createOpenRideRequestController
);


// ============================================================
// DRIVER GETS OPEN RIDE REQUESTS
// GET /api/open-ride-requests
// ============================================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("driver"),
    getOpenRideRequestsController
);


// ============================================================
// DRIVER ACCEPTS OPEN RIDE REQUEST
// PATCH /api/open-ride-requests/:id/accept
// ============================================================

router.patch(
    "/:id/accept",
    authenticateToken,
    authorizeRoles("driver"),
    acceptOpenRideRequestController
);


module.exports = router;