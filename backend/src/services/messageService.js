const { getPool, sql } = require("../config/db");

const sendMessage = async ({
    id_conversation,
    id_sender,
    content
}) => {
    const pool = getPool();

    if (!content || !content.trim()) {
        throw new Error("Message content is required");
    }

    // Verify that the sender belongs to the conversation.
    const conversationResult = await pool
        .request()
        .input("id_conversation", sql.Int, id_conversation)
        .input("id_sender", sql.Int, id_sender)
        .query(`
            SELECT
                c.id_conversation,
                c.id_ride,
                c.id_driver,
                c.id_passenger,
                r.status_ride
            FROM CONVERSATION c
            INNER JOIN RIDE r
                ON r.id_ride = c.id_ride
            WHERE c.id_conversation = @id_conversation
              AND (
                    c.id_driver = @id_sender
                    OR c.id_passenger = @id_sender
                  );
        `);

    if (conversationResult.recordset.length === 0) {
        throw new Error(
            "You are not authorized to send messages in this conversation"
        );
    }

    const conversation = conversationResult.recordset[0];

    // The conversation can only be used after the passenger
    // has been approved.
    if (
        conversation.status_ride !== "active" &&
        conversation.status_ride !== "in_progress" &&
        conversation.status_ride !== "completed"
    ) {
        throw new Error("Messaging is not allowed for this ride");
    }

    // Insert message.
    const insertResult = await pool
        .request()
        .input("content", sql.NVarChar(sql.MAX), content.trim())
        .input("sent_date", sql.DateTime2, new Date())
        .input("id_sender", sql.Int, id_sender)
        .input("id_conversation", sql.Int, id_conversation)
        .query(`
            DECLARE @newId INT;

            INSERT INTO MESSAGE (
                content,
                sent_date,
                id_sender,
                id_conversation
            )
            VALUES (
                @content,
                @sent_date,
                @id_sender,
                @id_conversation
            );

            SET @newId = SCOPE_IDENTITY();

            SELECT
                m.id_message,
                m.content,
                m.sent_date,
                m.id_sender,
                m.id_conversation
            FROM MESSAGE m
            WHERE m.id_message = @newId;
        `);

    return insertResult.recordset[0];
};


const getConversationMessages = async ({
    id_conversation,
    id_user
}) => {
    const pool = getPool();

    // Verify that the user belongs to the conversation.
    const conversationResult = await pool
        .request()
        .input("id_conversation", sql.Int, id_conversation)
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT id_conversation
            FROM CONVERSATION
            WHERE id_conversation = @id_conversation
              AND (
                    id_driver = @id_user
                    OR id_passenger = @id_user
                  );
        `);

    if (conversationResult.recordset.length === 0) {
        throw new Error(
            "You are not authorized to access this conversation"
        );
    }

    const result = await pool
        .request()
        .input("id_conversation", sql.Int, id_conversation)
        .query(`
            SELECT
                id_message,
                content,
                sent_date,
                id_sender,
                id_conversation
            FROM MESSAGE
            WHERE id_conversation = @id_conversation
            ORDER BY sent_date ASC, id_message ASC;
        `);

    return result.recordset;
};


module.exports = {
    sendMessage,
    getConversationMessages
};