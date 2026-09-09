const {
    createRideRequest,
    createOpenRideRequest,
    getRideRequests,
    getOpenRideRequests,
    acceptOpenRideRequest,
    negotiateRideRequest,
    acceptRideNegotiation,
    rejectRideNegotiation,
    requestToJoinRide,
    approveRideRequest,
    rejectRideRequest,
    cancelRideRequest,
    payRideRequest,
    updatePaymentMethod,
    
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

        const request = await createOpenRideRequest({
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

const updatePaymentMethodController = async (req, res) => {
    try {
        const id_ride_request = req.params.id;
        const id_user = req.user.id_user;
        const { payment_method } = req.body;

        if (!payment_method) {
            return res.status(400).json({
                message: "payment_method is required"
            });
        }

        const updatedRequest = await updatePaymentMethod({
            id_ride_request,
            id_user,
            payment_method
        });

        return res.status(200).json({
            message: "Payment method updated successfully",
            request: updatedRequest
        });

    } catch (error) {
        console.error("Update payment method error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

const payRideRequestController = async (req, res) => {
    try {
        const id_ride_request = Number(req.params.id);
        const id_user = req.user.id_user;

        if (!Number.isInteger(id_ride_request)) {
            return res.status(400).json({
                message: "Invalid ride request ID"
            });
        }

        const result = await payRideRequest({
            id_ride_request,
            id_user
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error("Pay ride request error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

// ============================================================
// DRIVER NEGOTIATES RIDE REQUEST
// ============================================================

const negotiateRideRequestController = async (req, res) => {

    try {

        const id_ride_request = Number(req.params.id);
        const id_driver = req.user.id_user;
        const { negotiated_price } = req.body;

        if (!Number.isInteger(id_ride_request)) {
            return res.status(400).json({
                message: "Invalid ride request ID"
            });
        }

        if (
            negotiated_price === undefined ||
            negotiated_price === null
        ) {
            return res.status(400).json({
                message: "negotiated_price is required"
            });
        }

        const request = await negotiateRideRequest({
            id_ride_request,
            id_driver,
            negotiated_price
        });

        return res.status(200).json({
            message: "Ride price negotiated successfully",
            request
        });

    } catch (error) {

        console.error(
            "NEGOTIATE RIDE REQUEST ERROR:",
            error
        );

        return res.status(400).json({
            message: error.message
        });
    }
};


// ============================================================
// PASSENGER ACCEPTS NEGOTIATION
// ============================================================

const acceptRideNegotiationController = async (req, res) => {

    try {

        const id_ride_request = Number(req.params.id);
        const id_user = req.user.id_user;

        if (!Number.isInteger(id_ride_request)) {
            return res.status(400).json({
                message: "Invalid ride request ID"
            });
        }

        const result = await acceptRideNegotiation({
            id_ride_request,
            id_user
        });

        return res.status(200).json({
            message: "Negotiated price accepted successfully",
            ride: result.ride,
            rideRequest: result.rideRequest
        });

    } catch (error) {

        console.error(
            "ACCEPT NEGOTIATION ERROR:",
            error
        );

        return res.status(400).json({
            message: error.message
        });
    }
};


// ============================================================
// PASSENGER REJECTS NEGOTIATION
// ============================================================

const rejectRideNegotiationController = async (req, res) => {

    try {

        const id_ride_request = Number(req.params.id);
        const id_user = req.user.id_user;

        if (!Number.isInteger(id_ride_request)) {
            return res.status(400).json({
                message: "Invalid ride request ID"
            });
        }

        const request = await rejectRideNegotiation({
            id_ride_request,
            id_user
        });

        return res.status(200).json({
            message: "Negotiated price rejected successfully",
            request
        });

    } catch (error) {

        console.error(
            "REJECT NEGOTIATION ERROR:",
            error
        );

        return res.status(400).json({
            message: error.message
        });
    }
};

module.exports = {
    createRideRequestController,
    getRideRequestsController,
    createOpenRideRequestController,
    getOpenRideRequestsController,
    acceptOpenRideRequestController,
    negotiateRideRequestController,
    acceptRideNegotiationController,
    rejectRideNegotiationController,
    approveRideRequestController,
    rejectRideRequestController,
    cancelRideRequestController,
    updatePaymentMethodController,
    payRideRequestController,
    updatePaymentMethodController
};
