const driverTest = (req, res) => {
    res.json({
        message: "You are authorized as a driver",
        user: req.user
    });
};

module.exports = {
    driverTest
};