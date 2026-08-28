const {
    registerUser,
    loginUser
} = require("../services/authService");

const register = async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            password,
            role,
            preferredLang
        } = req.body;

        // Basic validation
        if (
            !name ||
            !phone ||
            !email ||
            !password ||
            !role ||
            !preferredLang
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const user = await registerUser(
            name,
            phone,
            email,
            password,
            role,
            preferredLang
        );

        res.status(201).json({
            message: "User registered successfully",
            user
        });

    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await loginUser(email, password);

        res.status(200).json({
            message: "Login successful",
            user
        });

    } catch (error) {
        console.error(error);

        res.status(401).json({
            message: error.message
        });
    }
};

module.exports = {
    register,
    login
};