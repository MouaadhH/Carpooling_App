const { sql , getPool } = require("../config/db");


const createRide = async ({
    id_driver_posted,
    id_vehicile,
    id_adresse_start,
    id_adresse_arrive,
    departure_time,
    distance,
    empty_seats
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_driver_posted", id_driver_posted)
        .input("id_vehicile", id_vehicile)
        .input("id_adresse_start", id_adresse_start)
        .input("id_adresse_arrive", id_adresse_arrive)
        .input("departure_time", departure_time)
        .input("distance", distance)
        .input("empty_seats", empty_seats)
        .query(`
            INSERT INTO RIDE
            (
                id_driver_posted,
                id_vehicile,
                id_adresse_start,
                id_adresse_arrive,
                departure_time,
                distance,
                empty_seats
            )
            OUTPUT INSERTED.*
            VALUES
            (
                @id_driver_posted,
                @id_vehicile,
                @id_adresse_start,
                @id_adresse_arrive,
                @departure_time,
                @distance,
                @empty_seats
            )
        `);

    return result.recordset[0];
};

const getAvailableRides = async () => {

    const pool = getPool();

    const result = await pool
        .request()
        .query(`
            SELECT
                r.id_ride,
                r.prix_total,
                r.distance,
                r.empty_seats,
                r.departure_time,
                r.status_ride,
                r.commission,
                r.creation_date_ride,
                r.id_driver_posted,
                r.id_vehicile,
                r.id_adresse_start,
                r.id_adresse_arrive,

                u.name_u AS driver_name,

                a1.latitude AS start_latitude,
                a1.longitude AS start_longitude,
                a1.libelle AS start_label,

                a2.latitude AS arrive_latitude,
                a2.longitude AS arrive_longitude,
                a2.libelle AS arrive_label

            FROM RIDE r

            INNER JOIN [USER] u
                ON r.id_driver_posted = u.id_user

            INNER JOIN ADRESSE a1
                ON r.id_adresse_start = a1.id_adresse

            INNER JOIN ADRESSE a2
                ON r.id_adresse_arrive = a2.id_adresse

            WHERE r.status_ride = 'active'
              AND r.departure_time >= SYSDATETIME()

            ORDER BY r.departure_time ASC
        `);

    return result.recordset;
};

const getRideById = async (id_ride) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .query(`
            SELECT
                r.id_ride,
                r.prix_total,
                r.distance,
                r.empty_seats,
                r.departure_time,
                r.status_ride,
                r.commission,
                r.creation_date_ride,
                r.id_driver_posted,
                r.id_vehicile,
                r.id_adresse_start,
                r.id_adresse_arrive,

                u.name_u AS driver_name,
                u.phone_u AS driver_phone,

                a1.latitude AS start_latitude,
                a1.longitude AS start_longitude,
                a1.libelle AS start_label,

                a2.latitude AS arrive_latitude,
                a2.longitude AS arrive_longitude,
                a2.libelle AS arrive_label

            FROM RIDE r

            INNER JOIN [USER] u
                ON r.id_driver_posted = u.id_user

            INNER JOIN ADRESSE a1
                ON r.id_adresse_start = a1.id_adresse

            INNER JOIN ADRESSE a2
                ON r.id_adresse_arrive = a2.id_adresse

            WHERE r.id_ride = @id_ride
        `);

    return result.recordset[0];
};

const updateRide = async ({
    id_ride,
    id_driver_posted,
    id_vehicile,
    id_adresse_start,
    id_adresse_arrive,
    departure_time,
    distance,
    empty_seats
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver_posted", id_driver_posted)
        .input("id_vehicile", id_vehicile)
        .input("id_adresse_start", id_adresse_start)
        .input("id_adresse_arrive", id_adresse_arrive)
        .input("departure_time", departure_time)
        .input("distance", distance)
        .input("empty_seats", empty_seats)
        .query(`
            UPDATE RIDE
            SET
                id_vehicile = @id_vehicile,
                id_adresse_start = @id_adresse_start,
                id_adresse_arrive = @id_adresse_arrive,
                departure_time = @departure_time,
                distance = @distance,
                empty_seats = @empty_seats
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver_posted;

            SELECT *
            FROM RIDE
            WHERE id_ride = @id_ride;
        `);

    return result.recordset[0];
};

const cancelRide = async ({ id_ride, id_driver }) => {

    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {

        await transaction.begin();

        // 1. Verify that the ride belongs to this driver
        //    and can still be cancelled.
        const rideResult = await new sql.Request(transaction)
            .input("id_ride", id_ride)
            .input("id_driver", id_driver)
            .query(`
                SELECT
                    id_ride,
                    id_driver_posted,
                    status_ride
                FROM RIDE
                WHERE id_ride = @id_ride
                  AND id_driver_posted = @id_driver
            `);

        if (rideResult.recordset.length === 0) {
            throw new Error(
                "Ride not found or you are not the driver who posted it"
            );
        }

        const ride = rideResult.recordset[0];

        // 2. Only active rides can be cancelled.
        if (ride.status_ride !== "active") {
            throw new Error(
                "Only active rides can be cancelled"
            );
        }

        // 3. Cancel the ride.
        await new sql.Request(transaction)
            .input("id_ride", id_ride)
            .query(`
                UPDATE RIDE
                SET
                    status_ride = 'cancelled',
                    is_available = 0
                WHERE id_ride = @id_ride
                 and status_ride = 'active'
            `);

        // 4. Cancel passenger requests that were already approved.
        await new sql.Request(transaction)
            .input("id_ride", id_ride)
            .query(`
                UPDATE RIDE_REQUEST
                SET status = 'cancelled'
                WHERE id_ride = @id_ride
                  AND status IN ('approved', 'pending')
            `);

        // 5. Get the final ride state.
        const result = await new sql.Request(transaction)
            .input("id_ride", id_ride)
            .query(`
                SELECT *
                FROM RIDE
                WHERE id_ride = @id_ride
            `);

        await transaction.commit();

        return result.recordset[0];

    } catch (error) {

        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError
            );
        }

        throw error;
    }
};

const updateRideAvailability = async ({
    id_ride,
    id_driver,
    is_available
}) => {

    const pool = getPool();

    // Validate availability value
    if (is_available !== 0 && is_available !== 1) {
        throw new Error(
            "is_available must be 0 or 1"
        );
    }

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver", id_driver)
        .input("is_available", is_available)
        .query(`
            UPDATE RIDE
            SET is_available = @is_available
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver
              AND status_ride = 'active'
              AND (
                    @is_available = 0
                    OR empty_seats > 0
                  );

            SELECT *
            FROM RIDE
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride not found or you are not the driver who posted it"
        );
    }

    const ride = result.recordset[0];

    // If the ride is active but the requested availability
    // could not be applied, the ride state was not changed.
    if (
        ride.status_ride !== "active" ||
        (is_available === 1 && ride.empty_seats <= 0)
    ) {
        throw new Error(
            "Ride cannot be made available"
        );
    }

    return ride;
};

const startRide = async ({ id_ride, id_driver }) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver", id_driver)
        .query(`
            UPDATE RIDE
            SET status_ride = 'in_progress'
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver
              AND status_ride = 'active'
              AND is_available = 0;

            SELECT *
            FROM RIDE
            WHERE id_ride = @id_ride;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride not found or ride cannot be started"
        );
    }

    return result.recordset[0];
};

const updateRideLocation = async ({
    id_ride,
    id_driver,
    latitude,
    longitude
}) => {

    const pool = getPool();

    // Validate GPS coordinates
    const driverLatitude = Number(latitude);
    const driverLongitude = Number(longitude);

    if (
        !Number.isFinite(driverLatitude) ||
        !Number.isFinite(driverLongitude)
    ) {
        throw new Error("Latitude and longitude must be valid numbers");
    }

    if (
        driverLatitude < -90 ||
        driverLatitude > 90
    ) {
        throw new Error("Latitude must be between -90 and 90");
    }

    if (
        driverLongitude < -180 ||
        driverLongitude > 180
    ) {
        throw new Error("Longitude must be between -180 and 180");
    }

    // Get the ride and its destination coordinates
    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver", id_driver)
        .query(`
            SELECT
                r.id_ride,
                r.id_driver_posted,
                r.status_ride,
                r.id_adresse_arrive,
                a.latitude AS destination_latitude,
                a.longitude AS destination_longitude
            FROM RIDE r
            INNER JOIN ADRESSE a
                ON r.id_adresse_arrive = a.id_adresse
            WHERE r.id_ride = @id_ride
              AND r.id_driver_posted = @id_driver
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride not found or you are not the driver who posted it"
        );
    }

    const ride = result.recordset[0];

    // The ride must already have started
    if (ride.status_ride !== "in_progress") {
        throw new Error("Ride is not in progress");
    }

    const destinationLatitude = Number(ride.destination_latitude);
    const destinationLongitude = Number(ride.destination_longitude);

    // Convert degrees to radians
    const toRadians = (degrees) => {
        return degrees * Math.PI / 180;
    };

    // Haversine formula
    const R = 6371000;

    const latDifference =
        toRadians(destinationLatitude - driverLatitude);

    const lonDifference =
        toRadians(destinationLongitude - driverLongitude);

    const a =
        Math.sin(latDifference / 2) ** 2 +
        Math.cos(toRadians(driverLatitude)) *
        Math.cos(toRadians(destinationLatitude)) *
        Math.sin(lonDifference / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    const distance = R * c;

    // Arrival radius = 100 meters
    const ARRIVAL_RADIUS = 100;

    if (distance <= ARRIVAL_RADIUS) {

        const completedResult = await pool
            .request()
            .input("id_ride", id_ride)
            .query(`
                UPDATE RIDE
                SET status_ride = 'completed'
                WHERE id_ride = @id_ride
                  AND status_ride = 'in_progress';

                SELECT *
                FROM RIDE
                WHERE id_ride = @id_ride;
            `);

        return {
            ride: completedResult.recordset[0],
            distance_meters: Math.round(distance),
            completed: true
        };
    }

    return {
        ride,
        distance_meters: Math.round(distance),
        completed: false
    };
};

module.exports = {
    createRide,
    getAvailableRides,
    getRideById,
    updateRide,
    cancelRide,
    updateRideAvailability,
    startRide,
    updateRideLocation
};