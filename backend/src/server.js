const express = require("express");
require("dotenv").config();
const { connectDB } = require("./config/db");
const databaseRoutes = require("./routes/databaseRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const testRoutes = require("./routes/testRoutes");
const rideRoutes = require("./routes/rideRoutes");
const rideRequestRoutes = require("./routes/riderequestroutes");
const openRideRequestRoutes = require("./routes/openRideRequestRoutes");

const app = express();

const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Backend is running!"
    });
});

app.use("/api/database", databaseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/test", testRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/rides", rideRequestRoutes);
app.use("/api/ride-requests", openRideRequestRoutes);

connectDB();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});