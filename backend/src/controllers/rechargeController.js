const {
    createRechargeRequest,
    getRechargeRequest,
    getMyRechargeRequests
} = require("../services/rechargeService");


/*
    Create a recharge request.

    POST /api/wallet/recharge
*/
const createRechargeController = async (req, res) => {
    try {
        const {
            amount,
            transaction_reference
        } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than zero"
            });
        }

        const id_user = req.user.id_user;

        const rechargeRequest = await createRechargeRequest({
            id_user,
            amount,
            transaction_reference
        });

        res.status(201).json({
            message: "Recharge request created successfully",
            rechargeRequest
        });

    } catch (error) {
        console.error("CREATE RECHARGE ERROR:", error);

        res.status(400).json({
            message: "Failed to create recharge request",
            error: error.message
        });
    }
};


/*
    Get one recharge request belonging
    to the authenticated user.

    GET /api/wallet/recharge/:id
*/
const getRechargeRequestController = async (req, res) => {
    try {
        const id_request_recharge = req.params.id;
        const id_user = req.user.id_user;

        const rechargeRequest = await getRechargeRequest({
            id_request_recharge,
            id_user
        });

        res.status(200).json({
            message: "Recharge request retrieved successfully",
            rechargeRequest
        });

    } catch (error) {
        console.error("GET RECHARGE ERROR:", error);

        res.status(404).json({
            message: "Failed to retrieve recharge request",
            error: error.message
        });
    }
};


/*
    Get all recharge requests belonging
    to the authenticated user.

    GET /api/wallet/recharge
*/
const getMyRechargeRequestsController = async (req, res) => {
    try {
        const id_user = req.user.id_user;

        const rechargeRequests =
            await getMyRechargeRequests(id_user);

        res.status(200).json({
            message: "Recharge requests retrieved successfully",
            rechargeRequests
        });

    } catch (error) {
        console.error(
            "GET MY RECHARGE REQUESTS ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to retrieve recharge requests",
            error: error.message
        });
    }
};


module.exports = {
    createRechargeController,
    getRechargeRequestController,
    getMyRechargeRequestsController
};