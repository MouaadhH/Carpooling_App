const {
    createRideRequest
} = require("../services/rideRequestService");

const createRideRequestController = async (req, res) => {
    try {

        const {
            seats_needed,
            desired_time,
            desired_price,
            id_adresse_pickup,
            id_adresse_dropoff
        } = req.body;

        if (
            !seats_needed ||
            !id_adresse_pickup ||
            !id_adresse_dropoff
        ) {
            return res.status(400).json({
                message: "Required fields are missing"
            });
        }

        // Passenger identity comes from JWT
        const id_user = req.user.id_user;

        // Ride comes from URL
        const id_ride = req.params.id;

        const request = await createRideRequest({
            id_user,
            id_ride,
            seats_needed,
            desired_time,
            desired_price,
            id_adresse_pickup,
            id_adresse_dropoff
        });

        res.status(201).json({
            message: "Ride request created successfully",
            request
        });

    } catch (error) {

        console.error("CREATE RIDE REQUEST ERROR:", error);

        res.status(500).json({
            message: "Failed to create ride request",
            error: error.message
        });
    }
};

module.exports = {
    createRideRequestController
};