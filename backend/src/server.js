const express = require("express");
require("dotenv").config();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { authorizeCall } = require("./services/conversationService");
const { connectDB } = require("./config/db");

const databaseRoutes = require("./routes/databaseRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const testRoutes = require("./routes/testRoutes");
const rideRoutes = require("./routes/rideRoutes");
const rideRequestRoutes = require("./routes/riderequestroutes");
const openRideRequestRoutes = require("./routes/openRideRequestRoutes");
const walletRoutes = require("./routes/walletRoutes");
const rechargeRoutes = require("./routes/rechargeRoutes");
const evaluationRoutes = require("./routes/evaluationRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const driverProfileRoutes = require("./routes/driverProfileRoutes");

const chargilyWebhookRoutes = require("./routes/chargilyWebhookRoutes");

const app = express();

const PORT = 3000;

// CHARGILY WEBHOOK
// we put it here Express has already converted the request body into a JavaScript object.
app.use(
    "/api/webhooks/chargily",
    chargilyWebhookRoutes
);

// GLOBAL MIDDLEWARE
app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);

app.get("/", (req, res) => {
    res.json({
        message: "Backend is running!"
    });
});

app.use("/api/database", databaseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/test", testRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/rides", rideRequestRoutes);
app.use("/api/ride-requests", openRideRequestRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/wallet/recharge", rechargeRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/conversations", messageRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverProfileRoutes);


// =========================================================
// HTTP SERVER
// =========================================================

const server = http.createServer(app);


// =========================================================
// SOCKET.IO SERVER
// =========================================================

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});


// =========================================================
// SOCKET.IO AUTHENTICATION
// =========================================================

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Access token is required"));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.user = decoded;

        next();

    } catch (error) {
        next(new Error("Invalid or expired token"));
    }
});


// =========================================================
// SOCKET.IO CONNECTION
// =========================================================

io.on("connection", (socket) => {

    // ---------------------------------------------------------
    // Helper used by all call events
    // ---------------------------------------------------------

    const authorizeSocketCall = async ({
        id_conversation,
        caller_id,
        receiver_id
    }) => {

        return await authorizeCall({
            id_conversation: Number(id_conversation),
            caller_id: Number(caller_id),
            receiver_id: Number(receiver_id)
        });
    };


    // ---------------------------------------------------------
    // Send authorization errors only to current user
    // ---------------------------------------------------------

    const emitCallError = (message) => {
        socket.emit("call_error", {
            message
        });
    };


    console.log(
        `User ${socket.user.id_user} connected with socket ${socket.id}`
    );


    // Join user's private Socket.IO room

    socket.join(`user_${socket.user.id_user}`);

    console.log(
        `User ${socket.user.id_user} joined room user_${socket.user.id_user}`
    );


    // =========================================================
    // CALL USER
    // =========================================================

    socket.on(
        "call_user",
        async ({ receiver_id, id_conversation }) => {

            try {

                const callerId = Number(socket.user.id_user);
                const receiverId = Number(receiver_id);
                const conversationId = Number(id_conversation);

                await authorizeSocketCall({
                    id_conversation: conversationId,
                    caller_id: callerId,
                    receiver_id: receiverId
                });

                console.log(
                    "✅ Call authorization successful"
                );

                console.log(
                    `User ${callerId} is calling user ${receiverId}`
                );

                io.to(`user_${receiverId}`).emit(
                    "incoming_call",
                    {
                        caller_id: callerId,
                        id_conversation: conversationId
                    }
                );

            } catch (error) {

                console.error(
                    "❌ call_user authorization failed:",
                    error.message
                );

                emitCallError(error.message);
            }
        }
    );


    // =========================================================
    // WEBRTC OFFER
    // =========================================================

    socket.on(
        "webrtc_offer",
        async ({ receiver_id, offer, id_conversation }) => {

            try {

                const callerId = Number(socket.user.id_user);
                const receiverId = Number(receiver_id);
                const conversationId = Number(id_conversation);

                await authorizeSocketCall({
                    id_conversation: conversationId,
                    caller_id: callerId,
                    receiver_id: receiverId
                });

                console.log(
                    "✅ WebRTC offer authorization successful"
                );

                console.log(
                    `WebRTC offer from user ${callerId} to user ${receiverId}`
                );

                io.to(`user_${receiverId}`).emit(
                    "webrtc_offer",
                    {
                        caller_id: callerId,
                        offer
                    }
                );

            } catch (error) {

                console.error(
                    "❌ webrtc_offer authorization failed:",
                    error.message
                );

                emitCallError(error.message);
            }
        }
    );


    // =========================================================
    // WEBRTC ANSWER
    // =========================================================

    socket.on(
        "webrtc_answer",
        async ({ caller_id, answer, id_conversation }) => {

            try {

                const receiverId = Number(socket.user.id_user);
                const callerId = Number(caller_id);
                const conversationId = Number(id_conversation);

                await authorizeSocketCall({
                    id_conversation: conversationId,
                    caller_id: receiverId,
                    receiver_id: callerId
                });

                console.log(
                    "✅ WebRTC answer authorization successful"
                );

                console.log(
                    `WebRTC answer from user ${receiverId} to user ${callerId}`
                );

                io.to(`user_${callerId}`).emit(
                    "webrtc_answer",
                    {
                        receiver_id: receiverId,
                        answer
                    }
                );

            } catch (error) {

                console.error(
                    "❌ webrtc_answer authorization failed:",
                    error.message
                );

                emitCallError(error.message);
            }
        }
    );


    // =========================================================
    // ICE CANDIDATE
    // =========================================================

    socket.on(
        "ice_candidate",
        async ({
            receiver_id,
            candidate,
            id_conversation
        }) => {

            try {

                const callerId = Number(socket.user.id_user);
                const receiverId = Number(receiver_id);
                const conversationId = Number(id_conversation);

                await authorizeSocketCall({
                    id_conversation: conversationId,
                    caller_id: callerId,
                    receiver_id: receiverId
                });

                console.log(
                    "✅ ICE candidate authorization successful"
                );

                console.log(
                    `ICE candidate from user ${callerId} to user ${receiverId}`
                );

                io.to(`user_${receiverId}`).emit(
                    "ice_candidate",
                    {
                        sender_id: callerId,
                        candidate
                    }
                );

            } catch (error) {

                console.error(
                    "❌ ice_candidate authorization failed:",
                    error.message
                );

                emitCallError(error.message);
            }
        }
    );


    // =========================================================
    // END CALL
    // =========================================================

    socket.on(
        "end_call",
        async (data) => {

            console.log(
                "📵 end_call event received!"
            );

            console.log(
                "Data:",
                data
            );

            const {
                receiver_id,
                id_conversation
            } = data;

            try {

                const callerId = Number(socket.user.id_user);
                const receiverId = Number(receiver_id);
                const conversationId = Number(id_conversation);

                await authorizeSocketCall({
                    id_conversation: conversationId,
                    caller_id: callerId,
                    receiver_id: receiverId
                });

                console.log(
                    "✅ End call authorization successful"
                );

                console.log(
                    `User ${callerId} ended the call with user ${receiverId}`
                );

                io.to(`user_${receiverId}`).emit(
                    "call_ended",
                    {
                        caller_id: callerId,
                        id_conversation: conversationId
                    }
                );

            } catch (error) {

                console.error(
                    "❌ end_call authorization failed:",
                    error.message
                );

                emitCallError(error.message);
            }
        }
    );


    // =========================================================
    // REJECT CALL
    // =========================================================

    socket.on(
        "reject_call",
        async ({ caller_id, id_conversation }) => {

            try {

                const receiverId = Number(socket.user.id_user);
                const callerId = Number(caller_id);
                const conversationId = Number(id_conversation);

                await authorizeSocketCall({
                    id_conversation: conversationId,
                    caller_id: receiverId,
                    receiver_id: callerId
                });

                console.log(
                    "✅ Reject call authorization successful"
                );

                console.log(
                    `User ${receiverId} rejected the call from user ${callerId}`
                );

                io.to(`user_${callerId}`).emit(
                    "call_rejected",
                    {
                        receiver_id: receiverId,
                        id_conversation: conversationId
                    }
                );

            } catch (error) {

                console.error(
                    "❌ reject_call authorization failed:",
                    error.message
                );

                emitCallError(error.message);
            }
        }
    );


    // =========================================================
    // ACCEPT CALL
    // =========================================================

    socket.on(
        "accept_call",
        async ({ caller_id, id_conversation }) => {

            try {

                const receiverId = Number(socket.user.id_user);
                const callerId = Number(caller_id);
                const conversationId = Number(id_conversation);

                await authorizeSocketCall({
                    id_conversation: conversationId,
                    caller_id: receiverId,
                    receiver_id: callerId
                });

                console.log(
                    "✅ Accept call authorization successful"
                );

                console.log(
                    `User ${receiverId} accepted the call from user ${callerId}`
                );

                io.to(`user_${callerId}`).emit(
                    "call_accepted",
                    {
                        receiver_id: receiverId,
                        id_conversation: conversationId
                    }
                );

            } catch (error) {

                console.error(
                    "❌ accept_call authorization failed:",
                    error.message
                );

                emitCallError(error.message);
            }
        }
    );


    // =========================================================
    // DISCONNECT
    // =========================================================

    socket.on("disconnect", () => {

        console.log(
            `User ${socket.user.id_user} disconnected`
        );

    });

});


// =========================================================
// START SERVER
// =========================================================

const startServer = async () => {

    try {

        await connectDB();

        server.listen(PORT, () => {

            console.log(
                `Server running on http://localhost:${PORT}`
            );

            console.log(
                "Socket.IO server is ready"
            );

        });

    } catch (error) {

        console.error(
            "Server startup failed because the database connection failed."
        );

        process.exit(1);
    }
};

startServer();