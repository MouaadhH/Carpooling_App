const { getPool } = require("../config/db");

const getTables = async () => {
    const pool = getPool();

    const result = await pool.request().query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
    `);

    return result.recordset;
};

module.exports = {
    getTables
};