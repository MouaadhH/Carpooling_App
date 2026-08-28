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

module.exports = {
    createRide
};