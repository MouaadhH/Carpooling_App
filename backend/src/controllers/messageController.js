const {
    sendMessage,
    getConversationMessages
} = require("../services/messageService");

const sendMessageController = async (req, res) => {
    try {
        const { id_conversation } = req.params;
        const { content } = req.body;

        const message = await sendMessage({
            id_conversation,
            id_sender: req.user.id_user,
            content
        });

        res.status(201).json({
            message: "Message sent successfully",
            data: message
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to send message",
            error: error.message
        });
    }
};


const getConversationMessagesController = async (req, res) => {
    try {
        const { id_conversation } = req.params;

        const messages = await getConversationMessages({
            id_conversation,
            id_user: req.user.id_user
        });

        res.status(200).json({
            messages
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to get messages",
            error: error.message
        });
    }
};


module.exports = {
    sendMessageController,
    getConversationMessagesController
};