const express = require("express");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    createConversationController,
    getConversationContactController
} = require("../controllers/conversationController");

const router = express.Router();

router.post(
    "/",
    authenticateToken,
    createConversationController
);

router.get(
    "/:id_conversation/contact",
    authenticateToken,
    getConversationContactController
);

module.exports = router;