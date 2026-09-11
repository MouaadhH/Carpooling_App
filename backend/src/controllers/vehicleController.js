const {
    createVehicle,
    getMyVehicles,
    getMyVehicleById,
    updateVehicle,
    deleteVehicle,
    getPendingVehicles,
    getVehicleById,
    approveVehicle,
    rejectVehicle
} = require("../services/vehicleService");


const getPendingVehiclesController = async (req, res) => {
    try {
        const vehicles = await getPendingVehicles();

        res.status(200).json({
            message: "Pending vehicles retrieved successfully",
            vehicles
        });

    } catch (error) {
        console.error(
            "GET PENDING VEHICLES ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to retrieve pending vehicles",
            error: error.message
        });
    }
};


const getVehicleByIdController = async (req, res) => {
    try {
        const id_vehicile = req.params.id;

        const vehicle = await getVehicleById({
            id_vehicile
        });

        res.status(200).json({
            message: "Vehicle retrieved successfully",
            vehicle
        });

    } catch (error) {
        console.error(
            "GET VEHICLE ERROR:",
            error
        );

        res.status(404).json({
            message: "Failed to retrieve vehicle",
            error: error.message
        });
    }
};


const approveVehicleController = async (req, res) => {
    try {
        const id_vehicile = req.params.id;
        const id_admin = req.user.id_user;

        const vehicle = await approveVehicle({
            id_vehicile,
            id_admin
        });

        res.status(200).json({
            message: "Vehicle approved successfully",
            vehicle
        });

    } catch (error) {
        console.error(
            "APPROVE VEHICLE ERROR:",
            error
        );

        res.status(400).json({
            message: "Failed to approve vehicle",
            error: error.message
        });
    }
};


const rejectVehicleController = async (req, res) => {
    try {
        const id_vehicile = req.params.id;
        const id_admin = req.user.id_user;

        const {
            rejection_reason
        } = req.body;

        if (
            !rejection_reason ||
            !rejection_reason.trim()
        ) {
            return res.status(400).json({
                message: "Rejection reason is required"
            });
        }

        const vehicle = await rejectVehicle({
            id_vehicile,
            id_admin,
            rejection_reason
        });

        res.status(200).json({
            message: "Vehicle rejected successfully",
            vehicle
        });

    } catch (error) {
        console.error(
            "REJECT VEHICLE ERROR:",
            error
        );

        res.status(400).json({
            message: "Failed to reject vehicle",
            error: error.message
        });
    }
};

const createVehicleController = async (req, res) => {
    try {
        const {
            vehicile_year,
            vehicile_pic,
            assurance_pic,
            carte_grise_pic,
            number_of_seats
        } = req.body;

        if (!vehicile_year) {
            return res.status(400).json({
                message: "Vehicle year is required"
            });
        }

        if (!number_of_seats) {
            return res.status(400).json({
                message: "Number of seats is required"
            });
        }

        const vehicle = await createVehicle({
            id_driver: req.user.id_user,
            vehicile_year,
            vehicile_pic,
            assurance_pic,
            carte_grise_pic,
            number_of_seats
        });

        res.status(201).json({
            message: "Vehicle created successfully",
            vehicle
        });

    } catch (error) {
        console.error("CREATE VEHICLE ERROR:", error);

        res.status(400).json({
            message: "Failed to create vehicle",
            error: error.message
        });
    }
};

const getMyVehiclesController = async (req, res) => {
    try {
        const vehicles = await getMyVehicles({
            id_driver: req.user.id_user
        });

        res.status(200).json({
            message: "Your vehicles retrieved successfully",
            vehicles
        });

    } catch (error) {
        console.error("GET MY VEHICLES ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve your vehicles",
            error: error.message
        });
    }
};


const getMyVehicleByIdController = async (req, res) => {
    try {
        const vehicle = await getMyVehicleById({
            id_driver: req.user.id_user,
            id_vehicile: req.params.id
        });

        res.status(200).json({
            message: "Vehicle retrieved successfully",
            vehicle
        });

    } catch (error) {
        res.status(404).json({
            message: "Failed to retrieve vehicle",
            error: error.message
        });
    }
};


const updateVehicleController = async (req, res) => {
    try {
        const {
            vehicile_year,
            vehicile_pic,
            assurance_pic,
            carte_grise_pic,
            number_of_seats
        } = req.body;

        if (!vehicile_year || !number_of_seats) {
            return res.status(400).json({
                message: "Vehicle year and number of seats are required"
            });
        }

        const vehicle = await updateVehicle({
            id_driver: req.user.id_user,
            id_vehicile: req.params.id,
            vehicile_year,
            vehicile_pic,
            assurance_pic,
            carte_grise_pic,
            number_of_seats
        });

        res.status(200).json({
            message: "Vehicle updated successfully and sent for verification",
            vehicle
        });

    } catch (error) {
        console.error("UPDATE VEHICLE ERROR:", error);

        res.status(400).json({
            message: "Failed to update vehicle",
            error: error.message
        });
    }
};


const deleteVehicleController = async (req, res) => {
    try {
        const result = await deleteVehicle({
            id_driver: req.user.id_user,
            id_vehicile: req.params.id
        });

        res.status(200).json({
            message: "Vehicle deleted successfully",
            vehicle: result
        });

    } catch (error) {
        console.error("DELETE VEHICLE ERROR:", error);

        res.status(400).json({
            message: "Failed to delete vehicle",
            error: error.message
        });
    }
};

module.exports = {
    createVehicleController,
    getMyVehiclesController,
    getMyVehicleByIdController,
    updateVehicleController,
    deleteVehicleController,
    getPendingVehiclesController,
    getVehicleByIdController,
    approveVehicleController,
    rejectVehicleController
};