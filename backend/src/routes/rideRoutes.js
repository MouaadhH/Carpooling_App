const express = require("express");

const {
    createRideController,
    getAvailableRidesController,
    getRideByIdController
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

module.exports = router;