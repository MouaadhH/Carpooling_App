const {
    createDriverProfile,
    getMyDriverProfile,
    updateDriverProfile,
    getPendingDrivers,
    getDriverForVerification,
    verifyDriver,
    rejectDriver
} = require("../services/driverProfileService");


const createDriverProfileController = async (req, res) => {
    try {
        const {
            lisence_num,
            lisence_pic
        } = req.body;

        if (!lisence_num) {
            return res.status(400).json({
                message: "License number is required"
            });
        }

        const profile = await createDriverProfile({
            id_driver: req.user.id_user,
            lisence_num,
            lisence_pic
        });

        res.status(201).json({
            message: "Driver profile created successfully",
            profile
        });

    } catch (error) {
        console.error("CREATE DRIVER PROFILE ERROR:", error);

        res.status(400).json({
            message: "Failed to create driver profile",
            error: error.message
        });
    }
};


const getMyDriverProfileController = async (req, res) => {
    try {
        const profile = await getMyDriverProfile({
            id_driver: req.user.id_user
        });

        res.status(200).json({
            message: "Driver profile retrieved successfully",
            profile
        });

    } catch (error) {
        res.status(404).json({
            message: "Failed to retrieve driver profile",
            error: error.message
        });
    }
};


const updateDriverProfileController = async (req, res) => {
    try {
        const {
            lisence_num,
            lisence_pic
        } = req.body;

        if (!lisence_num) {
            return res.status(400).json({
                message: "License number is required"
            });
        }

        const profile = await updateDriverProfile({
            id_driver: req.user.id_user,
            lisence_num,
            lisence_pic
        });

        res.status(200).json({
            message: "Driver profile updated successfully and sent for verification",
            profile
        });

    } catch (error) {
        console.error("UPDATE DRIVER PROFILE ERROR:", error);

        res.status(400).json({
            message: "Failed to update driver profile",
            error: error.message
        });
    }
};



const getPendingDriversController = async (req, res) => {
    try {
        const drivers = await getPendingDrivers();

        res.status(200).json({
            message: "Driver profiles retrieved successfully",
            drivers
        });

    } catch (error) {
        console.error("GET PENDING DRIVERS ERROR:", error);

        res.status(500).json({
            message: "Failed to retrieve driver profiles",
            error: error.message
        });
    }
};


const getDriverForVerificationController = async (req, res) => {
    try {
        const driver = await getDriverForVerification({
            id_driver: req.params.id
        });

        res.status(200).json({
            message: "Driver profile retrieved successfully",
            driver
        });

    } catch (error) {
        res.status(404).json({
            message: "Failed to retrieve driver profile",
            error: error.message
        });
    }
};


const verifyDriverController = async (req, res) => {
    try {
        const driver = await verifyDriver({
            id_driver: req.params.id,
            id_admin: req.user.id_user
        });

        res.status(200).json({
            message: "Driver verified successfully",
            driver
        });

    } catch (error) {
        console.error("VERIFY DRIVER ERROR:", error);

        res.status(400).json({
            message: "Failed to verify driver",
            error: error.message
        });
    }
};


const rejectDriverController = async (req, res) => {
    try {
        const driver = await rejectDriver({
            id_driver: req.params.id,
            id_admin: req.user.id_user
        });

        res.status(200).json({
            message: "Driver rejected successfully",
            driver
        });

    } catch (error) {
        console.error("REJECT DRIVER ERROR:", error);

        res.status(400).json({
            message: "Failed to reject driver",
            error: error.message
        });
    }
};

module.exports = {
    createDriverProfileController,
    getMyDriverProfileController,
    updateDriverProfileController,
    getPendingDriversController,
    getDriverForVerificationController,
    verifyDriverController,
    rejectDriverController
};