

const { sql, getPool } = require("../config/db");

const checkDriverRideEligibility = async ({
    id_driver,
    id_vehicile
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .input("id_vehicile", sql.Int, id_vehicile)
        .query(`
            SELECT
                dp.is_verified AS driver_verified,
                v.id_vehicile,
                v.number_of_seats,
                v.verification_status AS vehicle_status
            FROM DRIVER_PROFILE dp
            INNER JOIN VEHICLE v
                ON v.id_profile = dp.id_profile
            WHERE dp.id_driver = @id_driver
              AND v.id_vehicile = @id_vehicile;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Vehicle not found or you are not the owner"
        );
    }

    const eligibility = result.recordset[0];

    if (
        eligibility.driver_verified !== true &&
        Number(eligibility.driver_verified) !== 1
    ) {
        throw new Error(
            "Driver profile must be verified before posting a ride"
        );
    }

    if (eligibility.vehicle_status !== "approved") {
        throw new Error(
            "Vehicle must be approved before posting a ride"
        );
    }

    if (
        !Number.isInteger(Number(eligibility.number_of_seats)) ||
        Number(eligibility.number_of_seats) <= 0
    ) {
        throw new Error(
            "Vehicle must have a valid number of seats"
        );
    }

    return {
        id_vehicile: eligibility.id_vehicile,
        number_of_seats: Number(eligibility.number_of_seats)
    };
};

module.exports = {
    checkDriverRideEligibility
};