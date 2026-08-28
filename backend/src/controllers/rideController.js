const { createRide } = require("../services/rideService");

const createRideController = async (req, res) => {
    try {
        const {
            id_vehicile,
            id_adresse_start,
            id_adresse_arrive,
            departure_time,
            distance,
            empty_seats
        } = req.body;

        // Check required fields
        if (
            !id_vehicile ||
            !id_adresse_start ||
            !id_adresse_arrive ||
            !departure_time ||
            empty_seats === undefined
        ) {
            return res.status(400).json({
                message: "Required fields are missing"
            });
        }

        // Driver comes from JWT
        const id_driver_posted = req.user.id_user;

        const ride = await createRide({
            id_driver_posted,
            id_vehicile,
            id_adresse_start,
            id_adresse_arrive,
            departure_time,
            distance,
            empty_seats
        });

        res.status(201).json({
            message: "Ride created successfully",
            ride
        });

    } catch (error) {
    console.error("CREATE RIDE ERROR:", error);

    res.status(500).json({
        message: "Failed to create ride",
        error: error.message
    });
    }
};

module.exports = {
    createRideController
};