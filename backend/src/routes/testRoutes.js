const express = require("express");

const { driverTest } = require("../controllers/testController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/driver",
    authenticateToken,
    authorizeRoles("driver"),
    driverTest
);

module.exports = router;