const express = require("express");

const {
    createRideController,
    getAvailableRidesController,
    getRideByIdController,
    updateRideController,
    cancelRideController,
    updateRideAvailabilityController,
    startRideController,
    updateRideLocationController
    
} = require("../controllers/rideController");

//middlewares------------------------
const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();
//-------------------------------------
router.post(
    "/",
    authenticateToken,
    authorizeRoles("driver"),
    createRideController
);

router.get(
    "/",
    authenticateToken,
    getAvailableRidesController
);

router.get(
    "/:id",
    authenticateToken,
    getRideByIdController
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("driver"),
    updateRideController
);

router.patch(
    "/:id/cancel",
    authenticateToken,
    authorizeRoles("driver"),
    cancelRideController
);

router.patch(
    "/:id/availability",
    authenticateToken,
    authorizeRoles("driver"),
    updateRideAvailabilityController
);

router.patch(
    "/:id/start",
    authenticateToken,
    authorizeRoles("driver"),
    startRideController
);

router.patch(
    "/:id/location",
    authenticateToken,
    authorizeRoles("driver"),
    updateRideLocationController
);

module.exports = router;