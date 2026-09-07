const express = require("express");


const {
    createRechargeController,
    getRechargeRequestController,
    getMyRechargeRequestsController,
    approveRechargeController
} = require("../controllers/rechargeController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");
const {
    authorizeRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();


/*
    Get all recharge requests
    of the authenticated user.
*/
router.get(
    "/",
    authenticateToken,
    getMyRechargeRequestsController
);


/*
    Create a recharge request.
*/
router.post(
    "/",
    authenticateToken,
    createRechargeController
);


/*
    Get one recharge request.
*/
router.get(
    "/:id",
    authenticateToken,
    getRechargeRequestController
);

router.patch(
    "/:id/approve",
    authenticateToken,
    authorizeRoles("admin"),
    approveRechargeController
);


module.exports = router;