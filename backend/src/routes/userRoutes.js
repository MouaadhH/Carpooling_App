const express = require("express");

const { getMe } = require("../controllers/userController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticateToken, getMe);

module.exports = router;