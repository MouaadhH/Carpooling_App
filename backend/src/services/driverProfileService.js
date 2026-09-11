const { sql, getPool } = require("../config/db");

const createDriverProfile = async ({
    id_driver,
    lisence_num,
    lisence_pic
}) => {
    const pool = getPool();

    const existingResult = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .query(`
            SELECT id_profile
            FROM DRIVER_PROFILE
            WHERE id_driver = @id_driver;
        `);

    if (existingResult.recordset.length > 0) {
        throw new Error("Driver profile already exists");
    }

    const result = await pool
        .request()
        .input("lisence_num", sql.NVarChar(100), lisence_num)
        .input("lisence_pic", sql.NVarChar(500), lisence_pic ?? null)
        .input("id_driver", sql.Int, id_driver)
        .query(`
            DECLARE @newId INT;

            INSERT INTO DRIVER_PROFILE (
                lisence_num,
                lisence_pic,
                kyc_status,
                dahabia_verified,
                id_driver
            )
            VALUES (
                @lisence_num,
                @lisence_pic,
                'pending',
                0,
                @id_driver
            );

            SET @newId = SCOPE_IDENTITY();

            SELECT *
            FROM DRIVER_PROFILE
            WHERE id_profile = @newId;
        `);

    return result.recordset[0];
};


const getMyDriverProfile = async ({ id_driver }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .query(`
            SELECT *
            FROM DRIVER_PROFILE
            WHERE id_driver = @id_driver;
        `);

    if (result.recordset.length === 0) {
        throw new Error("Driver profile not found");
    }

    return result.recordset[0];
};


const updateDriverProfile = async ({
    id_driver,
    lisence_num,
    lisence_pic
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .input("lisence_num", sql.NVarChar(100), lisence_num)
        .input("lisence_pic", sql.NVarChar(500), lisence_pic ?? null)
        .query(`
            UPDATE DRIVER_PROFILE
            SET
                lisence_num = @lisence_num,
                lisence_pic = @lisence_pic,
                kyc_status = 'pending',
                id_admin_verify = NULL
            WHERE id_driver = @id_driver;

            SELECT *
            FROM DRIVER_PROFILE
            WHERE id_driver = @id_driver;
        `);

    if (result.recordset.length === 0) {
        throw new Error("Driver profile not found");
    }

    return result.recordset[0];
};


module.exports = {
    createDriverProfile,
    getMyDriverProfile,
    updateDriverProfile
};