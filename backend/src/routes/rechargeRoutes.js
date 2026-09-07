const express = require("express");

const {
    createRechargeController,
    getRechargeRequestController,
    getMyRechargeRequestsController,
    approveRechargeController,
    rejectRechargeController
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

/*
    Approve a recharge request.

    Only an admin can approve.
*/
router.patch(
    "/:id/approve",
    authenticateToken,
    authorizeRoles("admin"),
    approveRechargeController
);
/*
    Reject a recharge request.

    Only an admin can reject.
*/
router.patch(
    "/:id/reject",
    authenticateToken,
    authorizeRoles("admin"),
    rejectRechargeController
);
module.exports = router;