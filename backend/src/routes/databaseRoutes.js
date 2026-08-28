const express = require("express");
const { getDatabaseTables } = require("../controllers/databaseController");

const router = express.Router();

router.get("/tables", getDatabaseTables);

module.exports = router;