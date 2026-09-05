const express = require("express");

const {
    createRideRequestController,
    getRideRequestsController,
    approveRideRequestController,
    rejectRideRequestController,
    cancelRideRequestController,
    updatePaymentMethodController,
    payRideRequestController
} = require("../controllers/rideRequestController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();


// ============================================================
// PASSENGER REQUESTS TO JOIN AN EXISTING RIDE
// POST /api/rides/:id/request
// ============================================================

router.post(
    "/:id/request",
    authenticateToken,
    authorizeRoles("passenger"),
    createRideRequestController
);


// ============================================================
// DRIVER GETS REQUESTS FOR HIS RIDE
// GET /api/rides/:id/requests
// ============================================================

router.get(
    "/:id/requests",
    authenticateToken,
    authorizeRoles("driver"),
    getRideRequestsController
);


// ============================================================
// DRIVER APPROVES RIDE REQUEST
// PATCH /api/rides/requests/:id/approve
// ============================================================

router.patch(
    "/requests/:id/approve",
    authenticateToken,
    authorizeRoles("driver"),
    approveRideRequestController
);


// ============================================================
// DRIVER REJECTS RIDE REQUEST
// PATCH /api/rides/requests/:id/reject
// ============================================================

router.patch(
    "/requests/:id/reject",
    authenticateToken,
    authorizeRoles("driver"),
    rejectRideRequestController
);


// ============================================================
// PASSENGER CANCELS RIDE REQUEST
// PATCH /api/rides/requests/:id/cancel
// ============================================================

router.patch(
    "/requests/:id/cancel",
    authenticateToken,
    authorizeRoles("passenger"),
    cancelRideRequestController
);


// ============================================================
// PASSENGER UPDATES PAYMENT METHOD
// PATCH /api/rides/:id/payment-method
// ============================================================

router.patch(
    "/:id/payment-method",
    authenticateToken,
    authorizeRoles("passenger"),
    updatePaymentMethodController
);
// passanger pays for the ride 
router.patch(
    "/:id/pay",
    authenticateToken,
    authorizeRoles("passenger"),
    payRideRequestController
);


module.exports = router;