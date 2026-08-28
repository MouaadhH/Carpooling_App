const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { getPool } = require("../config/db");

const registerUser = async (
    name,
    phone,
    email,
    password,
    role,
    preferredLang
) => {
    const pool = getPool();

    // Check if phone or email already exists
    const existingUser = await pool
        .request()
        .input("phone", phone)
        .input("email", email)
        .query(`
            SELECT id_user
            FROM [USER]
            WHERE phone_u = @phone
               OR email_u = @email
        `);

    if (existingUser.recordset.length > 0) {
        throw new Error("Phone or email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool
        .request()
        .input("name", name)
        .input("phone", phone)
        .input("email", email)
        .input("password", hashedPassword)
        .input("role", role)
        .input("preferredLang", preferredLang)
        .query(`
    INSERT INTO [USER]
    (
        name_u,
        phone_u,
        email_u,
        password_u,
        role,
        prefered_lang
    )
    OUTPUT INSERTED.id_user
    VALUES
    (
        @name,
        @phone,
        @email,
        @password,
        @role,
        @preferredLang
    )
`);

    return result.recordset[0];
};

const loginUser = async (email, password) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input("email", email)
        .query(`
            SELECT 
                id_user,
                name_u,
                phone_u,
                email_u,
                password_u,
                role,
                prefered_lang
            FROM [USER]
            WHERE email_u = @email
        `);

    if (result.recordset.length === 0) {
        throw new Error("Invalid email or password");
    }

    const user = result.recordset[0];

    const passwordMatch = await bcrypt.compare(
        password,
        user.password_u
    );

    if (!passwordMatch) {
        throw new Error("Invalid email or password");
    }

    const token = jwt.sign(
        {
            id_user: user.id_user,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

    return {
        id_user: user.id_user,
        name: user.name_u,
        email: user.email_u,
        phone: user.phone_u,
        role: user.role,
        prefered_lang: user.prefered_lang,
        token
    };
};

module.exports = {
    registerUser,
    loginUser
};