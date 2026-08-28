const { getPool } = require("../config/db");

const getMe = async (req, res) => {
    try {
        const pool = getPool();

        const result = await pool
            .request()
            .input("id_user", req.user.id_user)
            .query(`
                SELECT
                    id_user,
                    name_u,
                    phone_u,
                    email_u,
                    role,
                    prefered_lang,
                    is_phone_verified,
                    creation_date_u
                FROM [USER]
                WHERE id_user = @id_user
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(result.recordset[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to retrieve user"
        });
    }
};

module.exports = {
    getMe
};