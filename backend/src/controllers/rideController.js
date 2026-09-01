const {
    createRide,
    getAvailableRides,
    getRideById,
    updateRide,
    cancelRide,
    updateRideAvailability,
    startRide
} = require("../services/rideService");

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

const getAvailableRidesController = async (req, res) => {
    try {

        const rides = await getAvailableRides();

        res.status(200).json({
            message: "Available rides retrieved successfully",
            rides
        });

    } catch (error) {

        console.error("GET RIDES ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve rides",
            error: error.message
        });
    }
};

const getRideByIdController = async (req, res) => {
    try {

        const { id } = req.params;

        const ride = await getRideById(id);

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found"
            });
        }

        res.status(200).json({
            message: "Ride retrieved successfully",
            ride
        });

    } catch (error) {

        console.error("GET RIDE ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve ride",
            error: error.message
        });
    }
};

const updateRideController = async (req, res) => {
    try {

        const { id } = req.params;

        const {
            id_vehicile,
            id_adresse_start,
            id_adresse_arrive,
            departure_time,
            distance,
            empty_seats
        } = req.body;

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

        // Get the driver from the JWT
        const id_driver_posted = req.user.id_user;

        const ride = await updateRide({
            id_ride: id,
            id_driver_posted,
            id_vehicile,
            id_adresse_start,
            id_adresse_arrive,
            departure_time,
            distance,
            empty_seats
        });

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found or you are not the owner"
            });
        }

        res.status(200).json({
            message: "Ride updated successfully",
            ride
        });

    } catch (error) {

        console.error("UPDATE RIDE ERROR:", error);

        res.status(500).json({
            message: "Failed to update ride",
            error: error.message
        });
    }
};

const cancelRideController = async (req, res) => {
    try {

        const { id } = req.params;

        // Driver identity comes from JWT
        const id_driver_posted = req.user.id_user;

        const ride = await cancelRide({
            id_ride: id,
            id_driver_posted
        });

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found, not owned by you, or already cancelled"
            });
        }

        res.status(200).json({
            message: "Ride cancelled successfully",
            ride
        });

    } catch (error) {

        console.error("CANCEL RIDE ERROR:", error);

        res.status(500).json({
            message: "Failed to cancel ride",
            error: error.message
        });
    }
};

const updateRideAvailabilityController = async (req, res) => {

    try {

        const id_ride = req.params.id;
        const id_driver = req.user.id_user;

        const { is_available } = req.body;

        if (typeof is_available !== "boolean") {
            return res.status(400).json({
                message: "is_available must be true or false"
            });
        }

        const ride = await updateRideAvailability({
            id_ride,
            id_driver,
            is_available
        });

        res.status(200).json({
            message: "Ride availability updated successfully",
            ride
        });

    } catch (error) {

        console.error(
            "UPDATE RIDE AVAILABILITY ERROR:",
            error
        );

        res.status(400).json({
            message: "Failed to update ride availability",
            error: error.message
        });
    }
};

const startRideController = async (req, res) => {

    try {

        const id_ride = req.params.id;
        const id_driver = req.user.id_user;

        const ride = await startRide({
            id_ride,
            id_driver
        });

        res.status(200).json({
            message: "Ride started successfully",
            ride
        });

    } catch (error) {

        console.error(
            "START RIDE ERROR:",
            error
        );

        res.status(400).json({
            message: "Failed to start ride",
            error: error.message
        });
    }
};


module.exports = {
    createRideController,
    getAvailableRidesController,
    getRideByIdController,
    updateRideController,
    cancelRideController,
    updateRideAvailabilityController,
    startRideController
};