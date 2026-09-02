const {
    createRideRequest,
    getRideRequests,
    getOpenRideRequests,
    acceptOpenRideRequest,
    requestToJoinRide,
    approveRideRequest,
    rejectRideRequest,
    cancelRideRequest
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

        const request = await requestToJoinRide({
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

        res.status(400).json({
            message: "Failed to create ride request",
            error: error.message
        });
    }
};

const getRideRequestsController = async (req, res) => {
    try {

        const { id } = req.params;

        // Driver identity comes from JWT
        const id_driver_posted = req.user.id_user;

        const requests = await getRideRequests({
            id_ride: id,
            id_driver_posted
        });

        res.status(200).json({
            message: "Ride requests retrieved successfully",
            requests
        });

    } catch (error) {

        console.error("GET RIDE REQUESTS ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve ride requests",
            error: error.message
        });
    }
};

const createOpenRideRequestController = async (req, res) => {
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

        const id_user = req.user.id_user;

        const request = await createRideRequest({
            id_user,
            id_ride: null,
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

        console.error("CREATE OPEN RIDE REQUEST ERROR:", error);

        res.status(500).json({
            message: "Failed to create ride request",
            error: error.message
        });
    }
};

const getOpenRideRequestsController = async (req, res) => {
    try {

        const requests = await getOpenRideRequests();

        res.status(200).json({
            message: "Open ride requests retrieved successfully",
            requests
        });

    } catch (error) {

        console.error("GET OPEN RIDE REQUESTS ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve open ride requests",
            error: error.message
        });
    }
};

const acceptOpenRideRequestController = async (req, res) => {

    try {

        const id_ride_request = req.params.id;

        // Driver identity comes from JWT
        const id_driver = req.user.id_user;

        const result = await acceptOpenRideRequest({
            id_ride_request,
            id_driver
        });

        res.status(200).json({
            message: "Ride request accepted successfully",
            ride: result.ride
        });

    } catch (error) {

        console.error("ACCEPT RIDE REQUEST ERROR:", error);

        res.status(400).json({
            message: "Failed to accept ride request",
            error: error.message
        });
    }
};

const approveRideRequestController = async (req, res) => {
    try {

        const id_ride_request = req.params.id;
        const id_driver = req.user.id_user;

        const result = await approveRideRequest({
            id_ride_request,
            id_driver
        });

        res.status(200).json({
            message: "Ride request approved successfully",
            request: result
        });

    } catch (error) {

        console.error("APPROVE RIDE REQUEST ERROR:", error);

        res.status(400).json({
            message: "Failed to approve ride request",
            error: error.message
        });
    }
};


const rejectRideRequestController = async (req, res) => {
    try {

        const id_ride_request = req.params.id;
        const id_driver = req.user.id_user;

        const request = await rejectRideRequest({
            id_ride_request,
            id_driver
        });

        res.status(200).json({
            message: "Ride request rejected successfully",
            request
        });

    } catch (error) {

        console.error("REJECT RIDE REQUEST ERROR:", error);

        res.status(400).json({
            message: "Failed to reject ride request",
            error: error.message
        });
    }
};

const cancelRideRequestController = async (req, res) => {

    try {

        const id_ride_request = req.params.id;

        // Passenger identity comes from JWT
        const id_user = req.user.id_user;

        const request = await cancelRideRequest({
            id_ride_request,
            id_user
        });

        res.status(200).json({
            message: "Ride request cancelled successfully",
            request
        });

    } catch (error) {

        console.error("CANCEL RIDE REQUEST ERROR:", error);

        res.status(400).json({
            message: "Failed to cancel ride request",
            error: error.message
        });
    }
};

module.exports = {
    createRideRequestController,
    getRideRequestsController,
    createOpenRideRequestController,
    getOpenRideRequestsController,
    acceptOpenRideRequestController,
    approveRideRequestController,
    rejectRideRequestController,
    cancelRideRequestController
};
