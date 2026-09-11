const express = require("express");

const {
    createDriverProfileController,
    getMyDriverProfileController,
    updateDriverProfileController
} = require("../controllers/driverProfileController");

const {
    authenticateToken,
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/profile",
    authenticateToken,
    authorizeRoles("driver"),
    createDriverProfileController
);

router.get(
    "/profile",
    authenticateToken,
    authorizeRoles("driver"),
    getMyDriverProfileController
);

router.put(
    "/profile",
    authenticateToken,
    authorizeRoles("driver"),
    updateDriverProfileController
);

module.exports = router;