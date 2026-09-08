const { sql , getPool } = require("../config/db");
const { checkMinimumBalance } = require("./walletService");

const createRide = async ({
    id_driver_posted,
    id_vehicile,
    id_adresse_start,
    id_adresse_arrive,
    departure_time,
    distance,
    prix_total,
    empty_seats
}) => {
    const pool = getPool();

    // Driver must have the minimum balance required to post a ride
    await checkMinimumBalance(id_driver_posted);

    // Convert numeric values
    const rideDistance = Number(distance);
    const ridePrice = Number(prix_total);

    // Validate distance
    if (!Number.isFinite(rideDistance) || rideDistance <= 0) {
        throw new Error("Distance must be a valid positive number");
    }

    // Validate price
    if (!Number.isFinite(ridePrice) || ridePrice < 0) {
        throw new Error("prix_total must be a valid positive number");
    }

    /*
        Get the current tariff configuration.

        We use the latest configuration because the allowed
        price range can change when the admin changes tariffs.
    */
    const tariffResult = await pool
        .request()
        .query(`
            SELECT TOP 1
                suggested_price_perKM,
                min_price_perKM,
                max_price_perKM,
                commision_percentage,
                min_balance_toride
            FROM TARIF_CONFIGURATION
            ORDER BY updated_at DESC
        `);

    if (tariffResult.recordset.length === 0) {
        throw new Error("Tarif configuration not found");
    }

    const tariff = tariffResult.recordset[0];

    const minPricePerKM = Number(tariff.min_price_perKM);
    const maxPricePerKM = Number(tariff.max_price_perKM);

    if (
        !Number.isFinite(minPricePerKM) ||
        !Number.isFinite(maxPricePerKM)
    ) {
        throw new Error("Invalid tariff configuration");
    }

    // Calculate allowed total-price range for this ride
    const minimumPrice = minPricePerKM * rideDistance;
    const maximumPrice = maxPricePerKM * rideDistance;

    // Validate driver's chosen price
    if (
        ridePrice < minimumPrice ||
        ridePrice > maximumPrice
    ) {
        throw new Error(
            `prix_total must be between ${minimumPrice.toFixed(2)} DA and ${maximumPrice.toFixed(2)} DA`
        );
    }

    // Create the ride
    const result = await pool
        .request()
        .input("id_driver_posted", id_driver_posted)
        .input("id_vehicile", id_vehicile)
        .input("id_adresse_start", id_adresse_start)
        .input("id_adresse_arrive", id_adresse_arrive)
        .input("departure_time", departure_time)
        .input("distance", rideDistance)
        .input("prix_total", ridePrice)
        .input("empty_seats", empty_seats)
        .query(`
            INSERT INTO RIDE
            (
                prix_total,
                distance,
                empty_seats,
                departure_time,
                id_driver_posted,
                id_vehicile,
                id_adresse_start,
                id_adresse_arrive
            )
            OUTPUT INSERTED.*
            VALUES
            (
                @prix_total,
                @distance,
                @empty_seats,
                @departure_time,
                @id_driver_posted,
                @id_vehicile,
                @id_adresse_start,
                @id_adresse_arrive
            )
        `);

    return result.recordset[0];
};

const getAvailableRides = async () => {

    const pool = getPool();

    const result = await pool
        .request()
        .query(`
            SELECT
                r.id_ride,
                r.prix_total,
                r.distance,
                r.empty_seats,
                r.departure_time,
                r.status_ride,
                r.commission,
                r.creation_date_ride,
                r.id_driver_posted,
                r.id_vehicile,
                r.id_adresse_start,
                r.id_adresse_arrive,

                u.name_u AS driver_name,

                a1.latitude AS start_latitude,
                a1.longitude AS start_longitude,
                a1.libelle AS start_label,

                a2.latitude AS arrive_latitude,
                a2.longitude AS arrive_longitude,
                a2.libelle AS arrive_label

            FROM RIDE r

            INNER JOIN [USER] u
                ON r.id_driver_posted = u.id_user

            INNER JOIN ADRESSE a1
                ON r.id_adresse_start = a1.id_adresse

            INNER JOIN ADRESSE a2
                ON r.id_adresse_arrive = a2.id_adresse

            WHERE r.status_ride = 'active'
              AND r.departure_time >= SYSDATETIME()

            ORDER BY r.departure_time ASC
        `);

    return result.recordset;
};

const getRideById = async (id_ride) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .query(`
            SELECT
                r.id_ride,
                r.prix_total,
                r.distance,
                r.empty_seats,
                r.departure_time,
                r.status_ride,
                r.commission,
                r.creation_date_ride,
                r.id_driver_posted,
                r.id_vehicile,
                r.id_adresse_start,
                r.id_adresse_arrive,

                u.name_u AS driver_name,
                u.phone_u AS driver_phone,

                a1.latitude AS start_latitude,
                a1.longitude AS start_longitude,
                a1.libelle AS start_label,

                a2.latitude AS arrive_latitude,
                a2.longitude AS arrive_longitude,
                a2.libelle AS arrive_label

            FROM RIDE r

            INNER JOIN [USER] u
                ON r.id_driver_posted = u.id_user

            INNER JOIN ADRESSE a1
                ON r.id_adresse_start = a1.id_adresse

            INNER JOIN ADRESSE a2
                ON r.id_adresse_arrive = a2.id_adresse

            WHERE r.id_ride = @id_ride
        `);

    return result.recordset[0];
};

const updateRide = async ({
    id_ride,
    id_driver_posted,
    id_vehicile,
    id_adresse_start,
    id_adresse_arrive,
    departure_time,
    distance,
    empty_seats
}) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver_posted", id_driver_posted)
        .input("id_vehicile", id_vehicile)
        .input("id_adresse_start", id_adresse_start)
        .input("id_adresse_arrive", id_adresse_arrive)
        .input("departure_time", departure_time)
        .input("distance", distance)
        .input("empty_seats", empty_seats)
        .query(`
            UPDATE RIDE
            SET
                id_vehicile = @id_vehicile,
                id_adresse_start = @id_adresse_start,
                id_adresse_arrive = @id_adresse_arrive,
                departure_time = @departure_time,
                distance = @distance,
                empty_seats = @empty_seats
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver_posted;

            SELECT *
            FROM RIDE
            WHERE id_ride = @id_ride;
        `);

    return result.recordset[0];
};

const cancelRide = async ({ id_ride, id_driver }) => {

    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {

        await transaction.begin();

        // 1. Verify that the ride belongs to this driver
        //    and can still be cancelled.
        const rideResult = await new sql.Request(transaction)
            .input("id_ride", id_ride)
            .input("id_driver", id_driver)
            .query(`
                SELECT
                    id_ride,
                    id_driver_posted,
                    status_ride
                FROM RIDE
                WHERE id_ride = @id_ride
                  AND id_driver_posted = @id_driver
            `);

        if (rideResult.recordset.length === 0) {
            throw new Error(
                "Ride not found or you are not the driver who posted it"
            );
        }

        const ride = rideResult.recordset[0];

        // 2. Only active rides can be cancelled.
        if (ride.status_ride !== "active") {
            throw new Error(
                "Only active rides can be cancelled"
            );
        }

        // 3. Cancel the ride.
        await new sql.Request(transaction)
            .input("id_ride", id_ride)
            .query(`
                UPDATE RIDE
                SET
                    status_ride = 'cancelled',
                    is_available = 0
                WHERE id_ride = @id_ride
                 and status_ride = 'active'
            `);

        // 4. Cancel passenger requests that were already approved.
        await new sql.Request(transaction)
            .input("id_ride", id_ride)
            .query(`
                UPDATE RIDE_REQUEST
                SET status_request = 'cancelled'
                WHERE id_ride = @id_ride
                  AND status_request IN ('approved', 'pending')
            `);

        // 5. Get the final ride state.
        const result = await new sql.Request(transaction)
            .input("id_ride", id_ride)
            .query(`
                SELECT *
                FROM RIDE
                WHERE id_ride = @id_ride
            `);

        await transaction.commit();

        return result.recordset[0];

    } catch (error) {

        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError
            );
        }

        throw error;
    }
};

const updateRideAvailability = async ({
    id_ride,
    id_driver,
    is_available
}) => {

    const pool = getPool();

    // Validate availability value
    if (is_available !== 0 && is_available !== 1) {
        throw new Error(
            "is_available must be 0 or 1"
        );
    }

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver", id_driver)
        .input("is_available", is_available)
        .query(`
            UPDATE RIDE
            SET is_available = @is_available
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver
              AND status_ride = 'active'
              AND (
                    @is_available = 0
                    OR empty_seats > 0
                  );

            SELECT *
            FROM RIDE
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride not found or you are not the driver who posted it"
        );
    }

    const ride = result.recordset[0];

    // If the ride is active but the requested availability
    // could not be applied, the ride state was not changed.
    if (
        ride.status_ride !== "active" ||
        (is_available === 1 && ride.empty_seats <= 0)
    ) {
        throw new Error(
            "Ride cannot be made available"
        );
    }

    return ride;
};

const startRide = async ({ id_ride, id_driver }) => {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id_ride", id_ride)
        .input("id_driver", id_driver)
        .query(`
            UPDATE RIDE
            SET status_ride = 'in_progress'
            WHERE id_ride = @id_ride
              AND id_driver_posted = @id_driver
              AND status_ride = 'active'
              AND is_available = 0;

            SELECT *
            FROM RIDE
            WHERE id_ride = @id_ride;
        `);

    if (result.recordset.length === 0) {
        throw new Error(
            "Ride not found or ride cannot be started"
        );
    }

    return result.recordset[0];
};

const updateRideLocation = async ({
    id_ride,
    latitude,
    longitude
}) => {
    const pool = getPool();

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        throw new Error("Invalid GPS coordinates");
    }

    // Get ride destination and current status
    const rideResult = await pool
        .request()
        .input("id_ride", sql.Int, id_ride)
        .query(`
            SELECT
                id_ride,
                id_driver_posted,
                status_ride,
                id_adresse_arrive
            FROM RIDE
            WHERE id_ride = @id_ride
        `);

    if (rideResult.recordset.length === 0) {
        throw new Error("Ride not found");
    }

    const ride = rideResult.recordset[0];

    if (ride.status_ride !== "in_progress") {
        throw new Error("Ride is not in progress");
    }

    // Get destination coordinates
    const destinationResult = await pool
        .request()
        .input("id_adresse_arrive", sql.Int, ride.id_adresse_arrive)
        .query(`
            SELECT
                latitude,
                longitude
            FROM ADRESSE
            WHERE id_adresse = @id_adresse_arrive
        `);

    if (destinationResult.recordset.length === 0) {
        throw new Error("Destination address not found");
    }

    const destination = destinationResult.recordset[0];

    const destinationLat = Number(destination.latitude);
    const destinationLon = Number(destination.longitude);

    // Haversine formula
    const earthRadius = 6371000;

    const toRadians = (degrees) =>
        degrees * (Math.PI / 180);

    const dLat = toRadians(destinationLat - lat);
    const dLon = toRadians(destinationLon - lon);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat)) *
        Math.cos(toRadians(destinationLat)) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    const distanceToDestination = earthRadius * c;

    // Driver is considered to have reached destination
    // when within 100 meters.
    if (distanceToDestination > 100) {
        return {
            completed: false,
            distanceToDestination
        };
    }

    // --------------------------------------------------
    // Completion transaction
    // --------------------------------------------------

    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Lock the ride so two simultaneous requests
        // cannot complete and charge it twice.
        const lockedRideResult = await new sql.Request(transaction)
            .input("id_ride", sql.Int, id_ride)
            .query(`
                SELECT
                    id_ride,
                    id_driver_posted,
                    prix_total,
                    status_ride
                FROM RIDE WITH (UPDLOCK, HOLDLOCK)
                WHERE id_ride = @id_ride
            `);

        if (lockedRideResult.recordset.length === 0) {
            throw new Error("Ride not found");
        }

        const lockedRide = lockedRideResult.recordset[0];

        // Another request may have completed the ride
        // while this request was running.
        if (lockedRide.status_ride === "completed") {
            await transaction.rollback();

            return {
                completed: true,
                alreadyCompleted: true
            };
        }

        if (lockedRide.status_ride !== "in_progress") {
            throw new Error("Ride is no longer in progress");
        }

        // --------------------------------------------------
        // Count approved passengers
        // --------------------------------------------------

        const passengersResult = await new sql.Request(transaction)
            .input("id_ride", sql.Int, id_ride)
            .query(`
                SELECT COUNT(*) AS number_of_passengers
                FROM RIDE_REQUEST WITH (UPDLOCK, HOLDLOCK)
                WHERE id_ride = @id_ride
                  AND status = 'approved'
            `);

        const numberOfPassengers = Number(
            passengersResult.recordset[0].number_of_passengers
        );

        if (numberOfPassengers <= 0) {
            throw new Error(
                "Cannot complete a ride with no approved passengers"
            );
        }

        // --------------------------------------------------
        // Get current commission percentage
        // --------------------------------------------------

        const tariffResult = await new sql.Request(transaction)
            .query(`
                SELECT TOP 1
                    commision_percentage
                FROM TARIF_CONFIGURATION
                ORDER BY updated_at DESC
            `);

        if (tariffResult.recordset.length === 0) {
            throw new Error("Tarif configuration not found");
        }

        const commissionPercentage = Number(
            tariffResult.recordset[0].commision_percentage
        );

        if (
            !Number.isFinite(commissionPercentage) ||
            commissionPercentage < 0
        ) {
            throw new Error("Invalid commission configuration");
        }

        // --------------------------------------------------
        // Calculate commission
        // --------------------------------------------------

        const ridePrice = Number(lockedRide.prix_total);

        const commission =
            (ridePrice * commissionPercentage / 100) *
            numberOfPassengers;

        // --------------------------------------------------
        // Lock driver's wallet
        // --------------------------------------------------

        const walletResult = await new sql.Request(transaction)
            .input(
                "id_driver_posted",
                sql.Int,
                lockedRide.id_driver_posted
            )
            .query(`
                SELECT
                    id_wallet,
                    balance
                FROM WALLET WITH (UPDLOCK, HOLDLOCK)
                WHERE id_user = @id_driver_posted
            `);

        if (walletResult.recordset.length === 0) {
            throw new Error("Driver wallet not found");
        }

        const wallet = walletResult.recordset[0];

        const currentBalance = Number(wallet.balance);

        if (currentBalance < commission) {
            throw new Error(
                `Insufficient driver wallet balance for commission. Required: ${commission.toFixed(2)} DA`
            );
        }

        // --------------------------------------------------
        // Calculate balance after commission
        // --------------------------------------------------
        
        const balanceAfter = currentBalance - commission;
        
        // --------------------------------------------------
        // Deduct commission
        // --------------------------------------------------
        
        await new sql.Request(transaction)
            .input("id_wallet", sql.Int, wallet.id_wallet)
            .input("commission", sql.Decimal(10, 2), commission)
            .query(`
                UPDATE WALLET
                SET balance = balance - @commission
                WHERE id_wallet = @id_wallet
            `);
        
        // --------------------------------------------------
        // Record commission transaction
        // --------------------------------------------------
        
        await new sql.Request(transaction)
            .input("id_wallet", sql.Int, wallet.id_wallet)
            .input("amount", sql.Decimal(10, 2), commission)
            .input("balance_after", sql.Decimal(10, 2), balanceAfter)
            .input("id_ride", sql.Int, id_ride)
            .query(`
                INSERT INTO WALLET_TRANSACTION
                (
                    id_wallet,
                    amount,
                    balance_after,
                    type,
                    transaction_reason,
                    id_ride
                )
                VALUES
                (
                    @id_wallet,
                    @amount,
                    @balance_after,
                    'debit',
                    'commission',
                    @id_ride
                )
            `);
        
        // --------------------------------------------------
        // Complete ride
        // --------------------------------------------------

        await new sql.Request(transaction)
            .input("id_ride", sql.Int, id_ride)
            .input("commission", sql.Decimal(10, 2), commission)
            .query(`
                UPDATE RIDE
                SET
                    commission = @commission,
                    status_ride = 'completed',
                    is_available = 0
                WHERE id_ride = @id_ride
                  AND status_ride = 'in_progress'
            `);

        await transaction.commit();

        return {
            completed: true,
            alreadyCompleted: false,
            numberOfPassengers,
            ridePrice,
            commission,
            distanceToDestination
        };

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            // Ignore rollback errors
        }

        throw error;
    }
};

module.exports = {
    createRide,
    getAvailableRides,
    getRideById,
    updateRide,
    cancelRide,
    updateRideAvailability,
    startRide,
    updateRideLocation
};