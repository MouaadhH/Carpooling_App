const {
    getOrCreateConversation,
    getConversationContact
} = require("../services/conversationService");

const createConversationController = async (req, res) => {
    try {
        const { id_ride, id_passenger } = req.body;

        const conversation = await getOrCreateConversation({
            id_ride,
            id_passenger,
            id_user: req.user.id_user
        });

        res.status(201).json({
            message: "Conversation created successfully",
            conversation
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to create conversation",
            error: error.message
        });
    }
};

const getConversationContactController = async (req, res) => {
    try {
        const { id_conversation } = req.params;

        const contact = await getConversationContact({
            id_conversation,
            id_user: req.user.id_user
        });

        res.status(200).json({
            message: "Contact retrieved successfully",
            contact
        });
    } catch (error) {
        res.status(400).json({
            message: "Failed to retrieve contact",
            error: error.message
        });
    }
};

module.exports = {
    createConversationController,
    getConversationContactController
};