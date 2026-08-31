const { getPool, sql } = require("../config/db");

const createRideRequest = async ({
    id_user,
    id_ride,
    seats_needed,
    desired_time,
    desired_price,
    id_adresse_pickup,
    id_adresse_dropoff
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_user", id_user)
        .input("id_ride", id_ride ?? null)
        .input("seats_needed", seats_needed)
        .input("desired_time", desired_time ?? null)
        .input("desired_price", desired_price ?? null)
        .input("id_adresse_pickup", id_adresse_pickup)
        .input("id_adresse_dropoff", id_adresse_dropoff)
        .query(`
            INSERT INTO RIDE_REQUEST
            (
                id_user,
                id_ride,
                seats_needed,
                desired_time,
                desired_price,
                id_adresse_pickup,
                id_adresse_dropoff
            )
            VALUES
            (
                @id_user,
                @id_ride,
                @seats_needed,
                @desired_time,
                @desired_price,
                @id_adresse_pickup,
                @id_adresse_dropoff
            );

            SELECT *
            FROM RIDE_REQUEST
            WHERE id_ride_request = SCOPE_IDENTITY();
        `);

    return result.recordset[0];
};

const getRideRequests = async ({
    id_ride,
    id_driver_posted
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver_posted", id_driver_posted)
        .query(`
            SELECT
                rr.id_ride_request,
                rr.status,
                rr.seats_needed,
                rr.creation_date_req,
                rr.desired_time,
                rr.desired_price,
                rr.id_user,
                rr.id_ride,
                rr.id_adresse_pickup,
                rr.id_adresse_dropoff,

                u.name_u AS passenger_name,
                u.phone_u AS passenger_phone,

                pickup.latitude AS pickup_latitude,
                pickup.longitude AS pickup_longitude,
                pickup.libelle AS pickup_label,

                dropoff.latitude AS dropoff_latitude,
                dropoff.longitude AS dropoff_longitude,
                dropoff.libelle AS dropoff_label

            FROM RIDE_REQUEST rr

            INNER JOIN RIDE r
                ON rr.id_ride = r.id_ride

            INNER JOIN [USER] u
                ON rr.id_user = u.id_user

            INNER JOIN ADRESSE pickup
                ON rr.id_adresse_pickup = pickup.id_adresse

            INNER JOIN ADRESSE dropoff
                ON rr.id_adresse_dropoff = dropoff.id_adresse

            WHERE rr.id_ride = @id_ride
              AND r.id_driver_posted = @id_driver_posted

            ORDER BY rr.creation_date_req ASC
        `);

    return result.recordset;
};

const getOpenRideRequests = async () => {

    const pool = getPool();

    const result = await pool
        .request()
        .query(`
            SELECT
                rr.id_ride_request,
                rr.status,
                rr.seats_needed,
                rr.creation_date_req,
                rr.desired_time,
                rr.desired_price,

                rr.id_user,
                rr.id_adresse_pickup,
                rr.id_adresse_dropoff,

                u.name_u AS passenger_name,
                u.phone_u AS passenger_phone,

                pickup.latitude AS pickup_latitude,
                pickup.longitude AS pickup_longitude,
                pickup.libelle AS pickup_label,

                dropoff.latitude AS dropoff_latitude,
                dropoff.longitude AS dropoff_longitude,
                dropoff.libelle AS dropoff_label

            FROM RIDE_REQUEST rr

            INNER JOIN [USER] u
                ON rr.id_user = u.id_user

            INNER JOIN ADRESSE pickup
                ON rr.id_adresse_pickup = pickup.id_adresse

            INNER JOIN ADRESSE dropoff
                ON rr.id_adresse_dropoff = dropoff.id_adresse

            WHERE rr.id_ride IS NULL
              AND rr.status = 'pending'

            ORDER BY rr.creation_date_req ASC
        `);

    return result.recordset;
};

const acceptOpenRideRequest = async ({
    id_ride_request,
    id_driver
}) => {

    const pool = getPool();

    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {

        // STEP 1 — Get and lock the request
        const requestResult = await transaction
            .request()
            .input("id_ride_request", id_ride_request)
            .query(`
                SELECT
                    id_ride_request,
                    status,
                    seats_needed,
                    desired_time,
                    desired_price,
                    id_user,
                    id_ride,
                    id_adresse_pickup,
                    id_adresse_dropoff
                FROM RIDE_REQUEST WITH (UPDLOCK, HOLDLOCK)
                WHERE id_ride_request = @id_ride_request
            `);

        if (requestResult.recordset.length === 0) {
            throw new Error("Ride request not found");
        }

        const request = requestResult.recordset[0];

        // STEP 2 — Make sure request is still open
        if (request.status !== "pending") {
            throw new Error("Ride request is no longer pending");
        }

        if (request.id_ride !== null) {
            throw new Error("Ride request is already linked to a ride");
        }

        // STEP 3 — Make sure driver isn't the passenger
        if (Number(request.id_user) === Number(id_driver)) {
            throw new Error("A driver cannot accept their own ride request");
        }

        // STEP 4 — Find driver's approved vehicle
        const vehicleResult = await transaction
            .request()
            .input("id_driver", id_driver)
            .query(`
                SELECT TOP 1
                    v.id_vehicile
                FROM VEHICLE v
                INNER JOIN DRIVER_PROFILE dp
                    ON v.id_profil = dp.id_profil
                WHERE dp.id_driver = @id_driver
                  AND v.verification_status = 'approved'
                ORDER BY v.id_vehicile
            `);

        if (vehicleResult.recordset.length === 0) {
            throw new Error("Driver does not have an approved vehicle");
        }

        const id_vehicile = vehicleResult.recordset[0].id_vehicile;

        // STEP 5 — Create the new ride
        const rideResult = await transaction
            .request()
            .input("prix_total", request.desired_price)
            .input("departure_time", request.desired_time)
            .input("id_driver_posted", id_driver)
            .input("id_vehicile", id_vehicile)
            .input("id_adresse_start", request.id_adresse_pickup)
            .input("id_adresse_arrive", request.id_adresse_dropoff)
            .input("empty_seats", request.seats_needed)
            .query(`
                INSERT INTO RIDE
                (
                    prix_total,
                    departure_time,
                    status_ride,
                    id_driver_posted,
                    id_vehicile,
                    id_adresse_start,
                    id_adresse_arrive,
                    empty_seats
                )
                VALUES
                (
                    @prix_total,
                    @departure_time,
                    'active',
                    @id_driver_posted,
                    @id_vehicile,
                    @id_adresse_start,
                    @id_adresse_arrive,
                    @empty_seats
                );

                SELECT *
                FROM RIDE
                WHERE id_ride = SCOPE_IDENTITY();
            `);

        const ride = rideResult.recordset[0];

        // STEP 6 — Approve request and attach it to the new ride
        await transaction
            .request()
            .input("id_ride_request", id_ride_request)
            .input("id_ride", ride.id_ride)
            .query(`
                UPDATE RIDE_REQUEST
                SET
                    status = 'approved',
                    id_ride = @id_ride
                WHERE id_ride_request = @id_ride_request
            `);

        // STEP 7 — Everything succeeded
        await transaction.commit();

        return {
            ride,
            requestId: id_ride_request
        };

    } catch (error) {

        // Something failed → undo everything
        await transaction.rollback();

        throw error;
    }
};
const requestToJoinRide = async ({
    id_user,
    id_ride,
    seats_needed,
    desired_time,
    desired_price,
    id_adresse_pickup,
    id_adresse_dropoff
}) => {

    const pool = getPool();

    // Check the ride
    const rideResult = await pool
        .request()
        .input("id_ride", id_ride)
        .query(`
            SELECT
                id_ride,
                id_driver_posted,
                empty_seats,
                departure_time,
                status_ride
            FROM RIDE
            WHERE id_ride = @id_ride
        `);

    if (rideResult.recordset.length === 0) {
        throw new Error("Ride not found");
    }

    const ride = rideResult.recordset[0];

    // Passenger cannot request the ride he/she posted
    if (Number(ride.id_driver_posted) === Number(id_user)) {
        throw new Error("You cannot request your own ride");
    }

    // Ride must be active
    if (ride.status_ride !== "active") {
        throw new Error("This ride is not active");
    }

    // Check available seats
    if (ride.empty_seats < seats_needed) {
        throw new Error("Not enough available seats");
    }

    // Create the request
    return await createRideRequest({
        id_user,
        id_ride,
        seats_needed,
        desired_time,
        desired_price,
        id_adresse_pickup,
        id_adresse_dropoff
    });
};

const approveRideRequest = async ({ id_ride_request, id_driver }) => {

    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Get the request + corresponding ride
        const requestResult = await new sql.Request(transaction)
            .input("id_ride_request", id_ride_request)
            .query(`
                SELECT
                    rr.id_ride_request,
                    rr.id_user,
                    rr.id_ride,
                    rr.seats_needed,
                    rr.status,
                    r.id_driver_posted,
                    r.empty_seats,
                    r.status_ride,
                    r.is_available
                FROM RIDE_REQUEST rr
                INNER JOIN RIDE r
                    ON rr.id_ride = r.id_ride
                WHERE rr.id_ride_request = @id_ride_request
            `);

        if (requestResult.recordset.length === 0) {
            throw new Error("Ride request not found");
        }

        const request = requestResult.recordset[0];

        // Only the driver who posted the ride can approve it
        if (Number(request.id_driver_posted) !== Number(id_driver)) {
            throw new Error(
                "You are not the driver who posted this ride"
            );
        }

        // Request must still be pending
        if (request.status !== "pending") {
            throw new Error(
                "This ride request is no longer pending"
            );
        }

        // Ride must still be active
        if (request.status_ride !== "active") {
            throw new Error(
                "This ride is no longer active"
            );
        }

        // Driver must still be accepting passengers
        if (!request.is_available) {
            throw new Error(
                "This ride is no longer accepting passengers"
            );
        }

        // Check available seats
        if (request.empty_seats < request.seats_needed) {
            throw new Error(
                "Not enough available seats"
            );
        }

        // Calculate remaining seats
        const remainingSeats =
            request.empty_seats - request.seats_needed;

        // Approve the request
        await new sql.Request(transaction)
            .input("id_ride_request", id_ride_request)
            .query(`
                UPDATE RIDE_REQUEST
                SET status = 'approved'
                WHERE id_ride_request = @id_ride_request
            `);

        // Update ride seats + availability
        await new sql.Request(transaction)
            .input("id_ride", request.id_ride)
            .input("remaining_seats", remainingSeats)
            .query(`
                UPDATE RIDE
                SET
                    empty_seats = @remaining_seats,
                    is_available =
                        CASE
                            WHEN @remaining_seats = 0 THEN 0
                            ELSE is_available
                        END
                WHERE id_ride = @id_ride
            `);

        await transaction.commit();

        return {
            id_ride_request: request.id_ride_request,
            id_ride: request.id_ride,
            status: "approved"
        };

    } catch (error) {

        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error("ROLLBACK ERROR:", rollbackError);
        }

        throw error;
    }
};

const rejectRideRequest = async ({ id_ride_request, id_driver }) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride_request", id_ride_request)
        .input("id_driver", id_driver)
        .query(`
            UPDATE rr
            SET rr.status = 'rejected'
            FROM RIDE_REQUEST rr
            INNER JOIN RIDE r
                ON rr.id_ride = r.id_ride
            WHERE rr.id_ride_request = @id_ride_request
              AND r.id_driver_posted = @id_driver
              AND rr.status = 'pending';

            SELECT *
            FROM RIDE_REQUEST
            WHERE id_ride_request = @id_ride_request;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride request not found, not pending, or you are not the ride owner"
        );
    }

    return result.recordset[0];
};


module.exports = {
    createRideRequest,
    getRideRequests,
    getOpenRideRequests,
    acceptOpenRideRequest,
    requestToJoinRide,
    approveRideRequest,
    rejectRideRequest
};