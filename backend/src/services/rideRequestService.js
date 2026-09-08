const { getPool, sql } = require("../config/db");
const { checkMinimumBalance } = require("./walletService");
const { validateRidePrice } = require("./pricingService");


// ============================================================
// GET DISTANCE BETWEEN TWO ADDRESSES
// ============================================================

const getDistanceBetweenAddresses = async ({
    id_adresse_start,
    id_adresse_arrive,
    transaction = null
}) => {

    const dbRequest = transaction
        ? new sql.Request(transaction)
        : getPool().request();

    const result = await dbRequest
        .input("id_adresse_start", sql.Int, id_adresse_start)
        .input("id_adresse_arrive", sql.Int, id_adresse_arrive)
        .query(`
            SELECT
                a1.latitude AS start_latitude,
                a1.longitude AS start_longitude,
                a2.latitude AS arrive_latitude,
                a2.longitude AS arrive_longitude
            FROM ADRESSE a1
            CROSS JOIN ADRESSE a2
            WHERE a1.id_adresse = @id_adresse_start
              AND a2.id_adresse = @id_adresse_arrive
        `);

    if (result.recordset.length === 0) {
        throw new Error("Start or destination address not found");
    }

    const {
        start_latitude,
        start_longitude,
        arrive_latitude,
        arrive_longitude
    } = result.recordset[0];

    if (
        start_latitude == null ||
        start_longitude == null ||
        arrive_latitude == null ||
        arrive_longitude == null
    ) {
        throw new Error("Addresses must have valid coordinates");
    }

    const toRadians = (degrees) => degrees * Math.PI / 180;

    const R = 6371;

    const dLat = toRadians(arrive_latitude - start_latitude);
    const dLon = toRadians(arrive_longitude - start_longitude);

    const lat1 = toRadians(start_latitude);
    const lat2 = toRadians(arrive_latitude);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return R * c;
};


// ============================================================
// CREATE REQUEST TO JOIN AN EXISTING RIDE
// ============================================================

const createRideRequest = async ({
    id_user,
    id_ride,
    seats_needed,
    desired_time,
    desired_price,
    id_adresse_pickup,
    id_adresse_dropoff
}) => {

    if (!Number.isInteger(Number(seats_needed)) || Number(seats_needed) <= 0) {
        throw new Error("Seats needed must be a positive integer");
    }

    if (!id_ride) {
        throw new Error(
            "id_ride is required when requesting to join an existing ride"
        );
    }

    if (!id_adresse_pickup || !id_adresse_dropoff) {
        throw new Error("Pickup and dropoff addresses are required");
    }

    const pool = getPool();

    const transaction = new sql.Transaction(pool);

    try {

        await transaction.begin();

        // ----------------------------------------------------
        // Lock the ride
        // ----------------------------------------------------

        const rideResult = await new sql.Request(transaction)
            .input("id_ride", sql.Int, id_ride)
            .query(`
                SELECT
                    id_ride,
                    id_driver_posted,
                    prix_total,
                    empty_seats,
                    departure_time,
                    status_ride,
                    is_available
                FROM RIDE WITH (UPDLOCK, HOLDLOCK)
                WHERE id_ride = @id_ride
            `);

        if (rideResult.recordset.length === 0) {
            throw new Error("Ride not found");
        }

        const ride = rideResult.recordset[0];

        // ----------------------------------------------------
        // Passenger cannot request their own ride
        // ----------------------------------------------------

        if (Number(ride.id_driver_posted) === Number(id_user)) {
            throw new Error("Driver cannot request their own ride");
        }

        // ----------------------------------------------------
        // Ride must be active
        // ----------------------------------------------------

        if (ride.status_ride !== "active") {
            throw new Error("Ride is not active");
        }

        // ----------------------------------------------------
        // Ride must have enough seats
        // ----------------------------------------------------

        if (Number(ride.empty_seats) < Number(seats_needed)) {
            throw new Error("Not enough available seats");
        }

        if (Number(ride.is_available) !== 1) {
            throw new Error("Ride is not available");
        }

        // ----------------------------------------------------
        // Price is controlled by the existing ride
        // ----------------------------------------------------

        const lockedPrice = Number(ride.prix_total);

        if (!Number.isFinite(lockedPrice) || lockedPrice <= 0) {
            throw new Error("Ride has an invalid price");
        }

        // ----------------------------------------------------
        // Desired time
        // ----------------------------------------------------

        const finalDesiredTime = desired_time || ride.departure_time;

        // ----------------------------------------------------
        // Create request
        // ----------------------------------------------------

        const insertResult = await new sql.Request(transaction)
            .input("id_user", sql.Int, id_user)
            .input("id_ride", sql.Int, id_ride)
            .input("seats_needed", sql.Int, Number(seats_needed))
            .input("desired_time", sql.DateTime2, finalDesiredTime)
            .input("desired_price", sql.Decimal(10, 2), lockedPrice)
            .input("id_adresse_pickup", sql.Int, id_adresse_pickup)
            .input("id_adresse_dropoff", sql.Int, id_adresse_dropoff)
            .query(`
                INSERT INTO RIDE_REQUEST (
                    id_user,
                    id_ride,
                    seats_needed,
                    desired_time,
                    desired_price,
                    id_adresse_pickup,
                    id_adresse_dropoff,
                    status_request
                )
                OUTPUT INSERTED.*
                VALUES (
                    @id_user,
                    @id_ride,
                    @seats_needed,
                    @desired_time,
                    @desired_price,
                    @id_adresse_pickup,
                    @id_adresse_dropoff,
                    'pending'
                )
            `);

        await transaction.commit();

        return insertResult.recordset[0];

    } catch (error) {

        if (transaction._aborted !== true) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        throw error;
    }
};


// ============================================================
// CREATE OPEN RIDE REQUEST
// ============================================================

const createOpenRideRequest = async ({
    id_user,
    seats_needed,
    desired_time,
    desired_price,
    id_adresse_pickup,
    id_adresse_dropoff
}) => {

    // --------------------------------------------------------
    // Basic validation
    // --------------------------------------------------------

    if (!Number.isInteger(Number(seats_needed)) || Number(seats_needed) <= 0) {
        throw new Error("Seats needed must be a positive integer");
    }

    if (
        desired_price === undefined ||
        desired_price === null ||
        !Number.isFinite(Number(desired_price)) ||
        Number(desired_price) <= 0
    ) {
        throw new Error("Desired price must be a valid positive number");
    }

    if (!id_adresse_pickup || !id_adresse_dropoff) {
        throw new Error("Pickup and dropoff addresses are required");
    }

    if (Number(id_adresse_pickup) === Number(id_adresse_dropoff)) {
        throw new Error("Pickup and dropoff addresses must be different");
    }

    // --------------------------------------------------------
    // Calculate distance from passenger's addresses
    // --------------------------------------------------------

    const distance = await getDistanceBetweenAddresses({
        id_adresse_start: id_adresse_pickup,
        id_adresse_arrive: id_adresse_dropoff
    });

    if (!Number.isFinite(distance) || distance <= 0) {
        throw new Error("Unable to calculate a valid ride distance");
    }

    // --------------------------------------------------------
    // Validate passenger's desired price against tariff
    // --------------------------------------------------------

    const priceValidation = await validateRidePrice({
        distance,
        price: desired_price
    });

    const pool = getPool();

    // --------------------------------------------------------
    // Insert open request
    // --------------------------------------------------------

    const result = await pool
        .request()
        .input("id_user", sql.Int, id_user)
        .input("seats_needed", sql.Int, Number(seats_needed))
        .input("desired_time", sql.DateTime2, desired_time || null)
        .input("desired_price", sql.Decimal(10, 2), priceValidation.price)
        .input("id_adresse_pickup", sql.Int, id_adresse_pickup)
        .input("id_adresse_dropoff", sql.Int, id_adresse_dropoff)
        .query(`
            INSERT INTO RIDE_REQUEST (
                id_user,
                id_ride,
                seats_needed,
                desired_time,
                desired_price,
                id_adresse_pickup,
                id_adresse_dropoff,
                status_request
            )
            OUTPUT INSERTED.*
            VALUES (
                @id_user,
                NULL,
                @seats_needed,
                @desired_time,
                @desired_price,
                @id_adresse_pickup,
                @id_adresse_dropoff,
                'pending'
            )
        `);

    return {
        ...result.recordset[0],
        distance,
        minimumPrice: priceValidation.minimumPrice,
        maximumPrice: priceValidation.maximumPrice
    };
};


// ============================================================
// GET RIDE REQUESTS FOR A DRIVER'S RIDE
// ============================================================

const getRideRequests = async ({
    id_ride,
    id_driver_posted
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", sql.Int, id_ride)
        .input("id_driver_posted", sql.Int, id_driver_posted)
        .query(`
            SELECT
                rr.*,
                u.name_u AS passenger_name,
                u.phone_u AS passenger_phone,
                a1.libelle AS pickup_address,
                a2.libelle AS dropoff_address
            FROM RIDE_REQUEST rr
            INNER JOIN RIDE r
                ON r.id_ride = rr.id_ride
            INNER JOIN [USER] u
                ON u.id_user = rr.id_user
            LEFT JOIN ADRESSE a1
                ON a1.id_adresse = rr.id_adresse_pickup
            LEFT JOIN ADRESSE a2
                ON a2.id_adresse = rr.id_adresse_dropoff
            WHERE rr.id_ride = @id_ride
              AND r.id_driver_posted = @id_driver_posted
            ORDER BY rr.creation_date_req DESC
        `);

    return result.recordset;
};


// ============================================================
// GET OPEN RIDE REQUESTS
// ============================================================

const getOpenRideRequests = async () => {

    const pool = getPool();

    const result = await pool
        .request()
        .query(`
            SELECT
                rr.*,
                u.name_u AS passenger_name,
                u.phone_u AS passenger_phone,
                a1.libelle AS pickup_address,
                a2.libelle AS dropoff_address
            FROM RIDE_REQUEST rr
            INNER JOIN [USER] u
                ON u.id_user = rr.id_user
            LEFT JOIN ADRESSE a1
                ON a1.id_adresse = rr.id_adresse_pickup
            LEFT JOIN ADRESSE a2
                ON a2.id_adresse = rr.id_adresse_dropoff
            WHERE rr.id_ride IS NULL
              AND rr.status_request = 'pending'
            ORDER BY rr.creation_date_req DESC
        `);

    return result.recordset;
};


// ============================================================
// DRIVER ACCEPTS OPEN RIDE REQUEST
// ============================================================

const acceptOpenRideRequest = async ({
    id_ride_request,
    id_driver
}) => {

    const pool = getPool();

    const transaction = new sql.Transaction(pool);

    try {

        await transaction.begin();

        // ----------------------------------------------------
        // Lock the open request
        // ----------------------------------------------------

        const requestResult = await new sql.Request(transaction)
            .input("id_ride_request", sql.Int, id_ride_request)
            .query(`
                SELECT
                    *
                FROM RIDE_REQUEST WITH (UPDLOCK, HOLDLOCK)
                WHERE id_ride_request = @id_ride_request
            `);

        if (requestResult.recordset.length === 0) {
            throw new Error("Ride request not found");
        }

        const request = requestResult.recordset[0];

        // ----------------------------------------------------
        // Request must still be pending
        // ----------------------------------------------------

        if (request.status_request !== "pending") {
            throw new Error("Ride request is no longer pending");
        }

        // ----------------------------------------------------
        // It must still be an open request
        // ----------------------------------------------------

        if (request.id_ride !== null) {
            throw new Error("Ride request is already linked to a ride");
        }

        // ----------------------------------------------------
        // Passenger cannot become their own driver
        // ----------------------------------------------------

        if (Number(request.id_user) === Number(id_driver)) {
            throw new Error("Passenger cannot accept their own request");
        }

        // ----------------------------------------------------
        // Validate addresses
        // ----------------------------------------------------

        if (!request.id_adresse_pickup || !request.id_adresse_dropoff) {
            throw new Error("Ride request addresses are required");
        }

        // ----------------------------------------------------
        // Find driver's vehicle
        // ----------------------------------------------------

        const vehicleResult = await new sql.Request(transaction)
            .input("id_driver", sql.Int, id_driver)
            .query(`
                SELECT TOP 1
                    v.id_vehicile
                FROM VEHICLE v
                INNER JOIN DRIVER_PROFILE dp
                    ON v.id_profile = dp.id_profile
                WHERE dp.id_driver = @id_driver
                  AND v.verification_status = 'approved'
                ORDER BY v.id_vehicile;
            `);

        if (vehicleResult.recordset.length === 0) {
            throw new Error("Driver does not have an approved vehicle");
        }

        const id_vehicile = vehicleResult.recordset[0].id_vehicile;

        // ----------------------------------------------------
        // Check driver's minimum balance
        // ----------------------------------------------------

        await checkMinimumBalance(id_driver, transaction);

        // ----------------------------------------------------
        // Calculate actual distance
        // ----------------------------------------------------

        const distance = await getDistanceBetweenAddresses({
            id_adresse_start: request.id_adresse_pickup,
            id_adresse_arrive: request.id_adresse_dropoff,
            transaction
        });

        // ----------------------------------------------------
        // Revalidate requested price against current tariff
        // ----------------------------------------------------

        const priceValidation = await validateRidePrice({
            distance,
            price: request.desired_price
        });

        const lockedPrice = priceValidation.price;

        // ----------------------------------------------------
        // Create the ride
        // ----------------------------------------------------

                const rideResult = await new sql.Request(transaction)
            .input("id_driver_posted", sql.Int, id_driver)
            .input("id_vehicile", sql.Int, id_vehicile)
            .input("id_adresse_start", sql.Int, request.id_adresse_pickup)
            .input("id_adresse_arrive", sql.Int, request.id_adresse_dropoff)
            .input("departure_time", sql.DateTime2, request.desired_time)
            .input("distance", sql.Decimal(10, 2), distance)
            .input("prix_total", sql.Decimal(10, 2), lockedPrice)
            .input("empty_seats", sql.Int, Number(request.seats_needed))
            .query(`
                DECLARE @InsertedRide TABLE (
                    id_ride INT,
                    prix_total DECIMAL(10,2),
                    distance DECIMAL(10,2),
                    empty_seats INT,
                    departure_time DATETIME2,
                    status_ride NVARCHAR(20),
                    commission DECIMAL(10,2),
                    creation_date_ride DATETIME2,
                    id_driver_posted INT,
                    id_vehicile INT,
                    id_adresse_start INT,
                    id_adresse_arrive INT,
                    is_available BIT
                );

                INSERT INTO RIDE (
                    id_driver_posted,
                    id_vehicile,
                    id_adresse_start,
                    id_adresse_arrive,
                    departure_time,
                    distance,
                    prix_total,
                    empty_seats,
                    status_ride,
                    is_available
                )
                OUTPUT
                    INSERTED.id_ride,
                    INSERTED.prix_total,
                    INSERTED.distance,
                    INSERTED.empty_seats,
                    INSERTED.departure_time,
                    INSERTED.status_ride,
                    INSERTED.commission,
                    INSERTED.creation_date_ride,
                    INSERTED.id_driver_posted,
                    INSERTED.id_vehicile,
                    INSERTED.id_adresse_start,
                    INSERTED.id_adresse_arrive,
                    INSERTED.is_available
                INTO @InsertedRide
                VALUES (
                    @id_driver_posted,
                    @id_vehicile,
                    @id_adresse_start,
                    @id_adresse_arrive,
                    @departure_time,
                    @distance,
                    @prix_total,
                    @empty_seats,
                    'active',
                    1
                );

                SELECT * FROM @InsertedRide;
            `);

        const newRide = rideResult.recordset[0];

        // ----------------------------------------------------
        // Link the request to the newly created ride
        // ----------------------------------------------------

        const updateRequestResult = await new sql.Request(transaction)
            .input("id_ride_request", sql.Int, id_ride_request)
            .input("id_ride", sql.Int, newRide.id_ride)
            .input("locked_price", sql.Decimal(10, 2), lockedPrice)
            .query(`
                UPDATE RIDE_REQUEST
                SET
                    id_ride = @id_ride,
                    desired_price = @locked_price
                OUTPUT INSERTED.*
                WHERE id_ride_request = @id_ride_request
            `);

        await transaction.commit();

        return {
            ride: newRide,
            rideRequest: updateRequestResult.recordset[0]
        };

    } catch (error) {

        if (transaction._aborted !== true) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        throw error;
    }
};


// ============================================================
// REQUEST TO JOIN EXISTING RIDE
// ============================================================

const requestToJoinRide = async ({
    id_user,
    id_ride,
    seats_needed,
    desired_time,
    id_adresse_pickup,
    id_adresse_dropoff
}) => {

    const pool = getPool();

    const rideResult = await pool
        .request()
        .input("id_ride", sql.Int, id_ride)
        .query(`
            SELECT
                prix_total
            FROM RIDE
            WHERE id_ride = @id_ride
        `);

    if (rideResult.recordset.length === 0) {
        throw new Error("Ride not found");
    }

    const ride = rideResult.recordset[0];

    return createRideRequest({
        id_user,
        id_ride,
        seats_needed,
        desired_time,
        desired_price: ride.prix_total,
        id_adresse_pickup,
        id_adresse_dropoff
    });
};


// ============================================================
// APPROVE RIDE REQUEST
// ============================================================

const approveRideRequest = async ({
    id_ride_request,
    id_driver
}) => {

    const pool = getPool();

    const transaction = new sql.Transaction(pool);

    try {

        await transaction.begin();

        // ----------------------------------------------------
        // Lock request
        // ----------------------------------------------------

        const requestResult = await new sql.Request(transaction)
            .input("id_ride_request", sql.Int, id_ride_request)
            .query(`
                SELECT *
                FROM RIDE_REQUEST WITH (UPDLOCK, HOLDLOCK)
                WHERE id_ride_request = @id_ride_request
            `);

        if (requestResult.recordset.length === 0) {
            throw new Error("Ride request not found");
        }

        const request = requestResult.recordset[0];

        if (request.status_request !== "pending") {
            throw new Error("Ride request is no longer pending");
        }

        if (!request.id_ride) {
            throw new Error("Ride request is not linked to a ride");
        }

        // ----------------------------------------------------
        // Lock ride
        // ----------------------------------------------------

        const rideResult = await new sql.Request(transaction)
            .input("id_ride", sql.Int, request.id_ride)
            .query(`
                SELECT *
                FROM RIDE WITH (UPDLOCK, HOLDLOCK)
                WHERE id_ride = @id_ride
            `);

        if (rideResult.recordset.length === 0) {
            throw new Error("Ride not found");
        }

        const ride = rideResult.recordset[0];

        // ----------------------------------------------------
        // Verify driver ownership
        // ----------------------------------------------------

        if (Number(ride.id_driver_posted) !== Number(id_driver)) {
            throw new Error("You are not the driver of this ride");
        }

        if (ride.status_ride !== "active") {
            throw new Error("Ride is not active");
        }

        if (Number(ride.is_available) !== 1) {
            throw new Error("Ride is not available");
        }

        if (Number(ride.empty_seats) < Number(request.seats_needed)) {
            throw new Error("Not enough available seats");
        }

        // ----------------------------------------------------
        // Check driver's minimum balance
        // ----------------------------------------------------

        await checkMinimumBalance(id_driver, transaction);

        // ----------------------------------------------------
        // Price is locked from the ride
        // ----------------------------------------------------

        const lockedPrice = Number(ride.prix_total);

        if (!Number.isFinite(lockedPrice) || lockedPrice <= 0) {
            throw new Error("Ride has an invalid price");
        }

        // ----------------------------------------------------
        // Approve request
        // ----------------------------------------------------

        const updateRequestResult = await new sql.Request(transaction)
            .input("id_ride_request", sql.Int, id_ride_request)
            .input("locked_price", sql.Decimal(10, 2), lockedPrice)
            .query(`
                UPDATE RIDE_REQUEST
                SET
                    status_request = 'approved',
                    desired_price = @locked_price
                OUTPUT INSERTED.*
                WHERE id_ride_request = @id_ride_request
            `);

        // ----------------------------------------------------
        // Decrease available seats
        // ----------------------------------------------------

        const newEmptySeats =
            Number(ride.empty_seats) - Number(request.seats_needed);

        await new sql.Request(transaction)
            .input("id_ride", sql.Int, request.id_ride)
            .input("empty_seats", sql.Int, newEmptySeats)
            .query(`
                UPDATE RIDE
                SET
                    empty_seats = @empty_seats,
                    is_available =
                        CASE
                            WHEN @empty_seats <= 0 THEN 0
                            ELSE 1
                        END
                WHERE id_ride = @id_ride
            `);

        await transaction.commit();

        return {
            rideRequest: updateRequestResult.recordset[0],
            ride: {
                ...ride,
                empty_seats: newEmptySeats,
                is_available: newEmptySeats > 0 ? 1 : 0
            }
        };

    } catch (error) {

        if (transaction._aborted !== true) {
            try {
                await transaction.rollback();
            } catch (_) {}
        }

        throw error;
    }
};


// ============================================================
// REJECT RIDE REQUEST
// ============================================================

const rejectRideRequest = async ({
    id_ride_request,
    id_driver
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride_request", sql.Int, id_ride_request)
        .input("id_driver", sql.Int, id_driver)
        .query(`
            UPDATE rr
            SET status_request = 'rejected'
            OUTPUT INSERTED.*
            FROM RIDE_REQUEST rr
            INNER JOIN RIDE r
                ON r.id_ride = rr.id_ride
            WHERE rr.id_ride_request = @id_ride_request
              AND r.id_driver_posted = @id_driver
              AND rr.status_request = 'pending'
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride request not found, already processed, or you are not the driver"
        );
    }

    return result.recordset[0];
};


// ============================================================
// CANCEL RIDE REQUEST
// ============================================================

const cancelRideRequest = async ({
    id_ride_request,
    id_user
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride_request", sql.Int, id_ride_request)
        .input("id_user", sql.Int, id_user)
        .query(`
            UPDATE RIDE_REQUEST
            SET status_request = 'cancelled'
            OUTPUT INSERTED.*
            WHERE id_ride_request = @id_ride_request
              AND id_user = @id_user
              AND status_request = 'pending'
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride request not found, already processed, or you are not the owner"
        );
    }

    return result.recordset[0];
};


// ============================================================
// UPDATE PAYMENT METHOD
// ============================================================

const updatePaymentMethod = async ({
    id_ride_request,
    id_user,
    payment_method
}) => {

    const allowedMethods = [
        "cash",
        "wallet",
        "baridimob"
    ];

    if (!allowedMethods.includes(payment_method)) {
        throw new Error(
            "Invalid payment method. Allowed: cash, wallet, baridimob"
        );
    }

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride_request", sql.Int, id_ride_request)
        .input("id_user", sql.Int, id_user)
        .input("payment_method", sql.NVarChar(20), payment_method)
        .query(`
            UPDATE RIDE_REQUEST
            SET payment_method = @payment_method
            OUTPUT INSERTED.*
            WHERE id_ride_request = @id_ride_request
              AND id_user = @id_user
              AND payment_status = 'pending'
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride request not found, already paid, or you are not the owner"
        );
    }

    return result.recordset[0];
};


// ============================================================
// GET ACTIVE RIDES FOR PASSENGER
// ============================================================

const getActiveRides = async (id_user) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_user", sql.Int, id_user)
        .query(`
            SELECT
                r.*,
                u.name_u AS driver_name,
                u.phone_u AS driver_phone,
                a1.libelle AS start_address,
                a2.libelle AS arrive_address
            FROM RIDE_REQUEST rr
            INNER JOIN RIDE r
                ON r.id_ride = rr.id_ride
            INNER JOIN [USER] u
                ON u.id_user = r.id_driver_posted
            LEFT JOIN ADRESSE a1
                ON a1.id_adresse = r.id_adresse_start
            LEFT JOIN ADRESSE a2
                ON a2.id_adresse = r.id_adresse_arrive
            WHERE rr.id_user = @id_user
              AND rr.status_request = 'approved'
              AND r.status_ride IN ('active', 'in_progress')
            ORDER BY r.departure_time ASC
        `);

    return result.recordset;
};

const payRideRequest = async ({ id_ride_request, id_user }) => {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Lock the ride request
        const requestResult = await transaction.request()
            .input("id_ride_request", sql.Int, id_ride_request)
            .query(`
                SELECT
                    rr.id_ride_request,
                    rr.id_user,
                    rr.id_ride,
                    rr.status_request,
                    rr.payment_status,
                    r.status_ride
                FROM RIDE_REQUEST rr
                INNER JOIN RIDE r
                    ON rr.id_ride = r.id_ride
                WHERE rr.id_ride_request = @id_ride_request
                WITH (UPDLOCK, HOLDLOCK)
            `);

        if (requestResult.recordset.length === 0) {
            throw new Error("Ride request not found");
        }

        const request = requestResult.recordset[0];

        // Make sure this request belongs to the passenger
        if (request.id_user !== id_user) {
            throw new Error("You are not authorized to pay this ride request");
        }

        // Only approved requests can be paid
        if (request.status_request !== "approved") {
            throw new Error("Only an approved ride request can be paid");
        }

        // Payment cannot be made twice
        if (request.payment_status === "paid") {
            throw new Error("Ride request has already been paid");
        }

        // Payment is allowed while the ride is in progress or completed
        if (
            request.status_ride !== "in_progress" &&
            request.status_ride !== "completed"
        ) {
            throw new Error(
                "Payment is only allowed when the ride is in progress or completed"
            );
        }

        // Mark payment as completed
        const updateResult = await transaction.request()
            .input("id_ride_request", sql.Int, id_ride_request)
            .query(`
                UPDATE RIDE_REQUEST
                SET payment_status = 'paid'
                WHERE id_ride_request = @id_ride_request
                  AND payment_status = 'pending'
            `);

        if (updateResult.rowsAffected[0] !== 1) {
            throw new Error("Payment could not be completed");
        }

        await transaction.commit();

        return {
            success: true,
            message: "Payment marked as paid successfully",
            id_ride_request
        };

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (_) {}

        throw error;
    }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getDistanceBetweenAddresses,
    createRideRequest,
    createOpenRideRequest,
    getRideRequests,
    getOpenRideRequests,
    acceptOpenRideRequest,
    requestToJoinRide,
    approveRideRequest,
    rejectRideRequest,
    cancelRideRequest,
    updatePaymentMethod,
    getActiveRides,
    payRideRequest
};
