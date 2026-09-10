const { getPool, sql } = require("../config/db");


const createEvaluation = async ({
    id_evaluator,
    id_evaluated,
    id_ride,
    stars,
    comment
}) => {

    const evaluatorId = Number(id_evaluator);
    const rideId = Number(id_ride);
    const rating = Number(stars);

    if (!Number.isInteger(evaluatorId) || evaluatorId <= 0) {
        throw new Error("Invalid evaluator ID");
    }

    if (!Number.isInteger(rideId) || rideId <= 0) {
        throw new Error("Invalid ride ID");
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("Stars must be an integer between 1 and 5");
    }

    if (comment !== undefined && comment !== null) {
        if (typeof comment !== "string") {
            throw new Error("Comment must be a string");
        }

        if (comment.length > 1000) {
            throw new Error("Comment cannot exceed 1000 characters");
        }
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {

        await transaction.begin();

        // Check ride and evaluator participation
        const rideResult = await transaction
            .request()
            .input("id_ride", rideId)
            .query(`
                SELECT
                    r.id_ride,
                    r.status_ride,
                    r.id_driver_posted
                FROM RIDE r WITH (UPDLOCK, HOLDLOCK)
                WHERE r.id_ride = @id_ride;
            `);

        if (rideResult.recordset.length === 0) {
            throw new Error("Ride not found");
        }

        const ride = rideResult.recordset[0];

        // Evaluation is only allowed after completion
        if (ride.status_ride !== "completed") {
            throw new Error("Evaluation is only allowed for completed rides");
        }

        // Check if evaluator is the driver
        if (Number(ride.id_driver_posted) === evaluatorId) {

            // Driver can evaluate an approved passenger
            if (id_evaluated === undefined || id_evaluated === null) {
                throw new Error("id_evaluated is required when a driver evaluates a passenger");
            }

            const evaluatedPassengerId = Number(id_evaluated);

            if (!Number.isInteger(evaluatedPassengerId) || evaluatedPassengerId <= 0) {
                throw new Error("Invalid evaluated passenger ID");
            }

            if (evaluatedPassengerId === evaluatorId) {
                throw new Error("You cannot evaluate yourself");
            }

            const passengerResult = await transaction
                .request()
                .input("id_ride", rideId)
                .input("id_evaluated", evaluatedPassengerId)
                .query(`
                    SELECT
                        rr.id_user
                    FROM RIDE_REQUEST rr
                    WHERE rr.id_ride = @id_ride
                      AND rr.id_user = @id_evaluated
                      AND rr.status_request = 'approved';
                `);

            if (passengerResult.recordset.length === 0) {
                throw new Error("This passenger did not participate in this ride");
            }

            // Check duplicate evaluation
            const existingResult = await transaction
                .request()
                .input("id_evaluator", evaluatorId)
                .input("id_evaluated", evaluatedPassengerId)
                .input("id_ride", rideId)
                .query(`
                    SELECT id_evaluation
                    FROM EVALUATION
                    WHERE id_evaluator = @id_evaluator
                      AND id_evaluated = @id_evaluated
                      AND id_ride = @id_ride;
                `);

            if (existingResult.recordset.length > 0) {
                throw new Error("You have already evaluated this passenger for this ride");
            }

            // Insert evaluation
            const insertResult = await transaction
                .request()
                .input("stars", rating)
                .input("comment", comment ?? null)
                .input("date_eva", new Date())
                .input("id_evaluator", evaluatorId)
                .input("id_evaluated", evaluatedPassengerId)
                .input("id_ride", rideId)
                .query(`
                    DECLARE @newId INT;

                    INSERT INTO EVALUATION (
                        stars,
                        comment,
                        date_eva,
                        id_evaluator,
                        id_evaluated,
                        id_ride
                    )
                    VALUES (
                        @stars,
                        @comment,
                        @date_eva,
                        @id_evaluator,
                        @id_evaluated,
                        @id_ride
                    );

                    SET @newId = SCOPE_IDENTITY();

                    SELECT *
                    FROM EVALUATION
                    WHERE id_evaluation = @newId;
                `);

            await transaction.commit();

            return insertResult.recordset[0];
        }

        // Otherwise evaluator must be an approved passenger
        const passengerCheck = await transaction
            .request()
            .input("id_ride", rideId)
            .input("id_evaluator", evaluatorId)
            .query(`
                SELECT TOP 1
                    rr.id_user
                FROM RIDE_REQUEST rr
                WHERE rr.id_ride = @id_ride
                  AND rr.id_user = @id_evaluator
                  AND rr.status_request = 'approved';
            `);

        if (passengerCheck.recordset.length === 0) {
            throw new Error("You did not participate in this ride");
        }

        // Passenger evaluates the driver
        const evaluatedDriverId = Number(ride.id_driver_posted);

        if (evaluatedDriverId === evaluatorId) {
            throw new Error("You cannot evaluate yourself");
        }

        // Check duplicate evaluation
        const existingResult = await transaction
            .request()
            .input("id_evaluator", evaluatorId)
            .input("id_evaluated", evaluatedDriverId)
            .input("id_ride", rideId)
            .query(`
                SELECT id_evaluation
                FROM EVALUATION
                WHERE id_evaluator = @id_evaluator
                  AND id_evaluated = @id_evaluated
                  AND id_ride = @id_ride;
            `);

        if (existingResult.recordset.length > 0) {
            throw new Error("You have already evaluated this driver for this ride");
        }

        // Insert evaluation
        const insertResult = await transaction
            .request()
            .input("stars", rating)
            .input("comment", comment ?? null)
            .input("date_eva", new Date())
            .input("id_evaluator", evaluatorId)
            .input("id_evaluated", evaluatedDriverId)
            .input("id_ride", rideId)
            .query(`
                DECLARE @newId INT;

                INSERT INTO EVALUATION (
                    stars,
                    comment,
                    date_eva,
                    id_evaluator,
                    id_evaluated,
                    id_ride
                )
                VALUES (
                    @stars,
                    @comment,
                    @date_eva,
                    @id_evaluator,
                    @id_evaluated,
                    @id_ride
                );

                SET @newId = SCOPE_IDENTITY();

                SELECT *
                FROM EVALUATION
                WHERE id_evaluation = @newId;
            `);

        await transaction.commit();

        return insertResult.recordset[0];

    } catch (error) {

        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error("ROLLBACK EVALUATION ERROR:", rollbackError);
        }

        throw error;
    }
};


const updateEvaluation = async ({
    id_evaluation,
    id_evaluator,
    stars,
    comment
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_evaluation", id_evaluation)
        .input("id_evaluator", id_evaluator)
        .input("stars", stars)
        .input("comment", comment ?? null)
        .query(`
            UPDATE EVALUATION
            SET
                stars = @stars,
                comment = @comment
            WHERE id_evaluation = @id_evaluation
              AND id_evaluator = @id_evaluator;

            SELECT *
            FROM EVALUATION
            WHERE id_evaluation = @id_evaluation
              AND id_evaluator = @id_evaluator;
        `);

    if (result.recordset.length === 0) {
        throw new Error("Evaluation not found or you are not the evaluator");
    }

    return result.recordset[0];
};


const getUserEvaluationSummary = async (id_user) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_user", id_user)
        .query(`
            SELECT
                id_evaluated,
                CAST(AVG(CAST(stars AS DECIMAL(10,2))) AS DECIMAL(10,2)) AS average_rating,
                COUNT(*) AS total_evaluations
            FROM EVALUATION
            WHERE id_evaluated = @id_user
            GROUP BY id_evaluated;
        `);

    if (result.recordset.length === 0) {
        return {
            id_user: Number(id_user),
            average_rating: 0,
            total_evaluations: 0
        };
    }

    return {
        id_user: Number(id_user),
        average_rating: Number(result.recordset[0].average_rating),
        total_evaluations: Number(result.recordset[0].total_evaluations)
    };
};


const getUserEvaluations = async (id_user) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_user", id_user)
        .query(`
            SELECT
                e.id_evaluation,
                e.stars,
                e.comment,
                e.date_eva,
                e.id_evaluator,
                e.id_evaluated,
                e.id_ride
            FROM EVALUATION e
            WHERE e.id_evaluated = @id_user
            ORDER BY e.date_eva DESC;
        `);

    return result.recordset;
};


const getRideEvaluations = async (id_ride) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .query(`
            SELECT
                e.id_evaluation,
                e.stars,
                e.comment,
                e.date_eva,
                e.id_evaluator,
                e.id_evaluated,
                e.id_ride
            FROM EVALUATION e
            WHERE e.id_ride = @id_ride
            ORDER BY e.date_eva ASC;
        `);

    return result.recordset;
};


module.exports = {
    createEvaluation,
    updateEvaluation,
    getUserEvaluationSummary,
    getUserEvaluations,
    getRideEvaluations
};