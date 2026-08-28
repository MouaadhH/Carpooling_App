const sql = require("mssql/msnodesqlv8");

const config = {
    server: "SILVER\\SQLEXPRESS",
    database: "Wassalni",
    driver: "ODBC Driver 18 for SQL Server",
    options: {
        trustedConnection: true,
        trustServerCertificate: true
    }
};

let pool;

const connectDB = async () => {
    try {
        pool = await sql.connect(config);
        console.log("SQL Server connected successfully");
    } catch (error) {
        console.error("Database connection failed:", error);
    }
};

const getPool = () => {
    return pool;
};

module.exports = {
    sql,
    connectDB,
    getPool
};