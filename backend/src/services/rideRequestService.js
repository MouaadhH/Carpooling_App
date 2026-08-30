const { getPool } = require("../config/db");

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
        .input("id_ride", id_ride)
        .input("seats_needed", seats_needed)
        .input("desired_time", desired_time)
        .input("desired_price", desired_price)
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

module.exports = {
    createRideRequest
};