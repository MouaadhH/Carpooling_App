const {
    createDriverProfile,
    getMyDriverProfile,
    updateDriverProfile
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


module.exports = {
    createDriverProfileController,
    getMyDriverProfileController,
    updateDriverProfileController
};