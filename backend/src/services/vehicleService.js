const { sql, getPool } = require("../config/db");

const getPendingVehicles = async () => {
    const pool = getPool();

    const result = await pool
        .request()
        .query(`
            SELECT
                v.id_vehicile,
                v.vehicile_year,
                v.vehicile_pic,
                v.assurance_pic,
                v.carte_grise_pic,
                v.rejection_reason,
                v.verification_date,
                v.verification_status,
                v.id_profile,
                v.id_admin_approve,
                v.number_of_seats,

                dp.id_driver,
                dp.lisence_num,
                dp.is_verified ,

                u.name_u AS driver_name,
                u.phone_u AS driver_phone

            FROM VEHICLE v
            INNER JOIN DRIVER_PROFILE dp
                ON dp.id_profile = v.id_profile
            INNER JOIN [USER] u
                ON u.id_user = dp.id_driver

            WHERE v.verification_status = 'pending'
            ORDER BY v.verification_date ASC, v.id_vehicile ASC;
        `);

    return result.recordset;
};


const getVehicleById = async ({ id_vehicile }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_vehicile", sql.Int, id_vehicile)
        .query(`
            SELECT
                v.id_vehicile,
                v.vehicile_year,
                v.vehicile_pic,
                v.assurance_pic,
                v.carte_grise_pic,
                v.rejection_reason,
                v.verification_date,
                v.verification_status,
                v.id_profile,
                v.id_admin_approve,
                v.number_of_seats,

                dp.id_driver,
                dp.lisence_num,
                dp.lisence_pic,
                dp.is_verified,

                u.name_u AS driver_name,
                u.phone_u AS driver_phone

            FROM VEHICLE v
            INNER JOIN DRIVER_PROFILE dp
                ON dp.id_profile = v.id_profile
            INNER JOIN [USER] u
                ON u.id_user = dp.id_driver

            WHERE v.id_vehicile = @id_vehicile;
        `);

    if (result.recordset.length === 0) {
        throw new Error("Vehicle not found");
    }

    return result.recordset[0];
};


const approveVehicle = async ({
    id_vehicile,
    id_admin
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_vehicile", sql.Int, id_vehicile)
        .input("id_admin", sql.Int, id_admin)
        .query(`
            UPDATE VEHICLE
            SET
                verification_status = 'approved',
                verification_date = SYSDATETIME(),
                id_admin_approve = @id_admin,
                rejection_reason = NULL
            WHERE id_vehicile = @id_vehicile
              AND verification_status = 'pending';

            SELECT
                id_vehicile,
                vehicile_year,
                vehicile_pic,
                assurance_pic,
                carte_grise_pic,
                rejection_reason,
                verification_date,
                verification_status,
                id_profile,
                id_admin_approve,
                number_of_seats
            FROM VEHICLE
            WHERE id_vehicile = @id_vehicile;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Vehicle not found or vehicle is not pending verification"
        );
    }

    return result.recordset[0];
};


const rejectVehicle = async ({
    id_vehicile,
    id_admin,
    rejection_reason
}) => {
    const pool = getPool();

    if (
        !rejection_reason ||
        !rejection_reason.trim()
    ) {
        throw new Error(
            "Rejection reason is required"
        );
    }

    const result = await pool
        .request()
        .input("id_vehicile", sql.Int, id_vehicile)
        .input("id_admin", sql.Int, id_admin)
        .input(
            "rejection_reason",
            sql.NVarChar(500),
            rejection_reason.trim()
        )
        .query(`
            UPDATE VEHICLE
            SET
                verification_status = 'rejected',
                rejection_reason = @rejection_reason,
                verification_date = SYSDATETIME(),
                id_admin_approve = @id_admin
            WHERE id_vehicile = @id_vehicile
              AND verification_status = 'pending';

            SELECT
                id_vehicile,
                vehicile_year,
                vehicile_pic,
                assurance_pic,
                carte_grise_pic,
                rejection_reason,
                verification_date,
                verification_status,
                id_profile,
                id_admin_approve,
                number_of_seats
            FROM VEHICLE
            WHERE id_vehicile = @id_vehicile;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Vehicle not found or vehicle is not pending verification"
        );
    }

    return result.recordset[0];
};

const createVehicle = async ({
    id_driver,
    vehicile_year,
    vehicile_pic,
    assurance_pic,
    carte_grise_pic,
    number_of_seats
}) => {
    const pool = getPool();

    const profileResult = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .query(`
            SELECT id_profile
            FROM DRIVER_PROFILE
            WHERE id_driver = @id_driver;
        `);

    if (profileResult.recordset.length === 0) {
        throw new Error("Driver profile not found");
    }

    const id_profile = profileResult.recordset[0].id_profile;

    const result = await pool
        .request()
        .input("vehicile_year", sql.Int, vehicile_year)
        .input("vehicile_pic", sql.NVarChar(500), vehicile_pic ?? null)
        .input("assurance_pic", sql.NVarChar(500), assurance_pic ?? null)
        .input("carte_grise_pic", sql.NVarChar(500), carte_grise_pic ?? null)
        .input("number_of_seats", sql.Int, number_of_seats)
        .input("id_profile", sql.Int, id_profile)
        .query(`
            DECLARE @newId INT;

            INSERT INTO VEHICLE (
                vehicile_year,
                vehicile_pic,
                assurance_pic,
                carte_grise_pic,
                verification_status,
                id_profile,
                number_of_seats
            )
            VALUES (
                @vehicile_year,
                @vehicile_pic,
                @assurance_pic,
                @carte_grise_pic,
                'pending',
                @id_profile,
                @number_of_seats
            );

            SET @newId = SCOPE_IDENTITY();

            SELECT *
            FROM VEHICLE
            WHERE id_vehicile = @newId;
        `);

    return result.recordset[0];
};

const getMyVehicles = async ({ id_driver }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .query(`
            SELECT
                v.id_vehicile,
                v.vehicile_year,
                v.vehicile_pic,
                v.assurance_pic,
                v.carte_grise_pic,
                v.rejection_reason,
                v.verification_date,
                v.verification_status,
                v.id_profile,
                v.id_admin_approve,
                v.number_of_seats
            FROM VEHICLE v
            INNER JOIN DRIVER_PROFILE dp
                ON dp.id_profile = v.id_profile
            WHERE dp.id_driver = @id_driver
            ORDER BY v.id_vehicile DESC;
        `);

    return result.recordset;
};


const getMyVehicleById = async ({
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
                v.id_vehicile,
                v.vehicile_year,
                v.vehicile_pic,
                v.assurance_pic,
                v.carte_grise_pic,
                v.rejection_reason,
                v.verification_date,
                v.verification_status,
                v.id_profile,
                v.id_admin_approve,
                v.number_of_seats
            FROM VEHICLE v
            INNER JOIN DRIVER_PROFILE dp
                ON dp.id_profile = v.id_profile
            WHERE v.id_vehicile = @id_vehicile
              AND dp.id_driver = @id_driver;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Vehicle not found or you are not the owner"
        );
    }

    return result.recordset[0];
};


const updateVehicle = async ({
    id_driver,
    id_vehicile,
    vehicile_year,
    vehicile_pic,
    assurance_pic,
    carte_grise_pic,
    number_of_seats
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .input("id_vehicile", sql.Int, id_vehicile)
        .input("vehicile_year", sql.Int, vehicile_year)
        .input(
            "vehicile_pic",
            sql.NVarChar(500),
            vehicile_pic ?? null
        )
        .input(
            "assurance_pic",
            sql.NVarChar(500),
            assurance_pic ?? null
        )
        .input(
            "carte_grise_pic",
            sql.NVarChar(500),
            carte_grise_pic ?? null
        )
        .input("number_of_seats", sql.Int, number_of_seats)
        .query(`
            UPDATE v
            SET
                v.vehicile_year = @vehicile_year,
                v.vehicile_pic = @vehicile_pic,
                v.assurance_pic = @assurance_pic,
                v.carte_grise_pic = @carte_grise_pic,
                v.number_of_seats = @number_of_seats,
                v.verification_status = 'pending',
                v.rejection_reason = NULL,
                v.verification_date = NULL,
                v.id_admin_approve = NULL
            FROM VEHICLE v
            INNER JOIN DRIVER_PROFILE dp
                ON dp.id_profile = v.id_profile
            WHERE v.id_vehicile = @id_vehicile
              AND dp.id_driver = @id_driver
              AND v.verification_status IN ('pending', 'rejected');

            SELECT
                id_vehicile,
                vehicile_year,
                vehicile_pic,
                assurance_pic,
                carte_grise_pic,
                rejection_reason,
                verification_date,
                verification_status,
                id_profile,
                id_admin_approve,
                number_of_seats
            FROM VEHICLE
            WHERE id_vehicile = @id_vehicile;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Vehicle not found, you are not the owner, or the vehicle is already approved"
        );
    }

    return result.recordset[0];
};


const deleteVehicle = async ({
    id_driver,
    id_vehicile
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .input("id_vehicile", sql.Int, id_vehicile)
        .query(`
            DECLARE @vehicleStatus VARCHAR(20);
            DECLARE @approvedVehicleCount INT;

            SELECT
                @vehicleStatus = v.verification_status
            FROM VEHICLE v
            INNER JOIN DRIVER_PROFILE dp
                ON dp.id_profile = v.id_profile
            WHERE v.id_vehicile = @id_vehicile
              AND dp.id_driver = @id_driver;

            IF @vehicleStatus IS NULL
            BEGIN
                THROW 50001,
                    'Vehicle not found or you are not the owner',
                    1;
            END;

            IF @vehicleStatus = 'approved'
            BEGIN
                SELECT
                    @approvedVehicleCount = COUNT(*)
                FROM VEHICLE v
                INNER JOIN DRIVER_PROFILE dp
                    ON dp.id_profile = v.id_profile
                WHERE dp.id_driver = @id_driver
                  AND v.verification_status = 'approved';

                IF @approvedVehicleCount <= 1
                BEGIN
                    THROW 50002,
                        'Cannot delete your only approved vehicle',
                        1;
                END;
            END;

            DELETE v
            FROM VEHICLE v
            INNER JOIN DRIVER_PROFILE dp
                ON dp.id_profile = v.id_profile
            WHERE v.id_vehicile = @id_vehicile
              AND dp.id_driver = @id_driver;

            SELECT
                @id_vehicile AS id_vehicile,
                CAST(1 AS BIT) AS deleted;
        `);

    return result.recordset[0];
};

module.exports = {
    createVehicle,
    getMyVehicles,
    getMyVehicleById,
    updateVehicle,
    deleteVehicle,
    getPendingVehicles,
    getVehicleById,
    approveVehicle,
    rejectVehicle
};