const { getPool, sql } = require("../config/db");

const getOrCreateConversation = async ({
    id_ride,
    id_passenger,
    id_user
}) => {
    const pool = getPool();

    // Get ride and verify the authenticated user is either
    // the driver or an approved passenger.
    const rideResult = await pool
    .request()
    .input("id_ride", sql.Int, id_ride)
    .input("id_user", sql.Int, id_user)
    .query(`
        SELECT
            r.id_ride,
            r.id_driver_posted
        FROM RIDE r
        WHERE r.id_ride = @id_ride
          AND r.status_ride IN ('active', 'in_progress', 'completed')
          AND (
                r.id_driver_posted = @id_user

                OR EXISTS (
                    SELECT 1
                    FROM RIDE_REQUEST rr
                    WHERE rr.id_ride = r.id_ride
                      AND rr.id_user = @id_user
                      AND rr.status_request = 'approved'
                )
              );
    `);

    if (rideResult.recordset.length === 0) {
        throw new Error(
            "You are not authorized to access this ride"
        );
    }

    const ride = rideResult.recordset[0];

    const driverId = Number(ride.id_driver_posted);

    // If authenticated user is the driver, id_passenger is required.
    if (Number(id_user) === driverId) {
        if (
            id_passenger === undefined ||
            id_passenger === null
        ) {
            throw new Error(
                "id_passenger is required when the driver creates a conversation"
            );
        }

        const passengerResult = await pool
            .request()
            .input("id_ride", sql.Int, id_ride)
            .input("id_passenger", sql.Int, id_passenger)
            .query(`
                SELECT id_user
                FROM RIDE_REQUEST
                WHERE id_ride = @id_ride
                  AND id_user = @id_passenger
                  AND status_request = 'approved';
            `);

        if (passengerResult.recordset.length === 0) {
            throw new Error(
                "This passenger is not an approved passenger of this ride"
            );
        }
    } else {
        // Passenger can only create/access a conversation
        // with the driver of the ride.
        id_passenger = id_user;
    }

    // Check if conversation already exists.
    const existingResult = await pool
        .request()
        .input("id_ride", sql.Int, id_ride)
        .input("id_driver", sql.Int, driverId)
        .input("id_passenger", sql.Int, id_passenger)
        .query(`
            SELECT *
            FROM CONVERSATION
            WHERE id_ride = @id_ride
              AND id_driver = @id_driver
              AND id_passenger = @id_passenger;
        `);

    if (existingResult.recordset.length > 0) {
        return existingResult.recordset[0];
    }

    // Create conversation.
    const insertResult = await pool
        .request()
        .input("id_ride", sql.Int, id_ride)
        .input("id_driver", sql.Int, driverId)
        .input("id_passenger", sql.Int, id_passenger)
        .query(`
            DECLARE @newId INT;

            INSERT INTO CONVERSATION (
                id_ride,
                id_driver,
                id_passenger
            )
            VALUES (
                @id_ride,
                @id_driver,
                @id_passenger
            );

            SET @newId = SCOPE_IDENTITY();

            SELECT *
            FROM CONVERSATION
            WHERE id_conversation = @newId;
        `);

    return insertResult.recordset[0];
};

const getConversationContact = async ({
    id_conversation,
    id_user
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_conversation", sql.Int, id_conversation)
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                c.id_conversation,
                c.id_driver,
                c.id_passenger,
                driver.phone_u AS driver_phone,
                passenger.phone_u AS passenger_phone
            FROM CONVERSATION c
            INNER JOIN [USER] driver
                ON driver.id_user = c.id_driver
            INNER JOIN [USER] passenger
                ON passenger.id_user = c.id_passenger
            WHERE c.id_conversation = @id_conversation
              AND (
                    c.id_driver = @id_user
                    OR c.id_passenger = @id_user
                  );
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "You are not authorized to access this conversation"
        );
    }

    const conversation = result.recordset[0];

    const isDriver =
        Number(conversation.id_driver) === Number(id_user);

    return {
        id_conversation: conversation.id_conversation,
        contact_user_id: isDriver
            ? conversation.id_passenger
            : conversation.id_driver,
        phone: isDriver
            ? conversation.passenger_phone
            : conversation.driver_phone
    };
};

module.exports = {
    getOrCreateConversation,
    getConversationContact
};