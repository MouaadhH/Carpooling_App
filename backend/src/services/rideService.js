const { getPool } = require("../config/db");

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

const cancelRide = async ({
    id_ride,
    id_driver_posted
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver_posted", id_driver_posted)
        .query(`
            UPDATE RIDE
            SET status_ride = 'cancelled'
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver_posted
              AND status_ride = 'active';

            SELECT *
            FROM RIDE
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver_posted;
        `);

    return result.recordset[0];
};

const updateRideAvailability = async ({
    id_ride,
    id_driver,
    is_available
}) => {

    const pool = getPool();

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
            WHERE id_ride = @id_ride;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride not found or you are not the driver who posted it"
        );
    }

    return result.recordset[0];
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

module.exports = {
    createRide,
    getAvailableRides,
    getRideById,
    updateRide,
    cancelRide,
    updateRideAvailability,
    startRide
};