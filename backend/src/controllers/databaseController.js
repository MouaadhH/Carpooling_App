const { getTables } = require("../services/databaseService");

const getDatabaseTables = async (req, res) => {
    try {
        const tables = await getTables();

        res.json(tables);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to retrieve database tables"
        });
    }
};

module.exports = {
    getDatabaseTables
};