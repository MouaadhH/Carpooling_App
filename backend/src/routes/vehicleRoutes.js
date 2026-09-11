const express = require("express");

const {
    getPendingVehiclesController,
    getVehicleByIdController,
    approveVehicleController,
    rejectVehicleController,
    createVehicleController,
    getMyVehiclesController,
    getMyVehicleByIdController,
    updateVehicleController,
    deleteVehicleController
} = require("../controllers/vehicleController");

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
    createVehicleController
);

router.get(
    "/my",
    authenticateToken,
    authorizeRoles("driver"),
    getMyVehiclesController
);

router.get(
    "/my/:id",
    authenticateToken,
    authorizeRoles("driver"),
    getMyVehicleByIdController
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("driver"),
    updateVehicleController
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("driver"),
    deleteVehicleController
);

router.get(
    "/pending",
    authenticateToken,
    authorizeRoles("admin"),
    getPendingVehiclesController
);


router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    getVehicleByIdController
);


router.patch(
    "/:id/approve",
    authenticateToken,
    authorizeRoles("admin"),
    approveVehicleController
);


router.patch(
    "/:id/reject",
    authenticateToken,
    authorizeRoles("admin"),
    rejectVehicleController
);




module.exports = router;