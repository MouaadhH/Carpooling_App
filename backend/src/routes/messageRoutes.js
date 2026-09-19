const express = require("express");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    sendMessageController,
    getConversationMessagesController
} = require("../controllers/messageController");

const router = express.Router();

router.post(
    "/:id_conversation/messages",
    authenticateToken,
    sendMessageController
);

router.get(
    "/:id_conversation/messages",
    authenticateToken,
    getConversationMessagesController
);

module.exports = router;