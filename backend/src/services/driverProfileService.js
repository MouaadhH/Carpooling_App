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
                is_verified ,
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
                is_verified  = 'pending',
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



const getPendingDrivers = async () => {
    const pool = getPool();

    const result = await pool
        .request()
        .query(`
            SELECT
                dp.id_profile,
                dp.id_driver,
                u.name_u,
                u.phone_u,
                u.email_u,
                u.kyc_verification_status,
                dp.lisence_num,
                dp.lisence_pic,
                dp.is_verified,
                dp.dahabia_verified,
                dp.id_admin_verify
            FROM DRIVER_PROFILE dp
            INNER JOIN [USER] u
                ON u.id_user = dp.id_driver
            WHERE dp.is_verified = 0
            ORDER BY dp.id_profile;
        `);

    return result.recordset;
};


const getDriverForVerification = async ({ id_driver }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("id_driver", sql.Int, id_driver)
        .query(`
            SELECT
                dp.id_profile,
                dp.id_driver,
                u.name_u,
                u.phone_u,
                u.email_u,
                u.kyc_verification_status,
                u.kyc_verification_id,
                dp.lisence_num,
                dp.lisence_pic,
                dp.is_verified,
                dp.dahabia_verified,
                dp.id_admin_verify
            FROM DRIVER_PROFILE dp
            INNER JOIN [USER] u
                ON u.id_user = dp.id_driver
            WHERE dp.id_driver = @id_driver;
        `);

    if (result.recordset.length === 0) {
        throw new Error("Driver profile not found");
    }

    return result.recordset[0];
};


const verifyDriver = async ({
    id_driver,
    id_admin
}) => {
    const pool = getPool();

    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const driverResult = await transaction
            .request()
            .input("id_driver", sql.Int, id_driver)
            .query(`
                SELECT
                    dp.id_profile,
                    dp.is_verified,
                    u.kyc_verification_status
                FROM DRIVER_PROFILE dp
                INNER JOIN [USER] u
                    ON u.id_user = dp.id_driver
                WHERE dp.id_driver = @id_driver;
            `);

        if (driverResult.recordset.length === 0) {
            throw new Error("Driver profile not found");
        }

        const driver = driverResult.recordset[0];

        if (driver.kyc_verification_status !== "verified") {
            throw new Error(
                "Driver identity must be KYC verified before driver verification"
            );
        }

        if (driver.is_verified === true || Number(driver.is_verified) === 1) {
            throw new Error("Driver is already verified");
        }

        const updateResult = await transaction
            .request()
            .input("id_driver", sql.Int, id_driver)
            .input("id_admin", sql.Int, id_admin)
            .query(`
                UPDATE DRIVER_PROFILE
                SET
                    is_verified = 1,
                    id_admin_verify = @id_admin
                WHERE id_driver = @id_driver
                  AND is_verified = 0;

                SELECT *
                FROM DRIVER_PROFILE
                WHERE id_driver = @id_driver;
            `);

        if (updateResult.recordset.length === 0) {
            throw new Error("Driver verification failed");
        }

        await transaction.commit();

        return updateResult.recordset[0];

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error("ROLLBACK DRIVER VERIFICATION ERROR:", rollbackError);
        }

        throw error;
    }
};


const rejectDriver = async ({
    id_driver,
    id_admin
}) => {
    const pool = getPool();

    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const driverResult = await transaction
            .request()
            .input("id_driver", sql.Int, id_driver)
            .query(`
                SELECT
                    dp.id_profile,
                    dp.is_verified
                FROM DRIVER_PROFILE dp
                WHERE dp.id_driver = @id_driver;
            `);

        if (driverResult.recordset.length === 0) {
            throw new Error("Driver profile not found");
        }

        const driver = driverResult.recordset[0];

        if (Number(driver.is_verified) === 1) {
            throw new Error(
                "Verified driver cannot be rejected. Update the driver profile first."
            );
        }

        const updateResult = await transaction
            .request()
            .input("id_driver", sql.Int, id_driver)
            .input("id_admin", sql.Int, id_admin)
            .query(`
                UPDATE DRIVER_PROFILE
                SET
                    is_verified = 0,
                    id_admin_verify = @id_admin
                WHERE id_driver = @id_driver;

                SELECT *
                FROM DRIVER_PROFILE
                WHERE id_driver = @id_driver;
            `);

        if (updateResult.recordset.length === 0) {
            throw new Error("Driver rejection failed");
        }

        await transaction.commit();

        return updateResult.recordset[0];

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error("ROLLBACK DRIVER REJECTION ERROR:", rollbackError);
        }

        throw error;
    }
};

module.exports = {
    createDriverProfile,
    getMyDriverProfile,
    updateDriverProfile,
    getPendingDrivers,
    getDriverForVerification,
    verifyDriver,
    rejectDriver
};