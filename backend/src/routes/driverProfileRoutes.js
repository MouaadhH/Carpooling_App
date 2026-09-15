const express = require("express");

const {
    createDriverProfileController,
    getMyDriverProfileController,
    updateDriverProfileController,
    getPendingDriversController,
    getDriverForVerificationController,
    verifyDriverController,
    rejectDriverController
} = require("../controllers/driverProfileController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();


// ==================== DRIVER ====================

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


// ==================== ADMIN ====================

router.get(
    "/admin/unverified",
    authenticateToken,
    authorizeRoles("admin"),
    getPendingDriversController
);

router.get(
    "/admin/:id/profile",
    authenticateToken,
    authorizeRoles("admin"),
    getDriverForVerificationController
);

router.patch(
    "/admin/:id/verify",
    authenticateToken,
    authorizeRoles("admin"),
    verifyDriverController
);

router.patch(
    "/admin/:id/reject",
    authenticateToken,
    authorizeRoles("admin"),
    rejectDriverController
);


module.exports = router;